import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/db';
import Page from '@/models/Page';
import OcrConflict from '@/models/OcrConflict';
import { hasBookLibraryAccess } from '@/lib/roles';
import { CONFLICT_STATUSES, PENDING_CONFLICT_STATUSES, parsePaging, serializeConflict } from '@/lib/ocr/ocrConflictView';
import { settleStaleConflictApplies } from '@/lib/ocr/ocrConflictResolve';
import { badRequest, requireAccess, serverError } from '@/lib/apiResponse';

// GET /api/admin/books/ocr/conflicts?jobId=...|bookId=...[&status=open][&limit=50][&offset=0]
// התנגשויות בהחלת תוצאת OCR מקומי (עמוד שנערך אחרי יצירת העבודה ולכן לא נדרס), ממוינות לפי
// מספר עמוד, כל אחת עם טקסט ה-OCR ועם הטקסט הנוכחי של העמוד ו-updatedAt שלו (לאימוץ מותנה).
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requireAccess(session, hasBookLibraryAccess);
    if (denied) return denied;

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const bookId = searchParams.get('bookId');
    const status = searchParams.get('status');
    if (!jobId && !bookId) return badRequest('חסר מזהה עבודה או ספר');
    if (jobId && !mongoose.isValidObjectId(jobId)) return badRequest('מזהה עבודה לא תקין');
    if (bookId && !mongoose.isValidObjectId(bookId)) return badRequest('מזהה ספר לא תקין');
    if (status && !CONFLICT_STATUSES.includes(status)) return badRequest('סינון מצב לא תקין');
    const { limit, offset } = parsePaging(searchParams);

    await connectDB();

    const scope = jobId ? { job: jobId } : { book: bookId };
    // אימוץ שנקטע בקריסה (applying שה-lease שלו פג) — מוכרע לפי העמוד לפני ההצגה והספירה
    await settleStaleConflictApplies(scope);
    const filter = status ? { ...scope, status } : { ...scope };

    const [total, openCount, conflicts] = await Promise.all([
      OcrConflict.countDocuments(filter),
      OcrConflict.countDocuments({ ...filter, status: { $in: PENDING_CONFLICT_STATUSES } }),
      OcrConflict.find(filter).sort({ pageNumber: 1, _id: 1 }).skip(offset).limit(limit).lean(),
    ]);

    const pageIds = conflicts.map((c) => c.page);
    const pages = pageIds.length
      ? await Page.find({ _id: { $in: pageIds } })
        .select('_id content rightColumn leftColumn isTwoColumns updatedAt')
        .lean()
      : [];
    const byId = new Map(pages.map((p) => [String(p._id), p]));

    return NextResponse.json(
      {
        success: true,
        total,
        openCount,
        hasMore: offset + conflicts.length < total,
        conflicts: conflicts.map((c) => serializeConflict(c, byId.get(String(c.page)) ?? null)),
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('OCR conflicts list error:', error);
    return serverError('Internal Server Error');
  }
}
