import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { isValidElement } from 'react'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

import PluginSearchBox, { highlightMatches } from './PluginSearchBox'

describe('highlightMatches', () => {
  it('מחזיר את הטקסט כמות שהוא כשאין התאמה', () => {
    expect(highlightMatches('סידורון', 'מילון')).toBe('סידורון')
  })

  it('עוטף התאמה ב-<mark>', () => {
    const out = highlightMatches('יוצר דפי תפילה', 'תפילה') as unknown[]
    const marks = out.filter((node) => isValidElement(node) && node.type === 'mark')
    expect(marks).toHaveLength(1)
  })
})

describe('PluginSearchBox', () => {
  beforeEach(() => {
    push.mockReset()
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ results: [{ id: 'p1', name: 'יוצר דפי תפילה', shortDescription: 'תיאור', image: '' }] })
    })))
  })
  afterEach(() => vi.unstubAllGlobals())

  it('שדה combobox עם שם נגיש (ברירת מחדל) כשאין label גלוי', () => {
    render(<PluginSearchBox />)
    expect(screen.getByRole('combobox', { name: 'חיפוש תוספים' })).toBeInTheDocument()
  })

  it('inputId — לחיבור label גלוי (בלי aria-label כפול)', () => {
    render(
      <>
        <label htmlFor="q">חיפוש</label>
        <PluginSearchBox inputId="q" />
      </>
    )
    expect(screen.getByRole('combobox', { name: 'חיפוש' })).not.toHaveAttribute('aria-label')
  })

  it('הצעות חיות, ניווט מקלדת ובחירה ב-Enter', async () => {
    const user = userEvent.setup()
    render(<PluginSearchBox />)
    await user.type(screen.getByRole('combobox'), 'תפילה')
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300))
    })
    const listbox = await screen.findByRole('listbox', { name: 'הצעות' })
    expect(listbox.querySelectorAll('[role="option"]')).toHaveLength(2)
    await user.keyboard('{ArrowDown}{Enter}')
    expect(push).toHaveBeenCalledWith('/plugins/p1')
  })

  it('ערך התחלתי (defaultValue) לא פותח הצעות ולא שולח בקשה — רק הקלדה', async () => {
    render(<PluginSearchBox defaultValue="תפילה" />)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300))
    })
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('אייקון החיפוש בעוטף (לא על הגליף, שהוא ltr)', () => {
    const { container } = render(<PluginSearchBox />)
    const glyph = container.querySelector('.material-symbols-outlined') as HTMLElement
    expect(glyph.className).not.toMatch(/\bstart-/)
    expect((glyph.parentElement as HTMLElement).className).toMatch(/\bstart-/)
  })

  it('onSubmit — Enter בלי בחירה מפעיל סינון מקומי במקום ניווט', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()
    render(<PluginSearchBox onSubmit={onSubmit} />)
    await user.type(screen.getByRole('combobox'), 'א{Enter}')
    expect(onSubmit).toHaveBeenCalledWith('א')
    expect(push).not.toHaveBeenCalled()
  })
})
