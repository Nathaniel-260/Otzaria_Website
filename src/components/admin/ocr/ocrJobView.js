// לוגיקת תצוגה טהורה לעבודות OCR בממשק הניהול (BookOcrDialog ורכיבי src/components/admin/ocr).
// בלי React/DOM — מיפוי מצב → תווית/גוון/אייקון, התקדמות, זמינות המחשב המקומי, אפשרות ביטול
// ונוסחי סיכום. מקור המצבים והתוויות: src/lib/ocr/localJobState.js.
import { STATUS_LABELS_HE, isActiveStatus } from '@/lib/ocr/localJobState'

// גוון (ui/Badge tone) ואייקון לכל מצב — הצבע מחזק בלבד, המשמעות בטקסט
const STATUS_TONES = Object.freeze({
  preparing: 'info',
  queued: 'neutral',
  running: 'info',
  pausing: 'warning',
  paused_runner: 'warning',
  delivery_pending: 'info',
  needs_attention: 'error',
  applying: 'info',
  completed: 'success',
  failed: 'error',
  cancelled: 'warning',
})

const STATUS_ICONS = Object.freeze({
  preparing: 'description',
  queued: 'schedule',
  running: 'autorenew',
  pausing: 'pause_circle',
  paused_runner: 'pause_circle',
  delivery_pending: 'pending',
  needs_attention: 'warning',
  applying: 'download_done',
  completed: 'task_alt',
  failed: 'error',
  cancelled: 'cancel',
})

export function statusLabel(status) {
  return STATUS_LABELS_HE[status] || 'מצב לא ידוע'
}

export function statusTone(status) {
  return STATUS_TONES[status] || 'neutral'
}

export function statusIcon(status) {
  return STATUS_ICONS[status] || 'help'
}

export function isJobActive(job) {
  return !!job && isActiveStatus(job.status)
}

export function isLocalJob(job) {
  return job?.method === 'local'
}

// local — כל 10 שניות (העובד מדווח לכל היותר כל כמה שניות, ואין טעם להעמיס); שרת — 2.5 שניות.
// null כשאין עבודה פעילה (אין polling).
export const POLL_MS_SERVER = 2500
export const POLL_MS_LOCAL = 10000
export function pollIntervalMs(job) {
  if (!isJobActive(job)) return null
  return isLocalJob(job) ? POLL_MS_LOCAL : POLL_MS_SERVER
}

// עמודים שעובדו מתוך הסך — local לפי דיווח העובד (progress), שרת לפי processedPages/totalPages
export function progressCounts(job) {
  if (!job) return { done: 0, total: 0 }
  if (isLocalJob(job)) {
    const done = Number(job.progress?.pagesDone) || 0
    const total = Number(job.progress?.pagesTotal) || Number(job.totalPages) || 0
    return { done, total }
  }
  return { done: Number(job.processedPages) || 0, total: Number(job.totalPages) || 0 }
}

export function progressPercent(job) {
  const { done, total } = progressCounts(job)
  if (total <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((done / total) * 100)))
}

// ביטול אפשרי רק לעבודה פעילה שהחלת התוצאה שלה עוד לא התחילה (אחרת השרת מחזיר 409 apply_started)
export function canCancel(job) {
  if (!isJobActive(job)) return false
  if (job.status === 'applying' || job.decision === 'apply') return false
  return true
}

// "המשך הכנה": עבודת local שנתקעה בהכנה — ה-lease של ההכנה פג (preparingStale מהשרת), או שהבקשה
// האחרונה מהדיאלוג נכשלה בתקלה שאפשר להמשיך ממנה (preparation_retry וכו'). דורש את ה-requestId
// מהשרת: ההמשך הוא אותה בקשה (אותה עבודה), לא בקשה חדשה.
export function canResumePreparation(job, { lastStartNeedsResume = false } = {}) {
  if (!isLocalJob(job) || job.status !== 'preparing') return false
  if (typeof job.requestId !== 'string' || !job.requestId) return false
  return job.preparingStale === true || lastStartNeedsResume === true
}

// גוף בקשת ה-start להמשך ההכנה — אותו requestId ואותם פרמטרים שהעבודה נוצרה איתם (השרת משווה
// fingerprint; פרמטרים אחרים היו נדחים ב-409 request_conflict)
export function resumePreparationPayload(job, bookId) {
  const options = {}
  if (job?.options?.lm) options.lm = job.options.lm
  if (job?.options?.defaultScript) options.defaultScript = job.options.defaultScript
  return {
    bookId,
    method: 'local',
    requestId: job?.requestId,
    existingTextMode: job?.existingTextMode,
    options,
  }
}

