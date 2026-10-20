import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/db';
import Book from '@/models/Book';
import Page from '@/models/Page';
import OcrJob from '@/models/OcrJob';
import OcrWorkerState from '@/models/OcrWorkerState';
import OcrConflict from '@/models/OcrConflict';
import { readWorkerConfig } from '@/lib/ocr/workerAuth';
import { WORKER_ONLINE_WINDOW_MS, workerAvailability } from '@/lib/ocr/localJobState';
import { hasBookLibraryAccess } from '@/lib/roles';
import { reapStaleOcrJobs } from '@/lib/ocr/staleJobs';
import { badRequest, notFound, requireAccess, serverError } from '@/lib/apiResponse';

// GET /api/admin/books/ocr/status?bookId=...
// מחזיר את ספירות העמודים (לקדם-בחירה), את העבודה האחרונה/הפעילה של הספר, ולספק local
// גם את זמינות המחשב המקומי (worker), מספר ההתנגשויות הפתוחות (conflictsOpen), ותוצאות
// מתנגשות/נדחות של העבודה (resultConflicts / resultRejections).

const MAX_PAGE_ERRORS = 50;

// זמינות העובד המקומי — לתצוגה בלבד ("המחשב לא זמין"), לעולם לא סיבה לכשל
async function readWorkerInfo(now) {
  const cfg = readWorkerConfig();
  if (!cfg.ok) return { configured: false, lastSeenAt: null, availability: 'never' };
  const state = await OcrWorkerState.findOne({ workerId: cfg.workerId }).select('lastSeenAt').lean();
  const lastSeenAt = state?.lastSeenAt ?? null;
  return {
    configured: true,
    lastSeenAt,
    availability: workerAvailability(lastSeenAt, now, WORKER_ONLINE_WINDOW_MS),
  };
}

function serializeJob(job) {
  return {
    id: job._id.toString(),
    status: job.status,
    method: job.method,
    model: job.model,
    existingTextMode: job.existingTextMode,
    splitColumns: job.splitColumns,
    totalPages: job.totalPages,
    processedPages: job.processedPages,
    successPages: job.successPages,
    failedPages: job.failedPages,
    currentPageNumber: job.currentPageNumber,
    error: job.error,
    errorCode: job.errorCode ?? null,
    startedByName: job.startedByName,
    createdAt: job.createdAt,
    finishedAt: job.finishedAt,
    // ---- ספק local ----
    options: job.options ?? null,
    workerState: job.workerState ?? null,
    progress: {
      phase: job.progressPhase ?? null,
      pagesDone: job.processedPages ?? 0,
      pagesTotal: job.progressPagesTotal || job.totalPages || 0,
    },
    workerMessage: job.workerMessage ?? null,
    lastSeenAt: job.lastSeenAt ?? null,
    preparedAt: job.preparedAt ?? null,
    cancelRequested: !!job.cancelRequested,
    decision: job.decision ?? null,
    resultOutcome: job.resultOutcome ?? null,
    summary: {
      applied: job.successPages ?? 0,
      failed: job.failedPages ?? 0,
      conflicts: job.conflictPages ?? 0,
      missing: job.missingPages ?? 0,
    },
    ackAt: job.ackAt ?? null,
    cancelReason: job.cancelReason ?? null,
    cancelledByName: job.cancelledByName ?? null,
    pageErrors: (job.pageErrors || []).slice(0, MAX_PAGE_ERRORS).map((e) => ({
      pageNumber: e.pageNumber,
      message: e.message,
    })),
    // תוצאות שלא הוחלו (בלי נתיבי קבצים): מתנגשות — hash שונה אחרי נעילה, ממתינות לסימון "נבדק";
    // נדחות — קובץ פגום/לא תקין/אחרי סגירה (לבירור בלבד)
    resultConflicts: (job.resultConflicts || []).map((c) => ({
      sha256: c.sha256,
      receivedAt: c.receivedAt ?? null,
      bytes: c.bytes ?? null,
      reviewedAt: c.reviewedAt ?? null,
      reviewedByName: c.reviewedByName || '',
    })),
    resultRejections: (job.resultRejections || []).map((r) => ({
      sha256: r.sha256,
      receivedAt: r.receivedAt ?? null,
      bytes: r.bytes ?? null,
      reason: r.reason || '',
      details: r.details || '',
    })),
  };
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requireAccess(session, hasBookLibraryAccess);
    if (denied) return denied;

    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId');
    if (!bookId) {
      return badRequest('חסר מזהה ספר');
    }
    if (!mongoose.isValidObjectId(bookId)) {
      return badRequest('מזהה ספר לא תקין');
    }

    await connectDB();

    const book = await Book.findById(bookId).select('_id name').lean();
    if (!book) {
      return notFound('הספר לא נמצא');
    }

    // סימון עבודות תקועות (שרת שהופעל מחדש באמצע) ככשל לפני הקריאה
    await reapStaleOcrJobs(book._id);

    const editedFilter = {
      book: book._id,
      $or: [{ content: { $gt: '' } }, { rightColumn: { $gt: '' } }, { leftColumn: { $gt: '' } }],
    };
    const [pagesWithImage, editedPagesCount, job] = await Promise.all([
      Page.countDocuments({ book: book._id, imagePath: { $gt: '' } }),
      Page.countDocuments(editedFilter),
      // בלי pageMap (עד 2,000 רשומות), בלי נתיבי קבצים פנימיים, ועד 50 שגיאות עמוד
      OcrJob.findOne({ book: book._id })
        .sort({ createdAt: -1 })
        .select({
          pageMap: 0,
          inputPath: 0,
          resultPath: 0,
          'resultConflicts.path': 0,
          'resultRejections.path': 0,
          pageErrors: { $slice: MAX_PAGE_ERRORS },
        })
        .lean(),
    ]);

    const now = new Date();
    const [worker, conflictsOpen] = await Promise.all([
      readWorkerInfo(now),
      job?.method === 'local' ? OcrConflict.countDocuments({ job: job._id, status: 'open' }) : 0,
    ]);

    return NextResponse.json({
      success: true,
      counts: { pagesWithImage, editedPagesCount },
      job: job ? serializeJob(job) : null,
      worker,
      conflictsOpen,
    });
  } catch (error) {
    console.error('OCR status error:', error);
    return serverError('Internal Server Error');
  }
}
