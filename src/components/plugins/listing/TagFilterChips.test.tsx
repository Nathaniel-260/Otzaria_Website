import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TagFilterChips from './TagFilterChips'

describe('TagFilterChips', () => {
  it('"כל התגיות" ראשון ואחריו כל תגית; הפעילה מסומנת ב-aria-pressed', () => {
    render(<TagFilterChips tags={['לימוד', 'תפילה']} activeTag="תפילה" onSelect={vi.fn()} />)
    const group = screen.getByRole('group', { name: 'תגיות' })
    const buttons = group.querySelectorAll('button')
    expect(Array.from(buttons).map((b) => b.textContent)).toEqual(['כל התגיות', 'לימוד', 'תפילה'])
    expect(screen.getByRole('button', { name: 'תפילה' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'כל התגיות' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('לחיצה על שבב בוחרת את התגית; "כל התגיות" מחזיר all', async () => {
    const onSelect = vi.fn()
    render(<TagFilterChips tags={['לימוד']} activeTag="לימוד" onSelect={onSelect} />)
    await userEvent.click(screen.getByRole('button', { name: 'כל התגיות' }))
    expect(onSelect).toHaveBeenLastCalledWith('all')
    await userEvent.click(screen.getByRole('button', { name: 'לימוד' }))
    expect(onSelect).toHaveBeenLastCalledWith('לימוד')
  })

  it('בלי תגיות — לא מרנדר כלום', () => {
    const { container } = render(<TagFilterChips tags={[]} activeTag="all" onSelect={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('בלי גלישה (jsdom — אין פריסה) — אין כפתור "הצג עוד"', () => {
    render(<TagFilterChips tags={['א', 'ב']} activeTag="all" onSelect={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'הצג עוד' })).toBeNull()
  })
})
