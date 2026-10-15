import { describe, it, expect } from 'vitest'
import { BUTTON_SIZES, BUTTON_VARIANTS, buttonClasses, buttonIconClasses } from './buttonStyles'

const tokens = (s: string) => s.split(' ')

describe('buttonClasses', () => {
  it('ברירת מחדל: filled בגודל md, עם טבעת פוקוס ורדיוס מהטוקן', () => {
    const c = tokens(buttonClasses())
    expect(c).toContain('bg-(--button-filled-bg)')
    expect(c).toContain('hover:bg-(--button-filled-bg-hover)')
    expect(c).toContain('active:bg-(--button-filled-bg-pressed)')
    expect(c).toContain('min-h-(--button-height-md)')
    expect(c).toContain('rounded-(--button-radius)')
    expect(c).toContain('focus-visible:outline-focus-ring')
  })

  it.each(BUTTON_VARIANTS.filter((v) => v !== 'donation'))('וריאנט %s — צבעים רק מטוקני הכפתור (בלי hex ובלי צבע Tailwind גולמי)', (variant) => {
    const c = buttonClasses({ variant })
    expect(c).not.toMatch(/#[0-9a-f]{3,8}|bg-white|text-white|-(gray|blue|red|neutral)-\d/)
    expect(c).toContain(`--button-${variant}-`)
  })

  it.each(BUTTON_SIZES)('גודל %s — מטרת מגע מטוקן גובה (≥44px)', (size) => {
    expect(buttonClasses({ size })).toContain(`min-h-(--button-height-${size})`)
  })

  it('donation — מחלקת המותג בלבד (הצבע/הפוקוס ב-.donation-button), ו-lg מוסיף את הגודל הגדול', () => {
    expect(buttonClasses({ variant: 'donation' })).toBe('donation-button')
    expect(buttonClasses({ variant: 'donation', size: 'lg' })).toBe('donation-button donation-button-lg')
  })

  it('iconOnly — ריבוע: רוחב מינימלי = גובה, בלי ריפוד צד', () => {
    const c = buttonClasses({ iconOnly: true, size: 'sm' })
    expect(c).toContain('min-w-(--button-height-sm)')
    expect(c).not.toContain('px-4')
  })

  it('fullWidth / disabled / className נוספים בסוף', () => {
    const c = buttonClasses({ fullWidth: true, disabled: true, className: 'tall:px-9' })
    expect(c).toContain('w-full')
    expect(c).toContain('pointer-events-none')
    expect(c.endsWith('tall:px-9')).toBe(true)
  })
})

describe('buttonIconClasses', () => {
  it('גודל הגליף לפי גודל הכפתור, או iconSize מפורש', () => {
    expect(buttonIconClasses({ size: 'md' })).toBe('text-(length:--button-icon-size-md)')
    expect(buttonIconClasses({ size: 'md', iconSize: 'lg' })).toBe('text-(length:--button-icon-size-lg)')
  })
  it('donation — מחלקת האייקון של כפתור התרומה', () => {
    expect(buttonIconClasses({ variant: 'donation' })).toBe('donation-button-icon')
  })
})
