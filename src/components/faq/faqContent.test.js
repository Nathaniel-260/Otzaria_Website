import { describe, expect, it } from 'vitest'
import { categories, faqs } from '@/lib/faq-data'
import {
  ALL_CATEGORY,
  FAQ_LINK_TOKEN,
  categoryHeadingId,
  faqAnchorId,
  faqAnswerText,
  findFaqByHash,
  groupFaqs,
  isInternalHref,
  splitAnswerLink,
  splitLatinRuns
} from './faqContent.js'

describe('groupFaqs', () => {
  it('"הכל": כל הקטגוריות לפי הסדר (בלי "הכל"), וכל שאלה מופיעה פעם אחת בסדר המקורי', () => {
    const groups = groupFaqs(faqs, categories, ALL_CATEGORY)
    expect(groups.map((g) => g.category.id)).toEqual(categories.filter((c) => c.id !== 'all').map((c) => c.id))
    const ids = groups.flatMap((g) => g.items.map((f) => f.id))
    expect(ids).toHaveLength(faqs.length)
    expect(new Set(ids).size).toBe(faqs.length)
    for (const group of groups) {
      expect(group.items.every((f) => f.category === group.category.id)).toBe(true)
    }
  })

  it('קטגוריה אחת: רק היא', () => {
    const groups = groupFaqs(faqs, categories, 'search')
    expect(groups).toHaveLength(1)
    expect(groups[0].category.id).toBe('search')
    expect(groups[0].items.map((f) => f.id)).toEqual(faqs.filter((f) => f.category === 'search').map((f) => f.id))
  })

  it('קטגוריה בלי שאלות לא מוחזרת', () => {
    const cats = [{ id: 'all', label: 'הכל' }, { id: 'a', label: 'א' }, { id: 'b', label: 'ב' }]
    const groups = groupFaqs([{ id: 1, category: 'b', question: 'ש', answer: 'ת' }], cats)
    expect(groups.map((g) => g.category.id)).toEqual(['b'])
  })
})

describe('עוגנים', () => {
  it('faqAnchorId / categoryHeadingId', () => {
    expect(faqAnchorId(7)).toBe('faq-7')
    expect(categoryHeadingId('usage')).toBe('faq-category-usage')
  })

  it('findFaqByHash: עם # ובלי, ורק שאלה קיימת', () => {
    expect(findFaqByHash('#faq-7', faqs)?.id).toBe(7)
    expect(findFaqByHash('faq-1', faqs)?.id).toBe(1)
    expect(findFaqByHash('#faq-999', faqs)).toBeNull()
    expect(findFaqByHash('#faq-category-usage', faqs)).toBeNull()
    expect(findFaqByHash('', faqs)).toBeNull()
    expect(findFaqByHash(undefined, faqs)).toBeNull()
  })

  it('לכל שאלה במקור id ייחודי', () => {
    expect(new Set(faqs.map((f) => f.id)).size).toBe(faqs.length)
  })
})

describe('splitLatinRuns', () => {
  const join = (parts) => parts.map((p) => p.text).join('')

  it('הטקסט המחובר זהה למקור — בכל שאלה ותשובה', () => {
    for (const faq of faqs) {
      expect(join(splitLatinRuns(faq.question))).toBe(faq.question)
      expect(join(splitLatinRuns(faq.answer))).toBe(faq.answer)
    }
  })

  it('מונח בסוגריים: רק המונח מבודד, הסוגריים וסימן השאלה נשארים בעברית', () => {
    expect(splitLatinRuns('האם יש גרסת אינטרנט (Web)?')).toEqual([
      { text: 'האם יש גרסת אינטרנט (', ltr: false },
      { text: 'Web', ltr: true },
      { text: ')?', ltr: false }
    ])
  })

  it('כמה מילים לועזיות ברצף — קטע אחד', () => {
    const ltr = (s) => splitLatinRuns(s).filter((p) => p.ltr).map((p) => p.text)
    expect(ltr('כיצד מורידים על iPhone / iPad?')).toEqual(['iPhone / iPad'])
    expect(ltr('שה-Visual C++ Redistributable מותקן')).toEqual(['Visual C++ Redistributable'])
    expect(ltr('הנדרשות:\nsudo apt-get install libgtk-3-0 libblkid1 liblzma5\nלאחר')).toEqual([
      'sudo apt-get install libgtk-3-0 libblkid1 liblzma5'
    ])
  })

  it('נקודה שמסיימת את המשפט לא נבלעת במונח', () => {
    expect(splitLatinRuns('להריץ את run-otzaria.sh.')).toEqual([
      { text: 'להריץ את ', ltr: false },
      { text: 'run-otzaria.sh', ltr: true },
      { text: '.', ltr: false }
    ])
  })

  it('מונחים מופרדים בפסיק — קטעים נפרדים', () => {
    expect(splitLatinRuns('TXT, DOCX ו-PDF').filter((p) => p.ltr).map((p) => p.text)).toEqual(['TXT', 'DOCX', 'PDF'])
  })

  it('טקסט עברי בלבד / ריק', () => {
    expect(splitLatinRuns('שלום')).toEqual([{ text: 'שלום', ltr: false }])
    expect(splitLatinRuns('')).toEqual([])
  })
})

