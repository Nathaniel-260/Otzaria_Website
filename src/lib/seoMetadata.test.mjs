import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  META_DESCRIPTION_MAX,
  toMetaDescription,
  pluginPageMetadata,
  pluginCategoryMetadata
} from './seoMetadata.js'

test('toMetaDescription: קלט ריק/חסר → מחרוזת ריקה', () => {
  assert.equal(toMetaDescription(undefined), '')
  assert.equal(toMetaDescription(null), '')
  assert.equal(toMetaDescription('   \n  '), '')
})

test('toMetaDescription: מנקה רווחים ושורות ולא מקצר טקסט קצר', () => {
  assert.equal(toMetaDescription('  שורה  ראשונה\n\nשנייה '), 'שורה ראשונה שנייה')
})

test('toMetaDescription: מקצר בגבול מילה ומוסיף …', () => {
  const words = Array.from({ length: 60 }, (_, i) => `מילה${i}`).join(' ')
  const out = toMetaDescription(words)
  assert.ok(out.length <= META_DESCRIPTION_MAX)
  assert.ok(out.endsWith('…'))
  // לא נחתך באמצע מילה: מה שלפני ה-… הוא רצף מילים שלמות מהמקור
  assert.ok(words.startsWith(out.slice(0, -1)))
  assert.ok(words.charAt(out.length - 1) === ' ')
})

test('toMetaDescription: מילה אחת ארוכה מאוד נחתכת באמצע', () => {
  const out = toMetaDescription('א'.repeat(400))
  assert.equal(out.length, META_DESCRIPTION_MAX)
  assert.ok(out.endsWith('…'))
})

test('toMetaDescription: לא חוצה אמוג\'י או ניקוד בגבול החיתוך', () => {
  // 153 אותיות ואז אמוג'י (2 יחידות UTF-16) בדיוק על הגבול
  const emoji = toMetaDescription(`${'א'.repeat(153)}😀${'ב'.repeat(50)}`)
  assert.ok(!/[\uD800-\uDBFF]…$/.test(emoji), 'אין חצי אמוג\'י לפני ה-…')
  assert.ok(emoji.includes('😀'))

  // אות מנוקדת = גרפמה אחת: הניקוד לא נחתך מהאות
  const pointed = toMetaDescription('בָּ'.repeat(200))
  assert.ok(pointed.endsWith('בָּ…'))
})

test('toMetaDescription: מסיר מקף עברי בסוף לפני ה-…', () => {
  const text = `${'מילה '.repeat(28)}בית־ ${'א'.repeat(40)}`
  const out = toMetaDescription(text, 147)
  assert.ok(out.endsWith('בית…'))
  assert.ok(!out.includes('־…'))
})

test('pluginPageMetadata: שם + תיאור קצר', () => {
  assert.deepEqual(
    pluginPageMetadata({ name: 'מרקר', shortDescription: 'סימון טקסט בצבעים', description: 'ארוך' }),
    { title: 'מרקר – תוסף לאוצריא', description: 'סימון טקסט בצבעים' }
  )
})

test('pluginPageMetadata: נפילה לתיאור המלא ואז לברירת מחדל', () => {
  assert.equal(pluginPageMetadata({ name: 'א', description: 'תיאור מלא' }).description, 'תיאור מלא')
  assert.equal(pluginPageMetadata({ name: 'א' }).description, 'א – תוסף לתוכנת אוצריא.')
  assert.deepEqual(pluginPageMetadata(null), { title: 'תוסף לאוצריא', description: 'תוסף לתוכנת אוצריא.' })
})

test('pluginCategoryMetadata: עם ובלי תיאור', () => {
  assert.deepEqual(pluginCategoryMetadata({ name: 'לימוד', description: 'כלים ללומד' }), {
    title: 'לימוד | חנות התוספים של אוצריא',
    description: 'כלים ללומד'
  })
  assert.equal(pluginCategoryMetadata({ name: 'לימוד' }).description, 'תוספים לתוכנת אוצריא בקטגוריה: לימוד.')
})
