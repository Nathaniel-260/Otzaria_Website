import { describe, it, expect } from 'vitest'
import { fieldA11yProps, fieldClasses } from './fieldStyles'

describe('fieldClasses', () => {
  it('טוקני --field-* ומסגרת פוקוס primary', () => {
    const classes = fieldClasses()
    expect(classes).toContain('border-(--field-border)')
    expect(classes).toContain('bg-(--field-bg)')
    expect(classes).toContain('focus:border-(--field-border-focus)')
    expect(classes).toContain('min-h-(--field-height-md)')
  })

  it('שדה שגוי — מסגרת error במקום מסגרת רגילה; textarea גבוה', () => {
    const invalid = fieldClasses({ invalid: true, kind: 'textarea' })
    expect(invalid).toContain('border-error')
    expect(invalid).not.toContain('border-(--field-border)')
    expect(invalid).toContain('min-h-40')
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