describe('קישור בתשובה', () => {
  const link = { href: '/#download', label: 'בדף ההורדה' }

  it('splitAnswerLink: הטוקן הופך לקטע קישור, הטקסט שסביבו נשמר', () => {
    expect(splitAnswerLink('המסייע נמצא {link}. הפעל אותו.', link)).toEqual([
      { type: 'text', text: 'המסייע נמצא ' },
      { type: 'link', href: '/#download', label: 'בדף ההורדה' },
      { type: 'text', text: '. הפעל אותו.' }
    ])
  })

  it('בלי טוקן — טקסט אחד; טוקן בקצה — בלי קטעים ריקים', () => {
    expect(splitAnswerLink('שלום', link)).toEqual([{ type: 'text', text: 'שלום' }])
    expect(splitAnswerLink('{link}', link)).toEqual([{ type: 'link', href: '/#download', label: 'בדף ההורדה' }])
    expect(splitAnswerLink('', link)).toEqual([])
  })

  it('קישור חסר או חיצוני — הטוקן מוחלף בנוסח כטקסט, ולא מוצג גולמי', () => {
    expect(splitAnswerLink('ראה {link}.', { href: 'https://evil.example', label: 'כאן' })).toEqual([{ type: 'text', text: 'ראה כאן.' }])
    expect(splitAnswerLink('ראה {link}.', { href: '//evil.example', label: 'כאן' })).toEqual([{ type: 'text', text: 'ראה כאן.' }])
    expect(splitAnswerLink('ראה {link}.', undefined)).toEqual([{ type: 'text', text: 'ראה .' }])
  })

  it('isInternalHref: רק נתיב פנימי', () => {
    expect(isInternalHref('/#download')).toBe(true)
    expect(isInternalHref('/offline')).toBe(true)
    expect(isInternalHref('//host')).toBe(false)
    expect(isInternalHref('/\\host')).toBe(false)
    expect(isInternalHref('https://otzaria.org')).toBe(false)
    expect(isInternalHref('javascript:alert(1)')).toBe(false)
    expect(isInternalHref(undefined)).toBe(false)
  })

  it('faqAnswerText: הטקסט שהקורא רואה', () => {
    expect(faqAnswerText({ answer: 'המסייע נמצא {link}.', link })).toBe('המסייע נמצא בדף ההורדה.')
    expect(faqAnswerText({ answer: 'בלי קישור' })).toBe('בלי קישור')
  })

  it('בנתונים: כל טוקן מלווה בקישור פנימי, וכל קישור — בטוקן אחד בדיוק', () => {
    for (const faq of faqs) {
      const tokens = faq.answer.split(FAQ_LINK_TOKEN).length - 1
      if (faq.link) {
        expect(tokens, `faq ${faq.id}`).toBe(1)
        expect(isInternalHref(faq.link.href), `faq ${faq.id}`).toBe(true)
        expect(faq.link.label.trim(), `faq ${faq.id}`).not.toBe('')
      } else {
        expect(tokens, `faq ${faq.id}`).toBe(0)
      }
    }
  })

  it('תשובות ההתקנה מפנות לאזור ההורדה בדף הבית, ושום תשובה לא מזכירה "דף ההורדות" בלי קישור', () => {
    for (const id of [3, 7, 8, 9, 10, 11]) {
      expect(faqs.find((f) => f.id === id).link?.href).toBe('/#download')
    }
    for (const faq of faqs) {
      if (!faq.link) expect(faq.answer).not.toMatch(/דף ההורד/)
    }
  })
})
