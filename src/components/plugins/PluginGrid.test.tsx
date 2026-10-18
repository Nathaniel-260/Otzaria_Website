import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PluginGrid from './PluginGrid'
import { PluginGridSkeleton } from './PluginCardSkeleton'

describe('PluginGrid', () => {
  it('רשימה סמנטית — li לכל ילד', () => {
    render(
      <PluginGrid label="תוספים נבחרים">
        <div key="a">א</div>
        <div key="b">ב</div>
      </PluginGrid>
    )
    const list = screen.getByRole('list', { name: 'תוספים נבחרים' })
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(list.className).toContain('lg:grid-cols-3')
  })

  it('columns="sidebar" — שלוש עמודות רק מ-xl', () => {
    render(<PluginGrid columns="sidebar"><div key="a">א</div></PluginGrid>)
    expect(screen.getByRole('list').className).toContain('xl:grid-cols-3')
    expect(screen.getByRole('list').className).not.toContain('lg:grid-cols-3')
  })

  it('mobileRail — מסילה אופקית בנייד, רשת מ-md', () => {
    render(<PluginGrid mobileRail><div key="a">א</div></PluginGrid>)
    const list = screen.getByRole('list')
    expect(list.className).toContain('overflow-x-auto')
    expect(list.className).toContain('md:grid')
  })
})

describe('PluginGridSkeleton', () => {
  it('הכרזה אחת לקורא המסך ומספר השלדים המבוקש', () => {
    render(<PluginGridSkeleton count={4} label="טוען תוספים..." />)
    expect(screen.getByRole('status')).toHaveTextContent('טוען תוספים...')
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
  })
})
