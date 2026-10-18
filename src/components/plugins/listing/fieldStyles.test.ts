import { describe, it, expect } from 'vitest'
import { fieldClasses, fieldIconClasses } from './fieldStyles'

describe('fieldClasses', () => {
  it('טוקני --field-* ומסגרת פוקוס primary', () => {
    const cls = fieldClasses()
    expect(cls).toContain('border-(--field-border)')
    expect(cls).toContain('focus:border-(--field-border-focus)')
    expect(cls).toContain('min-h-(--field-height-md)')
  })

  it('גודל lg עם אייקון — ריפוד התחלה גדול; trailing — ריפוד סוף גדול', () => {
    expect(fieldClasses({ size: 'lg', withIcon: true })).toContain('ps-13')
    expect(fieldClasses({ size: 'lg', withIcon: true })).toContain('min-h-(--field-height-lg)')
    expect(fieldClasses({ trailing: true })).toContain('pe-11')
    expect(fieldClasses()).toContain('ps-4')
  })

  it('מיקום האייקון לוגי (start/end), לא left/right', () => {
    expect(fieldIconClasses('md', 'start')).toContain('start-3.5')
    expect(fieldIconClasses('lg', 'end')).toContain('end-4')
    expect(fieldIconClasses()).not.toMatch(/\b(left|right)-/)
  })
})
