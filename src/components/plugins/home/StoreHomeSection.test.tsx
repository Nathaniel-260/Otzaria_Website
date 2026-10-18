import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StoreHomeSection from './StoreHomeSection'
import BrowseAllCta from './BrowseAllCta'
import StoreHomeSkeleton from './StoreHomeSkeleton'

describe('StoreHomeSection', () => {
  it('section שמחובר ל-h2, תיאור, אריח וקישור "לכל הקטגוריה" עם מונה', () => {
    const { container } = render(
      <StoreHomeSection
        id="cat-study"
        title="כלי לימוד"
        description="כלי עזר שונים"
        icon="menu_book"
        action={{ href: '/plugins/category/study-tools', label: 'לכל הקטגוריה', count: 1234 }}
      >
        <ul aria-label="רשת" />
      </StoreHomeSection>
    )
    const heading = screen.getByRole('heading', { level: 2, name: 'כלי לימוד' })
    expect(heading).toHaveAttribute('id', 'cat-study')
    expect(screen.getByRole('region', { name: 'כלי לימוד' })).toContainElement(screen.getByRole('list', { name: 'רשת' }))
    expect(screen.getByText('כלי עזר שונים')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /לכל הקטגוריה/ })
    expect(link).toHaveAttribute('href', '/plugins/category/study-tools')
    expect(link).toHaveTextContent('(1,234)')
    expect(container.textContent).toContain('menu_book')
  })

  it('בלי פעולה ובלי אייקון — רק כותרת ותוכן', () => {
    render(<StoreHomeSection id="f" title="תוספים נבחרים"><p>תוכן</p></StoreHomeSection>)
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('תוספים נבחרים')
  })
})

describe('BrowseAllCta', () => {
  it('שאלה וקישור לכל התוספים עם המונה', () => {
    render(<BrowseAllCta totalPlugins={65} />)
    expect(screen.getByText('לא מצאת את מה שחיפשת?')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /עיין בכל התוספים/ })
    expect(link).toHaveAttribute('href', '/plugins/all')
    expect(link).toHaveTextContent('(65)')
  })
})

describe('StoreHomeSkeleton', () => {
  it('הכרזת טעינה אחת לקורא המסך', () => {
    render(<StoreHomeSkeleton />)
    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(screen.getByText('טוען תוספים...')).toBeInTheDocument()
  })
})
