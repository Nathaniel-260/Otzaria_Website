import { describe, it, expect } from 'vitest'
import { fieldA11yProps, fieldClasses, fieldIconClasses } from './fieldStyles'

describe('fieldClasses', () => {
  it('טוקני --field-* ומסגרת פוקוס primary', () => {
    const cls = fieldClasses()
    expect(cls).toContain('border-(--field-border)')
    expect(cls).toContain('bg-(--field-bg)')
    expect(cls).toContain('focus:border-(--field-border-focus)')
    expect(cls).toContain('min-h-(--field-height-md)')
    expect(cls).toContain('ps-4')
  })

  it('גודל lg עם אייקון — ריפוד התחלה גדול; trailing — ריפוד סוף גדול', () => {
    expect(fieldClasses({ size: 'lg', withIcon: true })).toContain('ps-13')
    expect(fieldClasses({ size: 'lg', withIcon: true })).toContain('min-h-(--field-height-lg)')
    expect(fieldClasses({ trailing: true })).toContain('pe-11')
  })

  it('שדה שגוי — מסגרת error במקום מסגרת רגילה; textarea גבוה; select עם סמן יד', () => {
    const invalid = fieldClasses({ invalid: true, kind: 'textarea' })
    expect(invalid).toContain('border-error')
    expect(invalid).not.toContain('border-(--field-border)')
    expect(invalid).toContain('min-h-40')
    expect(fieldClasses({ kind: 'select' })).toContain('cursor-pointer')
  })
})

describe('fieldIconClasses', () => {
  it('מיקום לוגי (start/end), לא left/right', () => {
    expect(fieldIconClasses('md', 'start')).toContain('start-3.5')
    expect(fieldIconClasses('lg', 'end')).toContain('end-4')
    expect(fieldIconClasses()).not.toMatch(/\b(left|right)-/)
  })
})

describe('fieldA11yProps', () => {
  it('בלי הסבר ושגיאה — רק id', () => {
    expect(fieldA11yProps('f')).toEqual({ id: 'f', 'aria-required': undefined, 'aria-invalid': undefined, 'aria-describedby': undefined })
  })

  it('חובה, הסבר ושגיאה — aria-required, aria-invalid ושני המזהים', () => {
    expect(fieldA11yProps('f', { required: true, hint: true, error: 'שגוי' })).toEqual({
      id: 'f', 'aria-required': true, 'aria-invalid': true, 'aria-describedby': 'f-hint f-error'
    })
  })
})
