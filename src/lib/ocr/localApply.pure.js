// פונקציות טהורות של קליטת תוצאה מהעובד המקומי (localApply.js) — בלי DB/fs.
// imports יחסיים בלבד (נבדק ב-node:test).
import { buildPageUpdate } from './runOcrJob.pure.js';
import { stripUnsafe } from './localStatusReport.js';

export const ACK_KINDS = Object.freeze(['accepted', 'already_received', 'cancelled']);
export const ACK_OUTCOMES = Object.freeze(['success', 'partial', 'failed', 'cancelled']);
const ACK_KEYS = Object.freeze(['ack', 'jobId', 'resultSha256', 'outcome']);
const JOB_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const SHA_RE = /^[0-9a-f]{64}$/;

export const STORED_ERROR_CHARS = 500;

// גוף ה-ack (ack.schema.json): בדיוק ארבעה שדות, בסדר הזה
export function ackBody(ack, jobId, resultSha256, outcome) {
  return { ack, jobId: String(jobId), resultSha256, outcome };
}

// בדיקת ack מול ack.schema.json (מפתחות, enum, תבניות, ו-cancelled ⇒ outcome cancelled) —
// הגנה לפני שמירה/החזרה ובטסטים, בלי ספריית JSON-Schema
export function isValidAck(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) return false;
  const keys = Object.keys(body);
  if (keys.length !== ACK_KEYS.length || !ACK_KEYS.every((k) => keys.includes(k))) return false;
  if (!ACK_KINDS.includes(body.ack) || !ACK_OUTCOMES.includes(body.outcome)) return false;
  if (typeof body.jobId !== 'string' || !JOB_ID_RE.test(body.jobId)) return false;
  if (typeof body.resultSha256 !== 'string' || !SHA_RE.test(body.resultSha256)) return false;
  return body.ack !== 'cancelled' || body.outcome === 'cancelled';
}

// ה-ack השמור (job.ack) → התשובה לשליחה חוזרת: ack=cancelled נשאר cancelled (outcome cancelled);
// accepted → already_received עם אותו outcome שנרשם בקליטה הראשונה. null אם אין ack שמור.
export function storedAckAnswer(stored) {
  if (!stored || typeof stored.ack !== 'string') return null;
  if (stored.ack === 'cancelled') return ackBody('cancelled', stored.jobId, stored.resultSha256, 'cancelled');
  return ackBody('already_received', stored.jobId, stored.resultSha256, stored.outcome);
}

const SKIP_EMPTY = { $not: /\S/ }; // ריק, רווחים בלבד, null או חסר

// פילטר העדכון המותנה של עמוד אחד (מפרט סעיף 4ב): העמוד שייך לספר, לא השתנה מאז יצירת
// העבודה (updatedAt = expectedUpdatedAt מה-pageMap), ולא נכתב כבר ע"י העבודה הזו. במצב skip —
// גם ריק מטקסט (כמו pageHasText ב-runOcrJob, שהיה ריק בעת היצירה).
export function pageApplyFilter(job, entry) {
  const filter = {
    _id: entry.page,
    book: job.book,
    updatedAt: entry.expectedUpdatedAt ?? null,
    lastOcrJobId: { $ne: job._id },
  };
  if (job.existingTextMode !== 'overwrite') {
    filter.content = SKIP_EMPTY;
    filter.rightColumn = SKIP_EMPTY;
    filter.leftColumn = SKIP_EMPTY;
  }
  return filter;
}

// ה-$set לעמוד: בדיוק כמו gemini/ocrwin (buildPageUpdate — content, טורים מתאפסים) + שדות
// המעקב באותה פעולה. סטטוס העמוד לא משתנה (כמו ב-runOcrJob).
export function pageApplySet(text, jobId, sha, now) {
  return {
    ...buildPageUpdate(text),
    lastOcrJobId: jobId,
    lastOcrResultSha256: sha,
    lastOcrAt: now,
  };
}

const clean = (s) => stripUnsafe(String(s ?? ''), STORED_ERROR_CHARS).trim();

// שגיאת עמוד מהעובד → הודעה בעברית לתצוגה (טקסט רגיל, מנוקה ומקוצר)
export function pageErrorMessage(err) {
  const code = clean(err?.code);
  const message = clean(err?.message);
  const text = `שגיאת OCR במחשב המקומי (${code || 'unknown'})${message ? `: ${message}` : ''}`;
  return Array.from(text).slice(0, STORED_ERROR_CHARS).join('');
}

export const MISSING_PAGE_MESSAGE = 'העמוד לא נמצא בספר (נמחק אחרי יצירת העבודה)';

// שגיאה כללית של העבודה לפי התוצאה: failed → "<code>: <message>" (או הודעה כשכל העמודים נכשלו)
export function jobErrorText(doc) {
  if (doc?.outcome !== 'failed') return '';
  if (doc.error && typeof doc.error.code === 'string' && doc.error.code.trim()) {
    const code = clean(doc.error.code);
    const message = clean(doc.error.message);
    return Array.from(message ? `${code}: ${message}` : code).slice(0, STORED_ERROR_CHARS).join('');
  }
  return 'כל העמודים נכשלו בעיבוד במחשב המקומי';
}

/**
 * סיכום ההחלה → שדות המונים לשמירה ב-$set (לא $inc — שליחה חוזרת מחשבת מחדש ולא מגדילה).
 * @param {any} doc — התוצאה
 * @param {any[]} pageMap
 * @param {{entry:any, kind:'applied'|'failed'|'missing'|'conflict', message?:string}[]} classes
 */
export function summarizeApply(doc, pageMap, classes) {
  const count = (kind) => classes.filter((c) => c.kind === kind).length;
  const pageErrors = classes
    .filter((c) => c.kind === 'failed' || c.kind === 'missing')
    .map((c) => ({ pageNumber: c.entry.pageNumber, message: c.message || '' }))
    .sort((a, b) => a.pageNumber - b.pageNumber);
  const total = (pageMap || []).length;
  if (doc.outcome === 'cancelled') {
    return { successPages: 0, failedPages: 0, conflictPages: 0, missingPages: 0, pageErrors: [], error: '' };
  }
  if (doc.outcome === 'failed') {
    return {
      successPages: 0,
      failedPages: total,
      conflictPages: 0,
      missingPages: 0,
      processedPages: total,
      pageErrors,
      error: jobErrorText(doc),
    };
  }
  return {
    successPages: count('applied'),
    failedPages: count('failed'),
    conflictPages: count('conflict'),
    missingPages: count('missing'),
    processedPages: total,
    pageErrors,
    error: '',
  };
}

// בתוצאת failed — אילו עמודים נכשלו ועם איזו הודעה (לתיעוד בלבד; שום עמוד לא נכתב)
export function failedOutcomeClasses(doc, pageMap) {
  const byIndex = new Map((doc.pages || []).map((p) => [p.pdfPageIndex, p]));
  return (pageMap || [])
    .filter((entry) => byIndex.get(entry.pdfPageIndex)?.error)
    .map((entry) => ({ entry, kind: 'failed', message: pageErrorMessage(byIndex.get(entry.pdfPageIndex).error) }));
}
