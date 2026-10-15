// לוגיקה טהורה של אזור ההורדה ב-/offline (בלי React/DOM) — נבדקת ב-offlinePlatforms.test.mjs.

/** המערכות שהכלי זמין להן, בסדר ברירת המחדל (כשלא זוהתה מערכת) */
export const OFFLINE_PLATFORM_KEYS = ['windows', 'macos']

/**
 * זיהוי המערכת של המבקר מתוך navigator.userAgent / navigator.platform.
 * מחזיר 'windows' | 'macos' — מחשב שהכלי זמין לו; 'mobile' — טלפון/טאבלט (הכלי למחשב בלבד);
 * 'other' — מחשב אחר (Linux וכו'); null — לא ידוע.
 * iPadOS מתחזה ל-Mac ב-userAgent — מזוהה לפי maxTouchPoints.
 */
export function detectOfflinePlatform({ userAgent = '', platform = '', maxTouchPoints = 0 } = {}) {
  const ua = userAgent.toLowerCase()
  const pf = platform.toLowerCase()
  if (/android|iphone|ipad|ipod/.test(ua)) return 'mobile'
  if (/mac/.test(pf) || /macintosh/.test(ua)) return maxTouchPoints > 1 ? 'mobile' : 'macos'
  if (/win/.test(pf) || /windows/.test(ua)) return 'windows'
  if (/linux|cros|x11/.test(pf) || /linux|cros|x11/.test(ua)) return 'other'
  return null
}

/** סדר הכרטיסים: המערכת שזוהתה ראשונה, השאר אחריה */
export function orderOfflinePlatforms(detected) {
  if (!OFFLINE_PLATFORM_KEYS.includes(detected)) return [...OFFLINE_PLATFORM_KEYS]
  return [detected, ...OFFLINE_PLATFORM_KEYS.filter((key) => key !== detected)]
}

/** גודל קובץ לתצוגה: "18.7 MB" (מ-100MB — בלי ספרה אחרי הנקודה); null כשאין גודל */
export function formatSize(bytes) {
  if (!bytes || bytes < 0) return null
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`
}

// אזור זמן קבוע: אחרת השרת (UTC) והדפדפן (ירושלים) עלולים להציג יום שונה — ואי-התאמת hydration
const RELEASE_DATE_FORMAT = new Intl.DateTimeFormat('he-IL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Jerusalem'
})

/** תאריך הפרסום של הגרסה: "12 באוקטובר 2026"; null כשהתאריך חסר או שגוי */
export function formatReleaseDate(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return RELEASE_DATE_FORMAT.format(date)
}
