// צורת ההתנגשות (OcrConflict) בתשובות ה-API של ממשק הניהול — מודול טהור, imports יחסיים בלבד.
// כולל את הטקסט הנוכחי של העמוד (הטקסט האנושי) לצד טקסט ה-OCR, ואת updatedAt של העמוד —
// הלקוח שולח אותו בחזרה באימוץ ה-OCR, וההחלה מותנית בו (עריכה חדשה יותר לא נדרסת).

export const CONFLICT_ACTIONS = Object.freeze(['apply', 'dismiss']);

export const CONFLICT_STATUSES = Object.freeze(['open', 'applying', 'applied', 'dismissed']);
// ממתינות להחלטה (ספירת "פתוחות"): applying עדיין לא הוכרע — אימוץ בתהליך או שנקטע בקריסה
export const PENDING_CONFLICT_STATUSES = Object.freeze(['open', 'applying']);

// משך ה-lease של אימוץ (open → applying). כתיבת העמוד היא עדכון יחיד וקצר; אחרי שה-lease פג
// מניחים שהבקשה קרסה ומכריעים לפי העמוד (conflictApplyLanded).
export const CONFLICT_APPLY_LEASE_MS = 2 * 60 * 1000;

/** אימוץ שנתקע ב-applying וה-lease שלו פג (או חסר) */
export function conflictApplyStale(conflict, now) {
  if (conflict?.status !== 'applying') return false;
  const until = conflict.applyLeaseUntil ? new Date(conflict.applyLeaseUntil).getTime() : NaN;
  return !Number.isFinite(until) || until <= new Date(now).getTime();
}

/**
 * האם כתיבת העמוד של האימוץ הנוכחי (applyStartedAt) אכן קרתה: העמוד נושא את סימון ה-OCR של
 * העבודה, ו-lastOcrAt שלו הוא בדיוק מועד תחילת האימוץ (נכתב באותו $set עם הטקסט).
 * @param {any|null} page lean: lastOcrJobId, lastOcrResultSha256, lastOcrAt
 * @param {any} conflict lean: job, resultSha256, applyStartedAt
 */
export function conflictApplyLanded(page, conflict) {
  if (!page || !conflict?.applyStartedAt || !page.lastOcrAt) return false;
  return String(page.lastOcrJobId) === String(conflict.job)
    && (page.lastOcrResultSha256 || '') === (conflict.resultSha256 || '')
    && new Date(page.lastOcrAt).getTime() === new Date(conflict.applyStartedAt).getTime();
}

// ברירת מחדל ותקרה לגודל עמוד ברשימה (כל פריט נושא שני טקסטים מלאים של עמוד)
export const CONFLICTS_PAGE_DEFAULT = 50;
export const CONFLICTS_PAGE_MAX = 500;

const iso = (d) => (d ? new Date(d).toISOString() : null);

/**
 * @param {any} conflict רשומת OcrConflict (lean)
 * @param {any|null} page העמוד הנוכחי (lean: _id, content, rightColumn, leftColumn, isTwoColumns, updatedAt) או null אם נמחק
 */
export function serializeConflict(conflict, page) {
  return {
    id: String(conflict._id),
    jobId: String(conflict.job),
    pageId: String(conflict.page),
    pageNumber: conflict.pageNumber ?? null,
    reason: conflict.reason || 'page_changed',
    status: conflict.status || 'open',
    ocrText: conflict.ocrText || '',
    createdAt: iso(conflict.createdAt),
    expectedUpdatedAt: iso(conflict.expectedUpdatedAt),
    resolvedAt: iso(conflict.resolvedAt),
    resolvedByName: conflict.resolvedByName || '',
    pageExists: !!page,
    pageUpdatedAt: page ? iso(page.updatedAt) : null,
    pageContent: page?.content || '',
    pageIsTwoColumns: !!page?.isTwoColumns,
    pageRightColumn: page?.rightColumn || '',
    pageLeftColumn: page?.leftColumn || '',
  };
}

/** limit/offset מתוך query string — מספרים שלמים בטווח, אחרת ברירת מחדל */
export function parsePaging(searchParams) {
  const rawLimit = Number.parseInt(searchParams.get('limit') ?? '', 10);
  const rawOffset = Number.parseInt(searchParams.get('offset') ?? '', 10);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, CONFLICTS_PAGE_MAX) : CONFLICTS_PAGE_DEFAULT;
  const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? rawOffset : 0;
  return { limit, offset };
}

/** תאריך תקין מהלקוח (ISO) או null */
export function parseClientDate(value) {
  if (typeof value !== 'string' || value.length > 64) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
