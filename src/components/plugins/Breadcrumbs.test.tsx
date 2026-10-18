import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Breadcrumbs from './Breadcrumbs'

describe('Breadcrumbs', () => {
  it('links every item except the last, which is marked as the current page', () => {
    render(
      <Breadcrumbs
        items={[
          { label: 'חנות התוספים', href: '/plugins' },
          { label: 'קטגוריה', href: '/plugins/category/x' },
          { label: 'שם התוסף' }
        ]}
      />
    )

    expect(screen.getByRole('navigation', { name: 'פירורי לחם' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'חנות התוספים' })).toHaveAttribute('href', '/plugins')
    expect(screen.getByRole('link', { name: 'קטגוריה' })).toHaveAttribute('href', '/plugins/category/x')

    // הפריט האחרון הוא העמוד הנוכחי — טקסט בלבד, לא קישור
    expect(screen.queryByRole('link', { name: 'שם התוסף' })).not.toBeInTheDocument()
    const current = screen.getByText('שם התוסף').closest('[aria-current]')
    expect(current).toHaveAttribute('aria-current', 'page')
  })

  it('renders an ordered list with one item per crumb and a decorative separator between them', () => {
    const { container } = render(
      <Breadcrumbs items={[{ label: 'א', href: '/a' }, { label: 'ב', href: '/b' }, { label: 'ג' }]} />
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    // שני מפרידים בין 3 פריטים, מוסתרים מקורא המסך
    const separators = container.querySelectorAll('[aria-hidden="true"]')
    expect(separators).toHaveLength(2)
    separators.forEach((separator) => expect(separator).toHaveTextContent('chevron_left'))
  })

  it('renders no separator when there is only one item', () => {
    const { container } = render(<Breadcrumbs items={[{ label: 'חנות התוספים' }]} />)
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(0)
  })

  it('treats a last item that has an href as the current page too', () => {
    render(<Breadcrumbs items={[{ label: 'חנות', href: '/plugins' }, { label: 'כאן', href: '/plugins/all' }]} />)
    expect(screen.queryByRole('link', { name: 'כאן' })).not.toBeInTheDocument()
  })
})
