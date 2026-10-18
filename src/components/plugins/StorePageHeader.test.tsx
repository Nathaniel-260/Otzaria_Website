import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StorePageHeader from './StorePageHeader'

describe('StorePageHeader', () => {
  it('h1 שמחובר ל-section, פירורי לחם, שורת משנה, נתונים, פעולות ואזור כלים', () => {
    render(
      <StorePageHeader
        titleId="all-title"
        title="כל התוספים"
        subtitle="שורת משנה"
        breadcrumbs={[{ label: 'חנות התוספים', href: '/plugins' }, { label: 'כל התוספים' }]}
        meta={<span>65 תוספים</span>}
        actions={<button type="button">העלה תוסף חדש</button>}
      >
        <input aria-label="חיפוש" />
      </StorePageHeader>
    )
    const heading = screen.getByRole('heading', { level: 1, name: 'כל התוספים' })
    expect(heading).toHaveAttribute('id', 'all-title')
    expect(screen.getByRole('region', { name: 'כל התוספים' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'פירורי לחם' })).toBeInTheDocument()
    expect(screen.getByText('שורת משנה')).toBeInTheDocument()
    expect(screen.getByText('65 תוספים')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'העלה תוסף חדש' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'חיפוש' })).toBeInTheDocument()
  })

  it('בלי פירורי לחם ובלי אייקון — רק הכותרת', () => {
    render(<StorePageHeader titleId="t" title="העלאת תוסף חדש" />)
    expect(screen.queryByRole('navigation')).toBeNull()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('העלאת תוסף חדש')
  })
})
