// תגיות של תוספים בחנות — נרמול, פיצול והצעות. מודול טהור (בלי I/O ובלי תלות ב-Node), משותף
// ללקוח (שדה התגיות בטופס ההעלאה ובחלון העריכה, src/components/plugins/form/TagInput.tsx) ולשרת
// (normalizeTags ב-pluginSubmission.js, שדרכו עוברים /api/plugins/upload ו-/api/admin/plugins/[id]/edit,
// וגם /api/plugins/[id]/edit שמאציל אליו). טסטים: pluginTags.test.mjs.
//
// הנרמול עדין בכוונה — לא משנה משמעות:
//   - רווחים: trim, וכל רצף רווחים (כולל NBSP וטאב) → רווח אחד.
//   - סימני כיווניות בלתי נראים (LRM/RLM, הטבעות ובידודי bidi, BOM) — מוסרים. הם לא נראים, אבל
//     יוצרים "שתי תגיות" שנראות זהות.
//   - גרשיים: ״ (U+05F4) → " , וגרש ׳ (U+05F3) → ' . כך "תנ״ך" ו-"תנ"ך" הן אותה תגית.
//   - NFC — אותו טקסט בניקוד/צירוף שונה נשמר באותו רצף תווים.
// אין כאן מילון כינויים (תנך → תנ"ך וכו') — זו החלטה נפרדת. כשתתקבל: להעביר { aliases } לפונקציות
// (או להגדיר אותו כברירת מחדל ב-TAG_ALIASES למטה) — normalizeTag מחיל אותו אחרי הנרמול הבסיסי.
import { isCompatibilityTag, rankTags } from './pluginFilter.js'

/** אורך מרבי של תגית אחת (זהה ל-PLUGIN_LIMITS.tag ב-pluginSubmission.js, שאינו בטוח-ללקוח) */
export const TAG_MAX_LENGTH = 40
/** מספר התגיות המרבי לתוסף (השרת חותך מעבר לזה) */
export const TAG_MAX_COUNT = 30

/**
 * מילון כינויים: כתיב → כתיב קנוני (שניהם אחרי נרמול). ריק בכוונה — טרם אושר.
 * @type {Readonly<Record<string, string>>}
 */
export const TAG_ALIASES = Object.freeze({})

// מפרידים בין תגיות: פסיק, פסיק ערבי (U+060C), נקודה-פסיק וירידת שורה
const SEPARATOR_RE = /[,،;\r\n]/
const SEPARATORS_RE = /[,،;\r\n]+/
// LRM, RLM, ALM, הטבעות bidi (U+202A–U+202E), בידודי bidi (U+2066–U+2069), BOM.
// דרך RegExp ממחרוזת (ולא ליטרל) — אחרת security/detect-bidi-characters מזהה את התווים עצמם בקוד.
const INVISIBLE_RE = new RegExp('[\u200E\u200F\u061C\u202A-\u202E\u2066-\u2069\uFEFF]', 'g')
const GERSHAYIM_RE = /״/g
const GERESH_RE = /׳/g
const WHITESPACE_RE = /\s+/g

/** האם הטקסט מכיל מפריד תגיות (ואז צריך לפצל אותו) */
export function hasTagSeparator(text) {
  return SEPARATOR_RE.test(String(text ?? ''))
}

/**
 * נרמול תגית אחת. מחזיר מחרוזת (ריקה אם לא נשאר בה כלום). לא מפצל — ראו normalizeTagList.
 * @param {unknown} raw
 * @param {{ aliases?: Record<string, string> }} [options]
 */
export function normalizeTag(raw, { aliases = TAG_ALIASES } = {}) {
  if (raw === null || raw === undefined) return ''
  const tag = String(raw)
    .normalize('NFC')
    .replace(INVISIBLE_RE, '')
    .replace(GERSHAYIM_RE, '"')
    .replace(GERESH_RE, "'")
    .replace(WHITESPACE_RE, ' ')
    .trim()
  return Object.hasOwn(aliases, tag) ? aliases[tag] : tag
}

/** פיצול טקסט לפי המפרידים. מחזיר את הקטעים כמו שהם (בלי נרמול; כולל קטעים ריקים) */
export function splitTags(text) {
  return String(text ?? '').split(SEPARATORS_RE)
}

