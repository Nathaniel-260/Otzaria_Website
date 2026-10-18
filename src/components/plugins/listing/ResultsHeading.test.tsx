import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ResultsHeading from './ResultsHeading'

describe('ResultsHeading', () => {
  it('כותרת h2 עם id, מונה מוכרז (aria-live) ופעולה אופציונלית', () => {
    render(
      <ResultsHeading
        id="r"
        title="בחר את התוסף שמתאים לך"
        count="מוצגים 3 מתוך 10 תוספים"
        action={<button>נקה סינון</button>}
      />
    )
    const heading = screen.getByRole('heading', { level: 2, name: 'בחר את התוסף שמתאים לך' })
    expect(heading).toHaveAttribute('id', 'r')
    expect(screen.getByText('מוצגים 3 מתוך 10 תוספים')).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByRole('button', { name: 'נקה סינון' })).toBeInTheDocument()
  })

  it('הכותרת בגופן התצוגה במשקל רגיל — בלי font-bold', () => {
    render(<ResultsHeading id="r" title="כותרת" count="" />)
    const cls = screen.getByRole('heading').className
    expect(cls).toContain('font-display')
    expect(cls).not.toMatch(/font-(bold|semibold)/)
  })
})
