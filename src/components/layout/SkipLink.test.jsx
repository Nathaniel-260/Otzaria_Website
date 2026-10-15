// בדיקות ל"דלג לתוכן": היעד (findSkipTarget) — לפי המזהה, ובלעדיו ה-<main> הפנימי או מה שאחרי
// הכותרת שבתוכו; ולחיצה מעבירה את הפוקוס ליעד בלי לשנות את כתובת העמוד.
import { afterEach, describe, expect, test } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import SkipLink, { findSkipTarget } from './SkipLink'

afterEach(() => { document.body.innerHTML = '' })

describe('findSkipTarget', () => {
  test('האלמנט עם id="main-content" — גם כשיש <main> חיצוני בלי מזהה', () => {
    document.body.innerHTML = '<main><header></header><main id="main-content">תוכן</main></main>'
    expect(findSkipTarget()).toBe(document.getElementById('main-content'))
  })

  test('בלי מזהה — ה-<main> הפנימי ביותר', () => {
    document.body.innerHTML = '<main id="outer"><main id="inner">תוכן</main></main>'
    expect(findSkipTarget().id).toBe('inner')
  })

  test('בלי מזהה, והכותרת בתוך ה-<main> — האלמנט שאחריה', () => {
    document.body.innerHTML = '<main><div><header>ניווט</header><section id="after">תוכן</section></div></main>'
    expect(findSkipTarget().id).toBe('after')
  })

  test('בלי <main> בכלל — null', () => {
    document.body.innerHTML = '<div>עמוד</div>'
    expect(findSkipTarget()).toBe(null)
  })
})

describe('SkipLink', () => {
  test('קישור עוגן ל-#main-content, ולחיצה מעבירה אליו את הפוקוס', () => {
    render(
      <>
        <SkipLink />
        <main id="main-content">תוכן</main>
      </>
    )
    const link = screen.getByRole('link', { name: 'דלג לתוכן' })
    expect(link).toHaveAttribute('href', '#main-content')

    fireEvent.click(link)
    const main = document.getElementById('main-content')
    expect(main).toHaveFocus()
    expect(main).toHaveAttribute('tabindex', '-1')
  })
})
