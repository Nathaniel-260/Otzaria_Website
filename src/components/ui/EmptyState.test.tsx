import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import EmptyState from './EmptyState'

describe('EmptyState', () => {
  it('כותרת h2 כברירת מחדל, הסבר ופעולות', () => {
    render(
      <EmptyState
        title="לא נמצאו תוספים"
        description="נסה ניסוח אחר"
        actions={<button type="button">לכל התוספים</button>}
      />
    )
    expect(screen.getByRole('heading', { level: 2, name: 'לא נמצאו תוספים' })).toBeInTheDocument()
    expect(screen.getByText('נסה ניסוח אחר')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'לכל התוספים' })).toBeInTheDocument()
  })

  it('as="h1" לעמוד שכולו המצב הריק, ו-role="status" להכרזה אחרי סינון', () => {
    render(<EmptyState as="h1" role="status" title="הקטגוריה לא נמצאה" />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('הקטגוריה לא נמצאה')
    // כותרת עמוד — בגופן התצוגה, כמו שאר ה-h1 באתר
    expect(heading.className).toContain('font-display')
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('tone="plain" — בלי משטח כרטיס', () => {
    const { container } = render(<EmptyState tone="plain" title="ריק" />)
    expect(container.querySelector('[data-tone]')).toBeNull()
  })
})
