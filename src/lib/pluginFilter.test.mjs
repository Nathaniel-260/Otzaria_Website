/**
 * בדיקות סינון מקומי של רשימת "כל התוספים" (src/app/plugins/all). הרצה: npm test
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { filterPlugins, extractSortedTags, countTags, rankTags, popularTags, searchTags, isCompatibilityTag } from './pluginFilter.js'

function plugin(overrides = {}) {
  return {
    name: 'תוסף לדוגמה',
    shortDescription: 'תיאור קצר',
    description: 'תיאור מלא',
    status: 'stable',
    tags: [],
    ...overrides
  }
}

test('filterPlugins ללא סינון מחזיר את כל הרשימה כמו-שהיא', () => {
  const plugins = [plugin({ name: 'א' }), plugin({ name: 'ב' })]
  assert.deepEqual(filterPlugins(plugins), plugins)
  assert.deepEqual(filterPlugins(plugins, {}), plugins)
})

test('filterPlugins מסנן לפי חיפוש בשם, בתיאורים ובתגיות (case-insensitive)', () => {
  const plugins = [
    plugin({ name: 'ניקוד קולי' }),
    plugin({ name: 'אחר', shortDescription: 'תמיכה בניקוד' }),
    plugin({ name: 'אחר2', description: 'כולל ניקוד מלא' }),
    plugin({ name: 'אחר3', tags: ['Niqqud'] }),
    plugin({ name: 'לא רלוונטי' })
  ]
  const result = filterPlugins(plugins, { searchQuery: 'ניקוד' })
  assert.equal(result.length, 3)

  const byTag = filterPlugins(plugins, { searchQuery: 'niqqud' })
  assert.equal(byTag.length, 1)
  assert.equal(byTag[0].name, 'אחר3')
})

test('filterPlugins מסנן לפי סטטוס מדויק', () => {
  const plugins = [
    plugin({ name: 'א', status: 'stable' }),
    plugin({ name: 'ב', status: 'beta' }),
    plugin({ name: 'ג', status: 'experimental' })
  ]
  const result = filterPlugins(plugins, { statusFilter: 'beta' })
  assert.equal(result.length, 1)
  assert.equal(result[0].name, 'ב')
})

test('filterPlugins מסנן לפי תגית מדויקת (לא substring)', () => {
  const plugins = [
    plugin({ name: 'א', tags: ['לימוד'] }),
    plugin({ name: 'ב', tags: ['לימוד-מתקדם'] }),
    plugin({ name: 'ג', tags: [] })
  ]
  const result = filterPlugins(plugins, { activeTag: 'לימוד' })
  assert.equal(result.length, 1)
  assert.equal(result[0].name, 'א')
})

test('filterPlugins משלב את כל התנאים כ-AND', () => {
  const plugins = [
    plugin({ name: 'תוסף חיפוש', status: 'beta', tags: ['חיפוש'] }),
    plugin({ name: 'תוסף חיפוש', status: 'stable', tags: ['חיפוש'] }),
    plugin({ name: 'תוסף חיפוש', status: 'beta', tags: ['אחר'] })
  ]
  const result = filterPlugins(plugins, { searchQuery: 'חיפוש', statusFilter: 'beta', activeTag: 'חיפוש' })
  assert.equal(result.length, 1)
})

test('filterPlugins סובלני לתוסף בלי שדה tags', () => {
  const plugins = [plugin({ name: 'א', tags: undefined })]
  assert.deepEqual(filterPlugins(plugins, { searchQuery: 'א' }), plugins)
  assert.deepEqual(filterPlugins(plugins, { activeTag: 'all' }), plugins)
  assert.deepEqual(filterPlugins(plugins, { activeTag: 'משהו' }), [])
})

test('extractSortedTags מאחד תגיות כפולות וממיין א"ב עברי', () => {
  const plugins = [
    plugin({ tags: ['ב', 'א'] }),
    plugin({ tags: ['א', 'ג'] })
  ]
  assert.deepEqual(extractSortedTags(plugins), ['א', 'ב', 'ג'])
})

test('extractSortedTags מחזיר מערך ריק כשאין תגיות', () => {
  assert.deepEqual(extractSortedTags([plugin(), plugin()]), [])
})

test('countTags סופר תוספים לכל תגית (כפילות באותו תוסף — פעם אחת)', () => {
  const counts = countTags([plugin({ tags: ['א', 'ב', 'א'] }), plugin({ tags: ['א'] }), plugin({ tags: undefined })])
  assert.equal(counts.get('א'), 2)
  assert.equal(counts.get('ב'), 1)
  assert.equal(counts.size, 2)
})

test('rankTags ממיין לפי שכיחות, ובשוויון לפי א"ב', () => {
  const ranked = rankTags([plugin({ tags: ['ת', 'ב'] }), plugin({ tags: ['ת', 'א'] })])
  assert.deepEqual(ranked, [{ tag: 'ת', count: 2 }, { tag: 'א', count: 1 }, { tag: 'ב', count: 1 }])
})

test('popularTags: N הראשונות; תגית פעילה מחוץ להן נוספת ראשונה', () => {
  const ranked = [{ tag: 'א', count: 3 }, { tag: 'ב', count: 2 }, { tag: 'ג', count: 1 }]
  assert.deepEqual(popularTags(ranked, 'all', 2).map(t => t.tag), ['א', 'ב'])
  assert.deepEqual(popularTags(ranked, 'ב', 2).map(t => t.tag), ['א', 'ב'])
  assert.deepEqual(popularTags(ranked, 'ג', 2).map(t => t.tag), ['ג', 'א', 'ב'])
  // תגית שלא קיימת (קישור ישן) — עדיין גלויה, עם 0
  assert.deepEqual(popularTags(ranked, 'ז', 1), [{ tag: 'ז', count: 0 }, { tag: 'א', count: 3 }])
})

test('searchTags: התאמה חלקית בלי רישיות; שאילתה ריקה מחזירה הכל', () => {
  const tags = [{ tag: 'English', count: 1 }, { tag: 'כלי עזר', count: 2 }]
  assert.deepEqual(searchTags(tags, '  eng '), [tags[0]])
  assert.deepEqual(searchTags(tags, 'עזר'), [tags[1]])
  assert.equal(searchTags(tags, ''), tags)
})

test('isCompatibilityTag: תגית ההתאמה הרשמית והווריאציות שלה בנתונים, לא תגיות נושא', () => {
  for (const tag of ['מראה תואם לאוצריא', 'עיצוב תואם לאוצריא', 'מראה תואם אוצריא', 'תואם אוצריא']) {
    assert.equal(isCompatibilityTag(tag), true, tag)
  }
  for (const tag of ['אוצריא', 'כלי עזר', 'תוכנת אוצריא', '', undefined]) {
    assert.equal(isCompatibilityTag(tag), false, String(tag))
  }
})

test('rankTags: תגיות התאמה בסוף; popularTags לא כולל אותן, אלא אם נבחרו', () => {
  const ranked = rankTags([
    plugin({ tags: ['מראה תואם לאוצריא', 'כלי עזר'] }),
    plugin({ tags: ['מראה תואם לאוצריא', 'תואם אוצריא'] }),
    plugin({ tags: ['מראה תואם לאוצריא', 'לימוד'] })
  ])
  assert.deepEqual(ranked.map(t => t.tag), ['כלי עזר', 'לימוד', 'מראה תואם לאוצריא', 'תואם אוצריא'])
  assert.deepEqual(popularTags(ranked).map(t => t.tag), ['כלי עזר', 'לימוד'])
  assert.deepEqual(popularTags(ranked, 'מראה תואם לאוצריא').map(t => t.tag), ['מראה תואם לאוצריא', 'כלי עזר', 'לימוד'])
})
