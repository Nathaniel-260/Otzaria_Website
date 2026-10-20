import { describe, it, expect } from 'vitest'
import { wrapIndex, stepIndex, swipeStep, isAutoplayActive, slidesToLoad, slideLabel, type AutoplayConditions } from './carouselModel'

describe('wrapIndex / stepIndex', () => {
  it('חזרה מעגלית בשני הכיוונים', () => {
    expect(wrapIndex(3, 3)).toBe(0)
    expect(wrapIndex(-1, 3)).toBe(2)
    expect(wrapIndex(0, 0)).toBe(0)
    expect(stepIndex(2, 1, 3)).toBe(0)
    expect(stepIndex(0, -1, 3)).toBe(2)
  })
})

describe('swipeStep (RTL)', () => {
  it('גרירה ימינה → הבאה; שמאלה → הקודמת', () => {
    expect(swipeStep(80, 5)).toBe(1)
    expect(swipeStep(-80, 5)).toBe(-1)
  })
  it('קצרה מהסף או אנכית בעיקרה — לא החלקה', () => {
    expect(swipeStep(20, 0)).toBe(0)
    expect(swipeStep(60, 90)).toBe(0)
  })
})

describe('isAutoplayActive', () => {
  const on: AutoplayConditions = {
    playing: true, reducedMotion: false, count: 4, hovered: false, focusWithin: false,
    documentHidden: false, inView: true, lightboxOpen: false
  }
  it('רץ כשאין סיבה לעצור', () => {
    expect(isAutoplayActive(on)).toBe(true)
  })
  it.each([
    ['השהיה בכפתור', { playing: false }],
    ['reduced motion', { reducedMotion: true }],
    ['תמונה אחת', { count: 1 }],
    ['hover', { hovered: true }],
    ['focus', { focusWithin: true }],
    ['טאב מוסתר', { documentHidden: true }],
    ['מחוץ למסך', { inView: false }],
    ['תצוגה מוגדלת', { lightboxOpen: true }]
  ])('נעצר: %s', (_, patch) => {
    expect(isAutoplayActive({ ...on, ...patch })).toBe(false)
  })
})

describe('slidesToLoad', () => {
  it('הנוכחית + הבאה + מה שכבר נראה', () => {
    expect([...slidesToLoad(0, 5)].sort()).toEqual([0, 1])
    expect([...slidesToLoad(4, 5)].sort()).toEqual([0, 4])
    expect([...slidesToLoad(2, 5, [0, 1])].sort()).toEqual([0, 1, 2, 3])
    expect([...slidesToLoad(0, 1)]).toEqual([0])
  })
})

describe('slideLabel', () => {
  it('"תמונה X מתוך N"', () => {
    expect(slideLabel(1, 9)).toBe('תמונה 2 מתוך 9')
  })
})
