// קליטת תוצאה מהעובד המקומי והחלתה על עמודי הספר — המנוע של POST /api/worker/v1/jobs/{id}/result
// (שלב 8). הסדר בדיוק כמו במפרט סעיף 4 ("סדר הקליטה באתר" א–ג) וסעיף 7 ("ביטול מול קליטה"):
//
//   א. (לפני הקריאה לכאן — localResultIntake.js) אימות סוד/מזהים/hash/גבולות/מיפוי, ושמירת
//      הקובץ עמידה (result-<sha>.json). כאן: נעילת resultSha256 בעדכון מותנה (j:true) — תוצאה
//      אחרת לא תתקבל במקומה (409 result_conflict, נשמרת כ-rejected-<sha>.json לבירור).
//   ב. נעילת החלטה: decision:null → 'apply' (status 'applying'). ביטול שכבר נרשם גובר — נשמר
//      ack=cancelled ושום טקסט לא מוחל. הנעילה לא מותנית בסטטוס הדיווח (דיווח מצב יכול לשנות
//      status בין נעילת ה-hash לנעילת ההחלטה). אחר כך lease נגד שתי החלות במקביל, והחלה לכל עמוד
//      בפעולת DB אחת מותנית (pageApplyFilter): כולל lastOcrJobId+lastOcrResultSha256; עמוד שכבר
//      נכתב ע"י אותה תוצאה — מדולג; עמוד שהשתנה (updatedAt ≠ expectedUpdatedAt) — התנגשות נשמרת
//      ב-OcrConflict עם טקסט ה-OCR ולא נדרס.
//   ג. סגירה: מונים מחושבים מחדש ($set, לא $inc), ack נשמר, active:false — בעדכון מותנה אחד (j:true).
//
// קריסה בכל נקודה → שליחה חוזרת של אותה תוצאה ממשיכה מאותה נקודה (ה-hash נעול, ההחלטה נעולה,
// עמודים שהוחלו מזוהים לפי lastOcrJobId). עבודה שנתקעה ב-applying כשהמחשב המקומי כבוי —
// resumeStalledApply משלים מהקובץ השמור (ל-cron בשלב 9), כך שמחיקה/מיזוג של הספר לא נחסמים לנצח.
//
// בלי טרנזקציות (Mongo standalone): רק עדכונים מותנים של מסמך יחיד. על OcrJob — רק lean/updateOne,
// אף פעם doc.save() (ראו OcrJob.js). imports יחסיים בלבד (נבדק ב-node:test).
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import OcrJob from '../../models/OcrJob.js';
import Page from '../../models/Page.js';
import OcrConflict from '../../models/OcrConflict.js';
import { terminalStatusForOutcome } from './localJobState.js';
import { jobDir, jobFileName, relToAbs, absToRel } from './localStorage.js';
import { parseResultBytes, validateResult } from './localResultValidate.js';
import {
  ackBody,
  failedOutcomeClasses,
  MISSING_PAGE_MESSAGE,
  pageApplyFilter,
  pageApplySet,
  pageErrorMessage,
  storedAckAnswer,
  summarizeApply,
} from './localApply.pure.js';

const DURABLE = { writeConcern: { w: 1, j: true } };

export const APPLY_LEASE_MS = 5 * 60 * 1000;
export const APPLY_RETRY_AFTER_SEC = 30;
export const APPLY_CONCURRENCY = 16;
export const MAX_RESULT_CONFLICTS = 20;

const ok = (body) => ({ status: 200, body });
const err = (status, error, headers) => ({ status, body: { error }, ...(headers ? { headers } : {}) });

const loadJob = (jobId) => OcrJob.findById(jobId).lean();
const hasAck = (job) => typeof job?.ack?.ack === 'string';
const isCancelled = (job) => job?.decision === 'cancel' || job?.status === 'cancelled';
// תוצאה מתקבלת לעבודה פעילה, או לעבודה שבוטלה במפורש (→ ack=cancelled). עבודה שנסגרה אחרת בלי
// ack (למשל נכשלה בהכנה) — לא נפתחת מחדש (410 job_closed).
const acceptsResult = (job) => job?.active === true || isCancelled(job);

// result-<sha>.json → rejected-<sha>.json באותה תיקייה (קובץ שנדחה נשמר לבירור). חסר — בשקט.
export async function moveToRejected(jobId, sha, absPath, env = process.env) {
  if (!absPath) return null;
  const target = path.join(/*turbopackIgnore: true*/ jobDir(String(jobId), env), jobFileName('rejected', sha));
  try {
    await fs.rename(/*turbopackIgnore: true*/ absPath, target);
  } catch (e) {
    if (e?.code !== 'ENOENT') throw e;
  }
  return absToRel(target, env);
}

