import { describe, expect, it } from 'vitest'
import { foreverShift, shouldPauseTagline } from './foreverTaglineLogic'

const base = { inView: true, hidden: false, hovered: false, focused: false }

describe('shouldPauseTagline', () => {
  it('רצה רק כשהיא גלויה ואין אינטראקציה עם הגיבור', () => {
    expect(shouldPauseTagline(base)).toBe(false)
  })

  it.each([
    ['מחוץ למסך', { inView: false }],
    ['לשונית מוסתרת', { hidden: true }],
    ['ריחוף', { hovered: true }],
    ['פוקוס', { focused: true }]
  ])('%s — עוצרת', (_name, patch) => {
    expect(shouldPauseTagline({ ...base, ...patch })).toBe(true)
  })
})

describe('foreverShift', () => {
  it('חצי מרוחב "לנצח!" ועוד חצי רווח', () => {
    expect(foreverShift(80, 10)).toBe(45)
    expect(foreverShift(81, 8)).toBe(44.5)
  })

  it('לפני מדידה (רוחב 0) — בלי הזזה; רווח שלילי נחשב 0', () => {
    expect(foreverShift(0, 10)).toBe(0)
    expect(foreverShift(80, -5)).toBe(40)
  })
})