export function methodLabel(job) {
  if (!job) return ''
  if (job.method === 'gemini') return `Gemini · ${job.model || ''}`.trim()
  if (job.method === 'local') return 'מחשב מקומי'
  return 'OCRWin'
}

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** "נראה לאחרונה" — זמן יחסי בעברית; מעבר ליומיים — תאריך ושעה */
export function formatLastSeen(lastSeenAt, now = new Date()) {
  if (!lastSeenAt) return 'מעולם לא התחבר'
  const seen = new Date(lastSeenAt).getTime()
  if (Number.isNaN(seen)) return 'מעולם לא התחבר'
  const diff = Math.max(0, new Date(now).getTime() - seen)
  if (diff < MINUTE) return 'לפני פחות מדקה'
  if (diff < HOUR) {
    const m = Math.floor(diff / MINUTE)
    return m === 1 ? 'לפני דקה' : `לפני ${m} דקות`
  }
  if (diff < DAY) {
    const h = Math.floor(diff / HOUR)
    return h === 1 ? 'לפני שעה' : h === 2 ? 'לפני שעתיים' : `לפני ${h} שעות`
  }
  if (diff < 2 * DAY) return 'אתמול'
  return new Date(seen).toLocaleString('he-IL', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
}

/**
 * "המחשב המעבד לא זמין" — לתצוגה בלבד (לעולם לא מבטל/מכשיל דבר): עבודת local פעילה, והעובד
 * לא פנה בחלון הזמינות (offline), מעולם לא פנה (never), או שאינו מוגדר בשרת.
 */
export function isWorkerUnavailable(job, worker) {
  if (!isLocalJob(job) || !isJobActive(job)) return false
  if (!worker) return false
  if (worker.configured === false) return true
  return worker.availability === 'offline' || worker.availability === 'never'
}

const CANCEL_REASONS = Object.freeze({
  admin: 'בוטלה בידי מנהל',
  book_deleted: 'בוטלה עקב מחיקת הספר',
  book_merged: 'בוטלה עקב מיזוג ספרים',
})

export function cancelReasonLabel(job) {
  const base = CANCEL_REASONS[job?.cancelReason] || 'בוטלה'
  if (job?.cancelReason === 'admin' && job?.cancelledByName) return `בוטלה בידי ${job.cancelledByName}`
  return base
}

const ERROR_CODES = Object.freeze({
  no_pages_succeeded: 'אף עמוד לא נקלט: כל העמודים נכשלו בעיבוד במחשב המקומי או נמחקו מהספר',
  prep_abandoned: 'הכנת קובץ הקלט נקטעה',
  missing_image: 'חסרות תמונות לחלק מהעמודים',
  unsupported_image: 'פורמט תמונה שאינו נתמך בחלק מהעמודים',
  too_many_pages: 'הספר גדול מדי לעיבוד במחשב המקומי',
  input_too_large: 'קובץ הקלט גדול מדי לעיבוד במחשב המקומי',
  no_pages: 'אין עמודים לעיבוד',
})

/** טקסט השגיאה של עבודה שנכשלה — השגיאה השמורה, ואם אין — לפי הקוד */
export function jobErrorText(job) {
  if (job?.error) return job.error
  if (job?.errorCode && ERROR_CODES[job.errorCode]) return ERROR_CODES[job.errorCode]
  return 'שגיאה לא ידועה'
}

/** שורת הסיכום של עבודת local שנקלטה: הוחלו · נכשלו · התנגשויות · עמודים שנמחקו */
export function summaryParts(job) {
  const s = job?.summary || {}
  return [
    { key: 'applied', label: 'הוחלו', value: Number(s.applied) || 0, tone: 'success' },
    { key: 'failed', label: 'נכשלו', value: Number(s.failed) || 0, tone: 'error' },
    { key: 'conflicts', label: 'התנגשויות', value: Number(s.conflicts) || 0, tone: 'warning' },
    { key: 'missing', label: 'עמודים שנמחקו', value: Number(s.missing) || 0, tone: 'neutral' },
  ]
}

const REJECTION_REASONS = Object.freeze({
  invalid_result: 'קובץ התוצאה פגום (אינו JSON תקין)',
  validation_failed: 'התוצאה לא עברה בדיקת תקינות',
  job_closed: 'התוצאה הגיעה אחרי שהעבודה נסגרה',
})

export function rejectionReasonLabel(reason) {
  return REJECTION_REASONS[reason] || 'התוצאה נדחתה'
}

const RESUME_ERROR_LABELS = Object.freeze({
  result_unavailable: 'קובץ התוצאה השמור חסר באחסון',
  result_corrupt: 'קובץ התוצאה השמור פגום (ה-hash אינו תואם)',
  result_invalid: 'קובץ התוצאה השמור אינו תקין',
})

/**
 * השלמת הקליטה מהקובץ השמור (cron) נכשלה ועדיין אין ack — תקלה למפעיל, עם מועד הניסיון האוטומטי
 * הבא. null אם אין תקלה פתוחה (לא נכשלה מעולם, או שהעבודה כבר קיבלה ack).
 */
export function resumeIssue(job) {
  const code = job?.resumeErrorCode
  if (!code || job.ackAt) return null
  return {
    label: RESUME_ERROR_LABELS[code] || `שגיאה (${code})`,
    failedAt: formatDateTime(job.resumeFailedAt),
    retryAt: formatDateTime(job.resumeRetryAt),
    failures: Number(job.resumeFailures) || 0,
  }
}

export function formatBytes(bytes) {
  if (bytes == null) return ''
  const n = Number(bytes)
  if (!Number.isFinite(n) || n < 0) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function formatDateTime(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('he-IL', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
}

// תוויות אפשרויות העיבוד המקומי (whitelist זהה ל-LOCAL_OPTION_VALUES בשרת). ברירות המחדל זהות
// ל-DEFAULT_LOCAL_OPTIONS ב-localJobCreate.pure.js (שאינו נטען בדפדפן — מייבא node:crypto).
export const LOCAL_DEFAULT_OPTIONS = Object.freeze({ lm: 'rabbinic', defaultScript: 'square' })
export const LOCAL_LM_OPTIONS = Object.freeze([
  { value: 'rabbinic', label: 'רבני', desc: 'מודל שפה לספרות תורנית' },
  { value: 'modern', label: 'מודרני', desc: 'עברית מודרנית' },
  { value: 'off', label: 'כבוי', desc: 'בלי מודל שפה' },
])
export const LOCAL_SCRIPT_OPTIONS = Object.freeze([
  { value: 'square', label: 'מרובע' },
  { value: 'rashi', label: 'רש"י' },
])