// תוצאה עם hash שונה מהנעול: נשמרת לבירור (פעם אחת לכל hash, עד 20 אחרונות), העבודה וה-ack לא משתנים
async function rejectConflict(job, sha, file, now, env) {
  const rel = file?.absPath ? await moveToRejected(job._id, sha, file.absPath, env) : null;
  await OcrJob.updateOne(
    { _id: job._id, 'resultConflicts.sha256': { $ne: sha } },
    {
      $push: {
        resultConflicts: {
          $each: [{ sha256: sha, receivedAt: now, bytes: file?.bytes ?? null, path: rel }],
          $slice: -MAX_RESULT_CONFLICTS,
        },
      },
    }
  );
  return err(409, 'result_conflict');
}

// ביטול גובר: שומרים ack=cancelled (פעם אחת — מותנה ב-ack:null) ולא מחילים טקסט
async function storeCancelAck(job, sha, now) {
  const ack = ackBody('cancelled', job._id, sha, 'cancelled');
  const res = await OcrJob.updateOne(
    { _id: job._id, resultSha256: sha, ack: null },
    { $set: { ack, ackAt: now, active: false } },
    DURABLE
  );
  if (res.matchedCount > 0) return ok(ack);
  const fresh = await loadJob(job._id);
  const stored = storedAckAnswer(fresh?.ack);
  return stored ? ok(stored) : err(500, 'internal_error');
}

