import { describe, it, expect } from 'vitest'
import { categoriesShowIcons, categoryIcon, validCategoryIcon, DEFAULT_CATEGORY_ICON } from './categoryIcons'
import { hasIconGlyph } from '@/components/ui/iconGlyphs'

describe('validCategoryIcon', () => {
  it('שם שקיים בגופן — מוחזר (גם עם רווחים)', () => {
    expect(validCategoryIcon({ icon: ' menu_book ' })).toBe('menu_book')
  })

  it('ריק, חסר, או שם שאינו בגופן — null (לעולם לא מוצג כמילה)', () => {
    expect(validCategoryIcon({ icon: '' })).toBeNull()
    expect(validCategoryIcon({})).toBeNull()
    expect(hasIconGlyph('translate')).toBe(false)
    expect(validCategoryIcon({ icon: 'translate' })).toBeNull()
  })
})

describe('categoriesShowIcons / categoryIcon', () => {
  it('false כשלאף קטגוריה אין אייקון תקף', () => {
    expect(categoriesShowIcons([{ icon: '' }, { icon: '  ' }, { icon: 'translate' }])).toBe(false)
    expect(categoriesShowIcons([])).toBe(false)
  })

  it('true כשלפחות לאחת יש — והשאר מקבלות את ברירת המחדל', () => {
    expect(categoriesShowIcons([{ icon: '' }, { icon: 'menu_book' }])).toBe(true)
    expect(categoryIcon({ icon: 'menu_book' })).toBe('menu_book')
    expect(categoryIcon({ icon: 'translate' })).toBe(DEFAULT_CATEGORY_ICON)
    expect(hasIconGlyph(DEFAULT_CATEGORY_ICON)).toBe(true)
  })
})
