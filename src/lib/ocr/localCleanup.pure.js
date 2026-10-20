// החלטות הניקוי של קבצי עבודות OCR מקומי (localCleanup.js) — פונקציות טהורות, בלי DB/fs.
// מפרט סעיף 4 ("ניקוי") וסעיף 6 (Cleanup): 24 שעות ממועד אישור המסירה (ackAt) — לא מסיום
// החישוב — נמחקים קובצי ה-PDF/התוצאה/ההעברה של העבודה. ללא ack — תוצאה לא נמחקת לעולם.
// רשומת OcrJob, ה-ack והסיכום נשמרים בלי TTL (השירות מפרש 404 כ-site_missing) — כאן רק קבצים.
//
// מדיניות לכל קובץ בתיקיית עבודה סגורה (active:false) שעברה את חלון השמירה:
//   input-<sha>.pdf      → נמחק (כל קובץ קלט, כולל קובץ יתום של הכנה שהפסידה במרוץ).
//   result-<sha>.json    → התוצאה הנעולה (resultSha256) נמחקת רק אם יש ack. קובץ result אחר
//                          ("תועה" — בקשה שנקטעה בין הכתיבה להעברה ל-rejected) נמחק אחרי 30 יום.
//   rejected-<sha>.json  → תוצאה מתנגשת (resultConflicts) נשמרת עד שסומנה כנבדקה (reviewedAt);
//                          תוצאה שנדחתה בקליטה (resultRejections: 400/422/410) — 30 יום מקבלתה;
//                          קובץ שאינו רשום (נדחק מרשימת ה-20 האחרונות) — 30 יום לפי mtime.
//   כל שם אחר (כולל קבצים זמניים — sweepTmpFiles מטפל בהם) → לא נוגעים.
// קובץ ששמו מכיל את resultSha256 הנעול לא נמחק לעולם כשאין ack (גם אם שמו rejected-…).
// imports: אין (נבדק ב-node:test).

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;
export const FILE_RETENTION_MS = DAY_MS; // מפרט: 24 שעות ממועד אישור המסירה
export const REJECTED_RETENTION_MS = 30 * DAY_MS;
// תיקייה שנשארו בה קבצים (התנגשות שטרם נבדקה, דחייה טרייה) — נבדקת שוב פעם ביום
export const RECHECK_MS = DAY_MS;
// רשת ביטחון: גם עבודה שנוקתה נבדקת שוב פעם בחודש (תיקייה שנוצרה מחדש בלי שינוי שנרשם ב-DB)
export const PURGED_RECHECK_MS = 30 * DAY_MS;

const FILE_RE = /^(input|result|rejected)-([0-9a-f]{64})\.(pdf|json)$/;
const EXT_OF = Object.freeze({ input: 'pdf', result: 'json', rejected: 'json' });

const time = (d) => (d == null ? NaN : new Date(d).getTime());
const hasAck = (job) => typeof job?.ack?.ack === 'string';
const lockedSha = (job) => (typeof job?.resultSha256 === 'string' ? job.resultSha256 : null);

// שם קובץ בתיקיית עבודה → { kind, sha } או null (שם שאינו קובץ עבודה — לא נוגעים)
export function parseJobFileName(name) {
  const m = FILE_RE.exec(String(name));
  if (!m || EXT_OF[m[1]] !== m[3]) return null;
  return { kind: m[1], sha: m[2] };
}

/**
 * האם קבצי העבודה עברו את חלון השמירה, ומאיזו סיבה:
 *   'acked'           — יש ack (accepted/cancelled) ו-ackAt לפני retentionMs ומעלה.
 *   'closed_unacked'  — נסגרה בלי ack ובלי תוצאה נעולה (failed בהכנה / בוטלה לפני שנמסרה תוצאה),
 *                       לפני retentionMs ומעלה — רק קובץ הקלט (היתום) והעברות שנדחו.
 *   null              — עדיין לא (פעילה, ack טרי, או תוצאה נעולה בלי ack — resumeStalledApplies).
 */
export function jobFilesEligibility(job, now, retentionMs = FILE_RETENTION_MS) {
  if (!job || job.active !== false || job.method !== 'local') return null;
  const cut = now.getTime() - retentionMs;
  if (hasAck(job)) return time(job.ackAt) <= cut ? 'acked' : null;
  if (lockedSha(job)) return null;
  if (job.status !== 'failed' && job.status !== 'cancelled') return null;
  const closedAt = time(job.finishedAt ?? job.cancelledAt ?? job.updatedAt);
  return closedAt <= cut ? 'closed_unacked' : null;
}