// מאגר עם מקביליות מוגבלת; חריגה ראשונה עוצרת לקיחת משימות חדשות ונזרקת אחרי שהרצות בתנועה מסתיימות
async function runPool(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  let failure = null;
  const worker = async () => {
    while (failure === null && next < items.length) {
      const i = next++;
      try {
        results[i] = await fn(items[i], i);
      } catch (e) {
        failure ??= { e };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  if (failure) throw failure.e;
  return results;
}

async function recordConflict(job, entry, text, sha, page) {
  try {
    await OcrConflict.updateOne(
      { job: job._id, page: entry.page },
      {
        $setOnInsert: {
          book: job.book,
          pageNumber: entry.pageNumber,
          pdfPageIndex: entry.pdfPageIndex,
          reason: 'page_changed',
          ocrText: text,
          resultSha256: sha,
          expectedUpdatedAt: entry.expectedUpdatedAt ?? null,
          foundUpdatedAt: page.updatedAt ?? null,
          status: 'open',
        },
      },
      { upsert: true }
    );
  } catch (e) {
    if (e?.code !== 11000) throw e; // upsert מקביל של אותה התנגשות — כבר נשמרה
  }
}

// עמוד אחד: עדכון מותנה יחיד; אם לא תפס — סיווג (כבר הוחל / חסר / התנגשות)
async function applyOne(job, entry, text, sha, now, hooks) {
  const res = await Page.updateOne(pageApplyFilter(job, entry), { $set: pageApplySet(text, job._id, sha, now) });
  if (res.matchedCount > 0) {
    await hooks?.afterPageWrite?.(entry);
    return { entry, kind: 'applied' };
  }
  const page = await Page.findById(entry.page).select('book updatedAt lastOcrJobId lastOcrResultSha256').lean();
  if (!page || String(page.book) !== String(job.book)) {
    return { entry, kind: 'missing', message: MISSING_PAGE_MESSAGE };
  }
  if (String(page.lastOcrJobId) === String(job._id) && page.lastOcrResultSha256 === sha) {
    return { entry, kind: 'applied' }; // שליחה חוזרת / המשך אחרי קריסה — בלי כתיבה כפולה
  }
  await recordConflict(job, entry, text, sha, page);
  return { entry, kind: 'conflict' };
}

// סיווג כל העמודים המבוקשים. רק success/partial כותבים לעמודים; failed/cancelled — לא נוגעים.
async function applyPages(job, doc, sha, now, hooks) {
  const pageMap = [...(job.pageMap || [])].sort((a, b) => a.pdfPageIndex - b.pdfPageIndex);
  if (doc.outcome === 'failed') return failedOutcomeClasses(doc, pageMap);
  if (doc.outcome !== 'success' && doc.outcome !== 'partial') return [];
  const byIndex = new Map(doc.pages.map((p) => [p.pdfPageIndex, p]));
  return runPool(pageMap, APPLY_CONCURRENCY, async (entry) => {
    const p = byIndex.get(entry.pdfPageIndex);
    if (!p) return { entry, kind: 'missing', message: MISSING_PAGE_MESSAGE }; // לא אמור לקרות אחרי ולידציה
    if (p.error != null) return { entry, kind: 'failed', message: pageErrorMessage(p.error) };
    return applyOne(job, entry, p.text, sha, now, hooks);
  });
}

// lease → החלה → סגירה. job: אחרי נעילת decision='apply' עם resultSha256 === sha.
async function runApply(job, sha, doc, now, hooks) {
  const lease = await OcrJob.updateOne(
    {
      _id: job._id,
      resultSha256: sha,
      decision: 'apply',
      status: 'applying',
      ack: null,
      $or: [{ applyLeaseUntil: null }, { applyLeaseUntil: { $lte: now } }],
    },
    { $set: { applyLeaseUntil: new Date(now.getTime() + APPLY_LEASE_MS) } }
  );
  if (lease.matchedCount === 0) {
    const fresh = await loadJob(job._id);
    const stored = storedAckAnswer(fresh?.ack);
    if (stored) return ok(stored);
    return err(503, 'apply_in_progress', { 'Retry-After': String(APPLY_RETRY_AFTER_SEC) });
  }

  try {
    const classes = await applyPages(job, doc, sha, now, hooks);
    const counters = summarizeApply(doc, job.pageMap, classes);
    const ack = ackBody('accepted', job._id, sha, doc.outcome);
    const close = await OcrJob.updateOne(
      { _id: job._id, resultSha256: sha, status: 'applying', ack: null },
      {
        $set: {
          ...counters,
          status: terminalStatusForOutcome(doc.outcome),
          active: false,
          finishedAt: now,
          ack,
          ackAt: now,
          applyLeaseUntil: null,
        },
      },
      DURABLE
    );
    if (close.matchedCount > 0) return ok(ack);
    // החלה מקבילה (lease שפג) סגרה ראשונה — אותה תוצאה, אותן החלטות
    const fresh = await loadJob(job._id);
    const stored = storedAckAnswer(fresh?.ack);
    return stored ? ok(stored) : err(500, 'internal_error');
  } catch (e) {
    // שחרור ה-lease (best-effort) כדי ששליחה חוזרת תמשיך מיד ולא תחכה 5 דקות
    await OcrJob.updateOne(
      { _id: job._id, resultSha256: sha, status: 'applying', ack: null },
      { $set: { applyLeaseUntil: null } }
    ).catch(() => {});
    throw e;
  }
}

// מנקודה שבה resultSha256 === sha נעול: ack שמור / ביטול גובר / נעילת החלטה / החלה
async function continueReceive(job, sha, doc, now, hooks) {
  const stored = storedAckAnswer(job.ack);
  if (stored) return ok(stored);
  if (isCancelled(job)) return storeCancelAck(job, sha, now);

  let current = job;
  if (current.decision !== 'apply') {
    const res = await OcrJob.updateOne(
      { _id: job._id, resultSha256: sha, decision: null, active: true, ack: null },
      { $set: { decision: 'apply', status: 'applying', applyStartedAt: now } },
      DURABLE
    );
    current = await loadJob(job._id);
    if (res.matchedCount === 0) {
      const again = storedAckAnswer(current?.ack);
      if (again) return ok(again);
      if (isCancelled(current)) return storeCancelAck(current, sha, now);
      if (current?.decision !== 'apply') return err(410, 'job_closed');
    }
  }
  return runApply(current, sha, doc, now, hooks);
}

/**
 * קליטת תוצאה שכבר אומתה ונשמרה עמידה (localResultIntake.js).
 * @param {{jobId:any, sha:string, doc:any, file?:{relPath:string, absPath:string, bytes:number}|null,
 *          now?:Date, env?:any, hooks?:{afterPageWrite?:(entry:any)=>any}}} args
 *   hooks — לטסטים בלבד (סימולציית קריסה אחרי k עדכוני עמוד).
 * @returns {Promise<{status:number, body:any, headers?:Record<string,string>}>}
 */
export async function receiveResult({ jobId, sha, doc, file = null, now = new Date(), env = process.env, hooks }) {
  let job = await loadJob(jobId);
  if (!job) return err(404, 'not_found');

  // נעילת resultSha256 (לכל היותר שני סבבים: אם מישהו אחר נעל בינתיים — מעריכים מחדש)
  for (let round = 0; round < 2 && job.resultSha256 !== sha; round++) {
    if (job.resultSha256) return rejectConflict(job, sha, file, now, env);
    if (!acceptsResult(job)) return err(410, 'job_closed');
    await OcrJob.updateOne(
      { _id: job._id, resultSha256: null },
      {
        $set: {
          resultSha256: sha,
          resultOutcome: doc.outcome,
          resultPath: file?.relPath ?? null,
          resultBytes: file?.bytes ?? null,
          resultReceivedAt: now,
          pipelineVersion: doc.pipelineVersion,
        },
      },
      DURABLE
    );
    job = await loadJob(jobId);
    if (!job) return err(404, 'not_found');
  }
  if (job.resultSha256 !== sha) return rejectConflict(job, sha, file, now, env);
  return continueReceive(job, sha, doc, now, hooks);
}

/**
 * תשובה לשליחה חוזרת של תוצאה שכבר אושרה, בלי לקרוא/לשמור את הגוף שוב (אחרי ניקוי הקבצים
 * — "גם ימים אחר כך"). null אם אין ack שמור לאותו hash.
 */
export function storedAnswerFor(job, sha) {
  if (!hasAck(job) || job.resultSha256 !== sha) return null;
  return ok(storedAckAnswer(job.ack));
}

// עבודות "תקועות": תוצאה נעולה בלי ack, ואין החלה חיה — ה-lease פג, או שלא נלקח מעולם והנעילה ישנה
export function stalledApplyFilter(now) {
  const stale = new Date(now.getTime() - APPLY_LEASE_MS);
  return {
    method: 'local',
    resultSha256: { $type: 'string' },
    ack: null,
    resultReceivedAt: { $lt: stale },
    $or: [{ applyLeaseUntil: { $lt: now } }, { applyLeaseUntil: null }],
  };
}

async function readStoredResult(job, env) {
  let bytes;
  try {
    bytes = await fs.readFile(/*turbopackIgnore: true*/ relToAbs(job.resultPath, env));
  } catch (e) {
    if (e?.code === 'ENOENT' || e?.message === 'invalid_storage_path') return { ok: false, code: 'result_unavailable' };
    throw e;
  }
  if (createHash('sha256').update(bytes).digest('hex') !== job.resultSha256) return { ok: false, code: 'result_corrupt' };
  const parsed = parseResultBytes(bytes);
  if (!parsed.ok || !validateResult(parsed.doc, job, bytes.length).ok) return { ok: false, code: 'result_invalid' };
  return { ok: true, doc: parsed.doc };
}

/**
 * השלמת קליטה שנתקעה (קריסת שרת באמצע + המחשב המקומי כבוי/לא שולח שוב) מהקובץ השמור — בצד
 * השרת בלבד, בלי העובד. ל-cron (שלב 9). כשהעובד ישלח שוב — יקבל already_received (או cancelled).
 * לא נוגעת בעבודה שה-lease שלה חי או שהתוצאה ננעלה לפני פחות מ-APPLY_LEASE_MS.
 * @returns {Promise<{ok:boolean, code:string, ack?:any}>} code: applied | cancelled | already_closed |
 *   not_stalled | not_found | apply_in_progress | result_unavailable | result_corrupt | result_invalid | job_closed
 */
export async function resumeStalledApply(jobId, { now = new Date(), env = process.env } = {}) {
  const job = await OcrJob.findOne({ _id: jobId, method: 'local' }).lean();
  if (!job) return { ok: false, code: 'not_found' };
  if (hasAck(job)) return { ok: true, code: 'already_closed', ack: job.ack };
  const stalled = await OcrJob.exists({ _id: job._id, ...stalledApplyFilter(now) });
  if (!stalled) return { ok: false, code: 'not_stalled' };

  let r;
  if (isCancelled(job)) {
    r = await storeCancelAck(job, job.resultSha256, now);
  } else {
    const read = await readStoredResult(job, env);
    if (!read.ok) return { ok: false, code: read.code };
    r = await continueReceive(job, job.resultSha256, read.doc, now);
  }
  if (r.status !== 200) return { ok: false, code: r.body.error };
  return { ok: true, code: r.body.ack === 'cancelled' ? 'cancelled' : 'applied', ack: r.body };
}

/**
 * כל העבודות התקועות (עד limit) — resumeStalledApply לכל אחת. לא זורקת על עבודה בודדת.
 * @returns {Promise<{jobId:string, ok:boolean, code:string}[]>}
 */
export async function resumeStalledApplies({ now = new Date(), env = process.env, limit = 20 } = {}) {
  const jobs = await OcrJob.find(stalledApplyFilter(now)).select('_id').sort({ _id: 1 }).limit(limit).lean();
  const out = [];
  for (const { _id } of jobs) {
    try {
      const r = await resumeStalledApply(_id, { now, env });
      out.push({ jobId: String(_id), ok: r.ok, code: r.code });
    } catch (e) {
      out.push({ jobId: String(_id), ok: false, code: String(e?.code ?? e?.name ?? 'error') });
    }
  }
  return out;
}
