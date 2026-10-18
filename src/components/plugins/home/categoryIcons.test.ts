import { describe, it, expect } from 'vitest'
import { categoriesShowIcons, categoryIcon, DEFAULT_CATEGORY_ICON } from './categoryIcons'

describe('categoriesShowIcons', () => {
  it('false כשלאף קטגוריה אין אייקון (גם רווחים בלבד)', () => {
    expect(categoriesShowIcons([{ icon: '' }, { icon: '  ' }])).toBe(false)
    expect(categoriesShowIcons([])).toBe(false)
  })

  it('true כשלפחות לאחת יש אייקון', () => {
    expect(categoriesShowIcons([{ icon: '' }, { icon: 'menu_book' }])).toBe(true)
  })
})

describe('categoryIcon', () => {
  it('מחזיר את האייקון, או ברירת מחדל כשהוא חסר', () => {
    expect(categoryIcon({ icon: 'menu_book' })).toBe('menu_book')
    expect(categoryIcon({ icon: '' })).toBe(DEFAULT_CATEGORY_ICON)
  })
})
