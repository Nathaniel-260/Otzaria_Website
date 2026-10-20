import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/db';
import Page from '@/models/Page';
import OcrConflict from '@/models/OcrConflict';
import { hasBookLibraryAccess } from '@/lib/roles';
import { pageApplySet } from '@/lib/ocr/localApply.pure';
import { CONFLICT_ACTIONS, parseClientDate, serializeConflict } from '@/lib/ocr/ocrConflictView';
import { badRequest, notFound, requireAccess, serverError } from '@/lib/apiResponse';

const PAGE_FIELDS = '_id content rightColumn leftColumn isTwoColumns updatedAt';

const conflictResponse = (error, code, status = 409) =>
  NextResponse.json({ error, code }, { status });

// POST /api/admin/books/ocr/conflicts/:id  { action: 'apply' | 'dismiss', expectedPageUpdatedAt? }
// - dismiss: הטקסט הקיים בעמוד נשאר; ההתנגשות מסומנת dismissed.
// - apply: אימוץ טקסט ה-OCR — רק בהחלטה מפורשת של מנהל, ומותנה ב-updatedAt של העמוד כפי שהמנהל
//   ראה אותו (expectedPageUpdatedAt). אם העמוד נערך שוב בינתיים — 409, ושום דבר לא נדרס.
//   סדר: קודם העמוד (עדכון מותנה), אחר כך ההתנגשות (מותנה ב-status:'open'). קריסה ביניהם
//   משאירה התנגשות פתוחה שהטקסט שלה כבר בעמוד — אימוץ חוזר או דחייה מסדרים אותה.
export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requireAccess(session, hasBookLibraryAccess);
    if (denied) return denied;

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return badRequest('מזהה התנגשות לא תקין');

    const body = (await request.json().catch(() => null)) || {};
    const { action } = body;
    if (!CONFLICT_ACTIONS.includes(action)) return badRequest('פעולה לא חוקית');
    const expected = action === 'apply' ? parseClientDate(body.expectedPageUpdatedAt) : null;
    if (action === 'apply' && !expected) return badRequest('חסר מועד העדכון של העמוד');

    await connectDB();

    const conflict = await OcrConflict.findById(id).lean();
    if (!conflict) return notFound('ההתנגשות לא נמצאה');
    if (conflict.status !== 'open') {
      return conflictResponse('ההתנגשות כבר טופלה — רעננו', 'already_resolved');
    }

    const now = new Date();
    const byName = session.user?.name || '';

    if (action === 'apply') {
      const res = await Page.updateOne(
        { _id: conflict.page, book: conflict.book, updatedAt: expected },
        { $set: pageApplySet(conflict.ocrText || '', conflict.job, conflict.resultSha256 || '', now) }
      );
      if (res.matchedCount === 0) {
        const exists = await Page.exists({ _id: conflict.page, book: conflict.book });
        if (!exists) return notFound('העמוד כבר לא קיים בספר');
        return conflictResponse('העמוד השתנה שוב — רעננו', 'page_changed');
      }
    }

    const nextStatus = action === 'apply' ? 'applied' : 'dismissed';
    const updated = await OcrConflict.findOneAndUpdate(
      { _id: conflict._id, status: 'open' },
      { $set: { status: nextStatus, resolvedAt: now, resolvedByName: byName } },
      { returnDocument: 'after', lean: true }
    );
    // דחייה שמנהל אחר הקדים — לא נגענו בכלום
    if (!updated && action === 'dismiss') {
      return conflictResponse('ההתנגשות כבר טופלה — רעננו', 'already_resolved');
    }
    // באימוץ העמוד כבר עודכן; אם מנהל אחר סגר את ההתנגשות במקביל — מחזירים את מצבה הנוכחי
    const current = updated || (await OcrConflict.findById(conflict._id).lean());
    const page = await Page.findById(conflict.page).select(PAGE_FIELDS).lean();

    return NextResponse.json(
      { success: true, conflict: serializeConflict(current, page) },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('OCR conflict action error:', error);
    return serverError('Internal Server Error');
  }
}
