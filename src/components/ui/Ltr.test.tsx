import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Ltr from './Ltr'
import NewWindowHint from './NewWindowHint'

describe('Ltr', () => {
  it('bdi בכיוון LTR שאינו נשבר', () => {
    render(<p>מחשב <Ltr>Windows 10 / 11</Ltr></p>)
    const term = screen.getByText('Windows 10 / 11')
    expect(term.tagName).toBe('BDI')
    expect(term).toHaveAttribute('dir', 'ltr')
    expect(term.className).toBe('whitespace-nowrap')
  })

  it('className מתווסף', () => {
    render(<Ltr className="font-mono">uname -m</Ltr>)
    expect(screen.getByText('uname -m')).toHaveClass('whitespace-nowrap', 'font-mono')
  })
})

describe('NewWindowHint', () => {
  it('הנוסח לקורא מסך, מוסתר חזותית', () => {
    const { container } = render(<NewWindowHint />)
    expect(container.firstElementChild).toHaveClass('sr-only')
    expect(container.textContent).toBe(' (נפתח בחלון חדש)')
  })

  it('עם יעד', () => {
    const { container } = render(<NewWindowHint destination="ב-GitHub" />)
    expect(container.textContent).toBe(' ב-GitHub (נפתח בחלון חדש)')
  })
})
