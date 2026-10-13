import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ForeverTagline from './ForeverTagline'

describe('ForeverTagline', () => {
  it('לקורא מסך — משפט אחד שלם, והאנימציה מוסתרת', () => {
    const { container } = render(<ForeverTagline play={false} />)
    expect(screen.getByText('חינם לנצח')).toHaveClass('sr-only')
    expect(container.querySelector('[aria-hidden="true"]')).toContainElement(screen.getByTestId('forever-final'))
  })

  it('"לנצח!" מפורק לאותיות לפי הסדר, עם אינדקס לעיכוב', () => {
    render(<ForeverTagline play={false} />)
    const letters = screen.getByTestId('forever-final').querySelectorAll('.forever-letter')
    expect(Array.from(letters, (el) => el.textContent).join('')).toBe('לנצח!')
    expect((letters[4] as HTMLElement).style.getPropertyValue('--i')).toBe('4')
  })

  it('השורה היא תמיד הצירוף המלא — "חינם" ראשון, כך שב-RTL הוא מימין', () => {
    const { container } = render(<ForeverTagline play={false} />)
    const line = container.querySelector('.forever-line') as HTMLElement
    expect(line.textContent).toBe('חינםלנצח!')
    expect(line).toHaveAttribute('aria-hidden', 'true')
    expect(line.firstElementChild).toHaveClass('forever-first')
    expect(line.style.getPropertyValue('--forever-shift')).toMatch(/px$/)
  })

  it('הלולאה נעצרת בריחוף על הגיבור וממשיכה ביציאה', () => {
    const { container } = render(<section><ForeverTagline play /></section>)
    const p = container.querySelector('p') as HTMLElement
    const section = container.querySelector('section') as HTMLElement
    expect(p).not.toHaveAttribute('data-paused')
    section.dispatchEvent(new Event('pointerenter'))
    expect(p).toHaveAttribute('data-paused')
    section.dispatchEvent(new Event('pointerleave'))
    expect(p).not.toHaveAttribute('data-paused')
  })

  it('הרצף מתחיל רק כש-play מופעל', () => {
    const { container, rerender } = render(<ForeverTagline play={false} />)
    expect(container.firstChild).toHaveAttribute('data-state', 'idle')
    rerender(<ForeverTagline play />)
    expect(container.firstChild).toHaveAttribute('data-state', 'play')
  })
})
