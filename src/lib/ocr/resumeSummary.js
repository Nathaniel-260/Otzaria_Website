import { resumeFailureBacksOff } from './localApply.pure.js';

/**
 * סיכום תוצאות השלמת קליטות תקועות לתשובת ה-cron (סקירה W08).
 * succeeded = ok; contention = תחרות/מצב צפוי שאינו כשל (apply_in_progress, not_stalled, already_closed,
 * not_found, cancelled — אותה הגדרה כמו resumeFailureBacksOff); failed = כשל אמיתי (result_unavailable,
 * result_corrupt, חריגה וכו'), ורק הוא מכשיל את ok של הריצה.
 * @param {{jobId?:string, ok:boolean, code?:string}[]} results
 */
export function summarizeResumeResults(results = []) {
  let succeeded = 0;
  let contention = 0;
  let failed = 0;
  const failedCodes = {};
  for (const r of results) {
    if (r.ok) succeeded += 1;
    else if (!resumeFailureBacksOff(r.code)) contention += 1;
    else {
      failed += 1;
      const c = String(r.code ?? 'error');
      failedCodes[c] = (failedCodes[c] ?? 0) + 1;
    }
  }
  return { attempted: results.length, succeeded, contention, failed, failedCodes };
}