/**
 * רשימת תגיות נקייה: כל פריט מפוצל לפי המפרידים, כל קטע מנורמל, ריקים מושמטים, וכפילויות
 * (אחרי הנרמול) מוסרות — המופע הראשון נשאר, בסדר המקורי. null/undefined ברשימה מושמטים.
 * @param {unknown[]} rawTags
 * @param {{ aliases?: Record<string, string> }} [options]
 * @returns {string[]}
 */
export function normalizeTagList(rawTags, options = {}) {
  const seen = new Set()
  const result = []
  for (const raw of Array.isArray(rawTags) ? rawTags : []) {
    if (raw === null || raw === undefined) continue
    for (const part of splitTags(raw)) {
      const tag = normalizeTag(part, options)
      if (!tag || seen.has(tag)) continue
      seen.add(tag)
      result.push(tag)
    }
  }
  return result
}

/**
 * מה שקורה בשדה התגיות כשהטקסט בו משתנה (הקלדה/הדבקה) או כשמאשרים אותו (Enter / "הוסף").
 * - final=false (הקלדה): רק קטעים שאחריהם בא מפריד נהפכים לתגיות; הקטע האחרון — עדיין בהקלדה —
 *   נשאר בשדה כמו שהוא.
 * - final=true (אישור/הדבקה): כל הקטעים נהפכים לתגיות.
 * תגית ארוכה מ-maxLength לא נוספת: היא חוזרת לשדה (כדי שאפשר יהיה לקצר אותה) ומסומנת ב-tooLong.
 * @param {string[]} tags  התגיות שכבר נבחרו
 * @param {string} draft   הטקסט בשדה
 * @returns {{ tags: string[], draft: string, tooLong: boolean }}
 */
export function commitTagDraft(tags, draft, { final = false, maxLength = TAG_MAX_LENGTH, aliases } = {}) {
  const parts = splitTags(draft)
  const pending = final ? '' : parts.pop() ?? ''
  const next = [...tags]
  const rejected = []
  for (const part of parts) {
    const tag = normalizeTag(part, { aliases })
    if (!tag) continue
    if (tag.length > maxLength) {
      rejected.push(tag)
      continue
    }
    if (!next.includes(tag)) next.push(tag)
  }
  // הקטע שבהקלדה נשאר כמו שהוא, רק בלי רווח בתחילתו (", " אחרי תגית)
  const rest = [...rejected, pending.trimStart()].filter(Boolean)
  return { tags: next, draft: rest.join(', '), tooLong: rejected.length > 0 }
}

// מפתח השוואה להצעות: בלי גרשיים ובלי תלות ברישיות — כך "תנך" מוצא את "תנ"ך"
function matchKey(text) {
  return normalizeTag(text).replace(/["']/g, '').toLowerCase()
}

/**
 * מאגר ההצעות מתוך רשימת התוספים הציבוריים: התגיות של כל תוסף מנורמלות (כך שכתיבים שונים
 * מתאחדים, ותגית שנשמרה עם פסיקים מתפצלת), ואז מדורגות לפי שכיחות (rankTags מ-pluginFilter).
 * תגיות התאמה ("מראה תואם לאוצריא" וגרסאותיה, isCompatibilityTag) אינן מוצעות: התגית הרשמית
 * נקבעת אוטומטית לפי בדיקת העיצוב, ואת הגרסאות הידניות לא רוצים להפיץ.
 * @param {{ tags?: unknown[] }[]} plugins
 * @returns {{ tag: string, count: number }[]}
 */
export function buildTagSuggestionPool(plugins, options = {}) {
  const normalized = (Array.isArray(plugins) ? plugins : []).map((plugin) => ({
    tags: normalizeTagList(plugin?.tags || [], options)
  }))
  return rankTags(normalized).filter((entry) => !isCompatibilityTag(entry.tag))
}

/**
 * ההצעות לטקסט שבשדה: תגיות מהמאגר שמכילות אותו (בלי גרשיים ובלי רישיות), חוץ מאלה שכבר נבחרו.
 * הסדר — סדר המאגר (שכיחות). שאילתה ריקה — אין הצעות.
 * @param {{ tag: string, count: number }[]} pool
 * @param {string} query
 * @param {string[]} [selected]
 * @param {number} [limit]
 */
export function matchTagSuggestions(pool, query, selected = [], limit = 8) {
  const q = matchKey(query)
  if (!q) return []
  const taken = new Set(selected)
  const result = []
  for (const entry of pool) {
    if (taken.has(entry.tag) || !matchKey(entry.tag).includes(q)) continue
    result.push(entry)
    if (result.length >= limit) break
  }
  return result
}
