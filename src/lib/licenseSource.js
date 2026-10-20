// מקור יחיד לטקסט רישיון התוכנה (otzaria/otzaria) — משותף ל-/license (דף שרת) ול-/api/license.
//
// מוצמד בכוונה ל-commit SHA ולא לענף נע: ענף dev הוא ענף פיתוח ופתוח לשינויים, ותוכן שנשלף
// ממנו מוצג באתר כ"תנאי הרישיון" — לא נרצה שדחיפה לא מבוקרת אליו תופיע אצלנו אוטומטית.
// הרישיון החדש (Personal Use License 1.0) קיים כרגע רק ב-dev; ב-main עדיין יש GPL.
// איך מעדכנים: `gh api repos/Otzaria/otzaria/commits/dev --jq .sha`, לוודא ש-LICENSE קיים
// באותו commit ושהתוכן הוא Personal Use License, ולהחליף את LICENSE_COMMIT_SHA כאן.
// TODO: אחרי שהרישיון החדש ימוזג ל-main — להחליף את ההצמדה לענף main (או ל-SHA שלו),
// ולעדכן את קישורי ה-GitHub ב-src/app/license/page.jsx (LICENSE_BLOB_URL).
export const LICENSE_COMMIT_SHA = '4855cf08c221adec31782ab75afc04d4b6614e24'

export const LICENSE_RAW_URL = `https://raw.githubusercontent.com/Otzaria/otzaria/${LICENSE_COMMIT_SHA}/LICENSE`
export const LICENSE_BLOB_URL = `https://github.com/Otzaria/otzaria/blob/${LICENSE_COMMIT_SHA}/LICENSE`

export const LICENSE_FETCH_TIMEOUT_MS = 5000
export const LICENSE_MAX_LENGTH = 200000
export const LICENSE_REVALIDATE_SECONDS = 3600

/** בדיקת שפיות לתוכן שנשלף: מחרוזת סבירה באורכה, מכילה "Personal Use License" ואינה HTML. */
export function isValidLicenseText(text) {
  if (typeof text !== 'string') return false
  if (text.length === 0 || text.length > LICENSE_MAX_LENGTH) return false
  if (!text.includes('Personal Use License')) return false
  if (/^\s*<(!doctype|html|head|body)\b/i.test(text)) return false
  return true
}

/** שולף ומאמת את טקסט הרישיון. זורק שגיאה בכל כשל (רשת, timeout, סטטוס, תוכן לא תקין). */
export async function fetchLicenseText() {
  const res = await fetch(LICENSE_RAW_URL, {
    next: { revalidate: LICENSE_REVALIDATE_SECONDS },
    signal: AbortSignal.timeout(LICENSE_FETCH_TIMEOUT_MS),
  })
  if (!res.ok) {
    throw new Error(`Failed to fetch license from GitHub (${res.status})`)
  }
  const text = await res.text()
  if (!isValidLicenseText(text)) {
    throw new Error('License content failed sanity check')
  }
  return text
}