/**
 * החלטה לקובץ אחד בתיקיית עבודה שכבר נמצאה כשירה (jobFilesEligibility ≠ null).
 * @param {{name:string, mtimeMs?:number}} file — mtimeMs נדרש רק לקבצים "תועים"/לא רשומים
 * @returns {{action:'delete'|'keep', kind:string|null, reason:string}}
 */
export function fileDecision(file, job, now, { rejectedRetentionMs = REJECTED_RETENTION_MS } = {}) {
  const parsed = parseJobFileName(file?.name);
  if (!parsed) return { action: 'keep', kind: null, reason: 'unknown_file' };
  const { kind, sha } = parsed;
  const keep = (reason) => ({ action: 'keep', kind, reason });
  const del = (reason) => ({ action: 'delete', kind, reason });
  const locked = lockedSha(job);
  if (sha === locked && !hasAck(job)) return keep('unacknowledged_result');

  const oldEnough = (t) => Number.isFinite(t) && t <= now.getTime() - rejectedRetentionMs;

  if (kind === 'input') return del('input');
  if (kind === 'result') {
    if (sha === locked) return del('acknowledged_result');
    return oldEnough(file.mtimeMs) ? del('stale_stray_result') : keep('stray_result');
  }
  // rejected
  const conflict = (job.resultConflicts || []).find((c) => c?.sha256 === sha);
  if (conflict) return conflict.reviewedAt ? del('reviewed_conflict') : keep('unreviewed_conflict');
  const rejection = (job.resultRejections || []).find((r) => r?.sha256 === sha);
  if (rejection) return oldEnough(time(rejection.receivedAt)) ? del('old_rejection') : keep('recent_rejection');
  return oldEnough(file.mtimeMs) ? del('old_unlisted_rejected') : keep('unlisted_rejected');
}

// האם להחלטה דרוש mtime (קובץ "תועה" או לא רשום) — כדי לא לקרוא lstat לכל קובץ
export function needsMtime(name, job) {
  const parsed = parseJobFileName(name);
  if (!parsed || parsed.kind === 'input') return false;
  if (parsed.kind === 'result') return parsed.sha !== lockedSha(job);
  const listed = (list) => (list || []).some((x) => x?.sha256 === parsed.sha);
  return !listed(job.resultConflicts) && !listed(job.resultRejections);
}

/**
 * פילטר המועמדות לניקוי (שאילתה אחת, method+active מאונדקסים):
 *   כשירה — ack לפני 24 שעות, או נסגרה בלי ack/תוצאה נעולה (failed/cancelled) לפני 24 שעות;
 *   וגם טרם נבדקה / נשארו קבצים ועבר יום מהבדיקה / נוקתה ועבר חודש / קרה משהו חדש מאז הבדיקה
 *   האחרונה (ack מאוחר, תוצאה מתנגשת/נדחית שהגיעה, התנגשות שסומנה כנבדקה) — כך תיקייה שנוצרה
 *   מחדש אחרי ניקוי נבדקת שוב, ועבודה שנוקתה לא נסרקת בכל הרצה.
 */
export function cleanupCandidateFilter(now, { retentionMs = FILE_RETENTION_MS } = {}) {
  const at = now.getTime();
  const cut = new Date(at - retentionMs);
  const latestActivity = {
    $max: [
      '$ackAt',
      { $max: '$resultConflicts.receivedAt' },
      { $max: '$resultConflicts.reviewedAt' },
      { $max: '$resultRejections.receivedAt' },
    ],
  };
  return {
    method: 'local',
    active: false,
    $and: [
      {
        $or: [
          { 'ack.ack': { $type: 'string' }, ackAt: { $lte: cut } },
          {
            ack: null,
            resultSha256: null,
            status: { $in: ['failed', 'cancelled'] },
            $or: [{ finishedAt: { $lte: cut } }, { finishedAt: null, updatedAt: { $lte: cut } }],
          },
        ],
      },
      {
        $or: [
          { filesCheckedAt: null },
          { filesPurgedAt: null, filesCheckedAt: { $lte: new Date(at - RECHECK_MS) } },
          { filesCheckedAt: { $lte: new Date(at - PURGED_RECHECK_MS) } },
          { $expr: { $gt: [latestActivity, '$filesCheckedAt'] } },
        ],
      },
    ],
  };
}
