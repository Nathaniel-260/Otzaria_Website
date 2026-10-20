import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TagPicker from './TagPicker'

const TAGS = [
  { tag: 'כלי עזר', count: 20 },
  { tag: 'english', count: 4 },
  { tag: 'ניקוד', count: 0 }
]

function setup(activeTag = 'all') {
  const onSelect = vi.fn()
  render(<TagPicker tags={TAGS} activeTag={activeTag} onSelect={onSelect} label="כל התגיות" />)
  return { onSelect, button: screen.getByRole('button', { name: 'כל התגיות' }) }
}

describe('TagPicker', () => {
  it('נפתח לחלונית עם שדה חיפוש ממוקד ורשימה: "כל התגיות" ואחריו כל התגיות עם מונה', async () => {
    const { button } = setup('english')
    await userEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('dialog', { name: 'כל התגיות' })).toBeInTheDocument()
    const input = screen.getByRole('combobox', { name: 'חיפוש תגית' })
    expect(input).toHaveFocus()
    const options = screen.getAllByRole('option')
    // (הגליף ✓ של הפעילה הוא ligature "check" — aria-hidden, לא חלק מהשם)
    expect(options.map((o) => o.textContent?.replace(/^check/, ''))).toEqual(['כל התגיות', 'כלי עזר (20)', 'english (4)', 'ניקוד (0)'])
    // התגית הפעילה מסומנת ומודגשת כפעילה בפתיחה
    expect(screen.getByRole('option', { name: /^english/ })).toHaveAttribute('aria-selected', 'true')
    expect(input).toHaveAttribute('aria-activedescendant', options[2].id)
  })

  it('חיפוש מסנן; חצים + Enter בוחרים, והפוקוס חוזר לכפתור', async () => {
    const { onSelect, button } = setup()
    await userEvent.click(button)
    await userEvent.keyboard('ENG')
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['english (4)'])
    await userEvent.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledWith('english')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(button).toHaveFocus()
  })

  it('חצים במעגל; "כל התגיות" מחזיר all', async () => {
    const { onSelect, button } = setup('ניקוד')
    await userEvent.click(button)
    await userEvent.keyboard('{ArrowDown}{Enter}') // מ"ניקוד" (אחרון) — חזרה ל"כל התגיות"
    expect(onSelect).toHaveBeenCalledWith('all')
  })

  it('בלי התאמה — הודעה; Esc סוגר ומחזיר פוקוס', async () => {
    const { onSelect, button } = setup()
    await userEvent.click(button)
    await userEvent.keyboard('zzz')
    expect(screen.getByRole('status')).toHaveTextContent('לא נמצאו תגיות')
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(button).toHaveFocus()
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('לחיצה מחוץ לחלונית סוגרת', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: 'כל התגיות' }))
    await userEvent.click(document.body)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('TagPicker — תגיות התאמה', () => {
  it('"מראה תואם לאוצריא" וכו\' בקבוצה "תאימות" בסוף הרשימה, וניווט החצים עובר אליהן', async () => {
    const onSelect = vi.fn()
    const tags = [{ tag: 'כלי עזר', count: 20 }, { tag: 'מראה תואם לאוצריא', count: 23 }, { tag: 'תואם אוצריא', count: 1 }]
    render(<TagPicker tags={tags} activeTag="all" onSelect={onSelect} label="כל התגיות" />)
    await userEvent.click(screen.getByRole('button', { name: 'כל התגיות' }))
    const group = screen.getByRole('group', { name: 'תאימות' })
    expect(within(group).getAllByRole('option').map((o) => o.textContent)).toEqual(['מראה תואם לאוצריא (23)', 'תואם אוצריא (1)'])
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    expect(onSelect).toHaveBeenCalledWith('מראה תואם לאוצריא')
  })
})
