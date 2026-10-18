import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TagFilterChips from './TagFilterChips'

const TAGS = Array.from({ length: 12 }, (_, i) => ({ tag: `תגית ${i + 1}`, count: 12 - i }))

describe('TagFilterChips', () => {
  it('"כל התגיות" ראשון, ואחריו 8 התגיות הנפוצות עם מונה', () => {
    render(<TagFilterChips tags={TAGS} activeTag="all" onSelect={vi.fn()} />)
    const group = screen.getByRole('group', { name: 'תגיות' })
    const buttons = within(group).getAllByRole('button')
    expect(buttons[0]).toHaveAccessibleName('כל התגיות')
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'false')
    expect(buttons.slice(1).map((b) => b.textContent)).toEqual(TAGS.slice(0, 8).map((t) => `${t.tag} (${t.count})`))
    expect(screen.queryByRole('button', { name: /תגית 9/ })).toBeNull()
  })

  it('תגית פעילה שאינה בין הנפוצות — גלויה ראשונה ומסומנת', () => {
    render(<TagFilterChips tags={TAGS} activeTag="תגית 11" onSelect={vi.fn()} />)
    const chips = within(screen.getByRole('group', { name: 'תגיות' })).getAllByRole('button').slice(1)
    expect(chips[0]).toHaveTextContent(/^checkתגית 11 ?\(2\)$/)
    expect(chips[0]).toHaveAttribute('aria-pressed', 'true')
    expect(chips).toHaveLength(9)
  })

  it('לחיצה על שבב בוחרת; לחיצה על השבב הפעיל מבטלת (all)', async () => {
    const onSelect = vi.fn()
    const { rerender } = render(<TagFilterChips tags={TAGS} activeTag="all" onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('button', { name: /^תגית 2\s?\(/ }))
    expect(onSelect).toHaveBeenLastCalledWith('תגית 2')
    rerender(<TagFilterChips tags={TAGS} activeTag="תגית 2" onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('button', { name: /^תגית 2\s?\(/ }))
    expect(onSelect).toHaveBeenLastCalledWith('all')
  })

  it('בלי תגיות — לא מרנדר כלום', () => {
    const { container } = render(<TagFilterChips tags={[]} activeTag="all" onSelect={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })
})
