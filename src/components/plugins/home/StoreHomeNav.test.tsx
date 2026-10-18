import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import CategoryChipsNav from './CategoryChipsNav'
import CategorySidebar from './CategorySidebar'
import type { PluginCategorySummary } from '@/components/plugins/types'

const cat = (over: Partial<PluginCategorySummary>): PluginCategorySummary => ({
  id: 'c1',
  slug: 'study-tools',
  name: 'כלי לימוד',
  description: '',
  icon: '',
  pluginCount: 20,
  ...over
})

const plain = [cat({}), cat({ id: 'c2', slug: 'prayer', name: 'תפילה', pluginCount: 3 })]

describe('CategoryChipsNav', () => {
  it('ניווט "קטגוריות" עם שבב לכל קטגוריה ו"כל התוספים" אחרון, עם מונים', () => {
    render(<CategoryChipsNav categories={plain} totalPlugins={65} />)
    const nav = screen.getByRole('navigation', { name: 'קטגוריות' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      '/plugins/category/study-tools',
      '/plugins/category/prayer',
      '/plugins/all'
    ])
    expect(links[0]).toHaveTextContent('כלי לימוד (20)')
    expect(links[2]).toHaveTextContent('כל התוספים (65)')
  })

  it('בלי אייקונים כשלאף קטגוריה אין אייקון; עם ברירת מחדל כשלאחת יש', () => {
    const { container, rerender } = render(<CategoryChipsNav categories={plain} totalPlugins={65} />)
    expect(container.querySelectorAll('.material-symbols-outlined')).toHaveLength(0)
    rerender(<CategoryChipsNav categories={[cat({ icon: 'menu_book' }), plain[1]]} totalPlugins={65} />)
    const glyphs = [...container.querySelectorAll('.material-symbols-outlined')].map((g) => g.textContent)
    expect(glyphs).toEqual(['menu_book', 'extension'])
  })
})

describe('CategorySidebar', () => {
  it('aside עם ניווט שמחובר לכותרת h2 "קטגוריות", קישורים ומונים', () => {
    render(<CategorySidebar categories={plain} totalPlugins={65} />)
    const nav = screen.getByRole('navigation', { name: 'קטגוריות' })
    expect(within(nav).getByRole('heading', { level: 2, name: 'קטגוריות' })).toBeInTheDocument()
    expect(within(nav).getByRole('link', { name: 'תפילה 3' })).toHaveAttribute('href', '/plugins/category/prayer')
    expect(within(nav).getByRole('link', { name: 'כל התוספים 65' })).toHaveAttribute('href', '/plugins/all')
    expect(nav.closest('aside')).toHaveClass('lg:sticky')
  })
})
