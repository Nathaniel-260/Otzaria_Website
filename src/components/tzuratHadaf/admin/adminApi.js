// צורת הדף — קריאות ה-API של מסך הניהול (/api/admin/tzurat-hadaf/**).
// התגובות לפי CONTRACT.md ("צורות התגובה"): JSON, ושגיאה {error, code?} עם סטטוס 4xx/5xx.
// כאן אין `success` כמו בהגהת עמודים — ההצלחה נקבעת לפי res.ok.

export const API = '/api/admin/tzurat-hadaf'

export const NETWORK_ERROR = 'אין חיבור לשרת — בדקו את החיבור ונסו שוב'

const readJson = (res) => (typeof res?.json === 'function' ? res.json().catch(() => null) : Promise.resolve(null))

/**
 * בקשה אחת. מחזיר {ok, status, data, error, code} — לעולם לא זורק.
 * path — יחסי ל-API (למשל 'items?status=disputed') או נתיב מלא שמתחיל ב-/.
 * body — אובייקט (נשלח כ-JSON); method ברירת מחדל GET (או POST כשיש body).
 */
export async function apiCall(path, { method, body, fetchFn } = {}) {
  const f = fetchFn || globalThis.fetch
  const url = path.startsWith('/') ? path : `${API}/${path}`
  const init = { method: method || (body !== undefined ? 'POST' : 'GET'), cache: 'no-store' }
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' }
    init.body = JSON.stringify(body)
  }
  let res
  try {
    res = await f(url, init)
  } catch {
    return { ok: false, status: 0, data: null, error: NETWORK_ERROR, code: null }
  }
  const data = await readJson(res)
  if (!res.ok) {
    return { ok: false, status: res.status, data, error: data?.error || `הפעולה נכשלה (${res.status})`, code: data?.code || null }
  }
  return { ok: true, status: res.status, data, error: null, code: null }
}

/** מחרוזת שאילתה בלי ערכים ריקים (וגם בלי 'all'). */
export function query(params) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params || {})) {
    if (v === undefined || v === null || v === '' || v === 'all') continue
    qs.set(k, String(v))
  }
  const s = qs.toString()
  return s ? `?${s}` : ''
}

const round4 = (v) => Math.round(v * 10000) / 10000

/** מוסיף לכתובת תמונה אזור בשברים (x,y,w,h) — החיתוך נעשה בשרת. */
export function withRegion(url, region) {
  if (!url || !region) return url || ''
  const [base, qs = ''] = String(url).split('?')
  const p = new URLSearchParams(qs)
  for (const k of ['x', 'y', 'w', 'h']) {
    const v = Number(region[k])
    if (Number.isFinite(v)) p.set(k, String(round4(v)))
  }
  return `${base}?${p}`
}

/** כתובת תמונת עמוד (scan|ours), אופציונלית עם אזור. */
export function pageImageUrl(pageId, side, region = null) {
  return withRegion(`/api/tzurat-hadaf/pages/${encodeURIComponent(String(pageId || ''))}/image?side=${side}`, region)
}

/** מספר הדפים: מהשרת (pages / pageSize), ואם אין — לפי גודל הדף הראשון. */
export function pageCount(data, firstSize) {
  if (!data) return 1
  if (Number(data.pages) > 0) return Number(data.pages)
  const size = Number(data.pageSize) || Number(firstSize) || 0
  return size > 0 ? Math.max(1, Math.ceil((Number(data.total) || 0) / size)) : 1
}
