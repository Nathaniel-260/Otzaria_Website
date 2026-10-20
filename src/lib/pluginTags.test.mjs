/**
 * בדיקות נרמול, פיצול והצעות של תגיות תוספים (src/lib/pluginTags.js). הרצה: npm run test:node
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  TAG_MAX_LENGTH,
  buildTagSuggestionPool,
  commitTagDraft,
  hasTagSeparator,
  matchTagSuggestions,
  normalizeTag,
  normalizeTagList,
  splitTags
} from './pluginTags.js'

test('normalizeTag: trim וכיווץ רווחים (כולל NBSP וטאב)', () => {
  assert.equal(normalizeTag('  כלי   עזר '), 'כלי עזר')
  assert.equal(normalizeTag('כלי \tעזר'), 'כלי עזר')
})

test('normalizeTag: גרשיים וגרש עבריים → " ו-\'', () => {
  assert.equal(normalizeTag('תנ״ך'), 'תנ"ך')
  assert.equal(normalizeTag('תנ"ך'), 'תנ"ך')
  assert.equal(normalizeTag('ר׳ חיים'), "ר' חיים")
})

test('normalizeTag: סימני כיווניות בלתי נראים מוסרים', () => {
  // התווים נבנים מקוד (ולא כתובים בקוד) — security/detect-bidi-characters
  const [lrm, rlm, rli, pdi] = [0x200e, 0x200f, 0x2067, 0x2069].map((c) => String.fromCharCode(c))
  assert.equal(normalizeTag(`${rlm}מילון${lrm}`), 'מילון')
  assert.equal(normalizeTag(`${rli}API${pdi}`), 'API')
})

test('normalizeTag: לא משנה משמעות — בלי מילון כינויים כברירת מחדל, ובלי שינוי רישיות', () => {
  assert.equal(normalizeTag('תנך'), 'תנך')
  assert.equal(normalizeTag('PDF'), 'PDF')
  assert.equal(normalizeTag('מראה תואם אוצריא'), 'מראה תואם אוצריא')
})

test('normalizeTag: null/undefined → ריק; מספר → מחרוזת', () => {
  assert.equal(normalizeTag(null), '')
  assert.equal(normalizeTag(undefined), '')
  assert.equal(normalizeTag(5), '5')
})

test('normalizeTag: מילון כינויים מוחל אחרי הנרמול (כשיועבר)', () => {
  const aliases = { 'תנך': 'תנ"ך' }
  assert.equal(normalizeTag(' תנך ', { aliases }), 'תנ"ך')
  assert.equal(normalizeTag('מילון', { aliases }), 'מילון')
  // מפתחות של Object.prototype אינם כינויים
  assert.equal(normalizeTag('constructor', { aliases }), 'constructor')
})

test('splitTags: פסיק, פסיק ערבי, נקודה-פסיק וירידת שורה', () => {
  assert.deepEqual(splitTags('א,ב،ג;ד\nה\r\nו'), ['א', 'ב', 'ג', 'ד', 'ה', 'ו'])
  assert.deepEqual(splitTags('א, ב'), ['א', ' ב'])
  assert.deepEqual(splitTags('בלי מפריד'), ['בלי מפריד'])
  assert.equal(hasTagSeparator('א،ב'), true)
  assert.equal(hasTagSeparator('א ב'), false)
})

test('normalizeTagList: התגיות מהשטח — פסיקים בפנים מתפצלים, כתיבים מתאחדים, כפילויות מוסרות', () => {
  assert.deepEqual(
    normalizeTagList(['כלי עזר, גימטריא, גימטריאות', 'תנ״ך', 'תנ"ך', 'כלי עזר']),
    ['כלי עזר', 'גימטריא', 'גימטריאות', 'תנ"ך']
  )
  assert.deepEqual(
    normalizeTagList(['כלי עזר, סימניות, רצף לימוד, לימוד יומי']),
    ['כלי עזר', 'סימניות', 'רצף לימוד', 'לימוד יומי']
  )
})

test('normalizeTagList: ריקים ו-null מושמטים; קלט שאינו מערך → []', () => {
  assert.deepEqual(normalizeTagList(['', '  ', ',,', null, undefined, 'א']), ['א'])
  assert.deepEqual(normalizeTagList(undefined), [])
  assert.deepEqual(normalizeTagList('א,ב'), [])
})

test('commitTagDraft (הקלדה): רק מה שלפני מפריד נהפך לתגית; הקטע שבהקלדה נשאר', () => {
  assert.deepEqual(commitTagDraft([], 'מילו'), { tags: [], draft: 'מילו', tooLong: false })
  assert.deepEqual(commitTagDraft([], 'מילון,'), { tags: ['מילון'], draft: '', tooLong: false })
  assert.deepEqual(commitTagDraft(['א'], 'מילון, חי'), { tags: ['א', 'מילון'], draft: 'חי', tooLong: false })
})

test('commitTagDraft (אישור/הדבקה): כל הקטעים נהפכים לתגיות, בלי כפילויות', () => {
  assert.deepEqual(
    commitTagDraft(['תנ"ך'], 'תנ״ך; כלי עזר\nחיפוש', { final: true }),
    { tags: ['תנ"ך', 'כלי עזר', 'חיפוש'], draft: '', tooLong: false }
  )
  assert.deepEqual(commitTagDraft(['א'], '   ', { final: true }), { tags: ['א'], draft: '', tooLong: false })
})

test('commitTagDraft: תגית ארוכה מדי חוזרת לשדה ומסומנת', () => {
  const long = 'א'.repeat(TAG_MAX_LENGTH + 1)
  assert.deepEqual(
    commitTagDraft([], `${long}, קצר`, { final: true }),
    { tags: ['קצר'], draft: long, tooLong: true }
  )
  assert.deepEqual(
    commitTagDraft([], `${long}, ב`),
    { tags: [], draft: `${long}, ב`, tooLong: true }
  )
})

const POOL_PLUGINS = [
  { tags: ['כלי עזר, גימטריא', 'תנ״ך'] },
  { tags: ['כלי עזר', 'תנ"ך', 'מראה תואם לאוצריא'] },
  { tags: ['כלי עזר', 'תנך', 'תואם אוצריא'] },
  { tags: null }
]

test('buildTagSuggestionPool: מנורמל, מפוצל, לפי שכיחות, בלי תגיות התאמה', () => {
  assert.deepEqual(buildTagSuggestionPool(POOL_PLUGINS), [
    { tag: 'כלי עזר', count: 3 },
    { tag: 'תנ"ך', count: 2 },
    { tag: 'גימטריא', count: 1 },
    { tag: 'תנך', count: 1 }
  ])
  assert.deepEqual(buildTagSuggestionPool(undefined), [])
})

test('matchTagSuggestions: התאמה חלקית בלי גרשיים ורישיות, בלי מה שכבר נבחר, עד limit', () => {
  const pool = buildTagSuggestionPool(POOL_PLUGINS)
  assert.deepEqual(matchTagSuggestions(pool, 'תנך').map((e) => e.tag), ['תנ"ך', 'תנך'])
  assert.deepEqual(matchTagSuggestions(pool, 'תנ״ך').map((e) => e.tag), ['תנ"ך', 'תנך'])
  assert.deepEqual(matchTagSuggestions(pool, 'תנך', ['תנ"ך']).map((e) => e.tag), ['תנך'])
  assert.deepEqual(matchTagSuggestions(pool, 'ע', [], 1).map((e) => e.tag), ['כלי עזר'])
  assert.deepEqual(matchTagSuggestions(pool, '  '), [])
  assert.deepEqual(
    matchTagSuggestions([{ tag: 'PDF', count: 2 }], 'pd'),
    [{ tag: 'PDF', count: 2 }]
  )
})
