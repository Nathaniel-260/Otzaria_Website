import { describe, it, expect, vi, afterEach } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent, createEvent, act } from '@testing-library/react'
import TagInput from './TagInput'
import { resetTagSuggestionCache, usePluginTagSuggestions } from './usePluginTagSuggestions'
import type { TagSuggestionSource } from './usePluginTagSuggestions'

/** TagInput עם רשימה אמיתית (כמו בטופס) — כדי לבדוק את ההתנהגות מקצה לקצה */
function Harness({ initial = [], suggestions, onSubmit }: {
  initial?: string[]
  suggestions?: TagSuggestionSource
  onSubmit?: (e: React.FormEvent) => void
}) {
  const [tags, setTags] = useState<string[]>(initial)
  return (
    <form onSubmit={onSubmit ?? ((e) => e.preventDefault())}>
      <TagInput id="t" tags={tags} onTagsChange={setTags} suggestions={suggestions} placeholder="הוסף תגית" />
    </form>
  )
}

// טקסט התגית שבשבב (בלי גליף האייקון של כפתור ההסרה)
const chips = () => screen.queryAllByRole('listitem').map((li) => li.querySelector('span')?.textContent)
const input = () => screen.getByRole('combobox', { name: 'הוסף תגית' })

const POOL = [
  { tag: 'כלי עזר', count: 12 },
  { tag: 'תנ"ך', count: 5 },
  { tag: 'מילון', count: 3 },
  { tag: 'תנך', count: 1 }
]
const source = (load = vi.fn()): TagSuggestionSource => ({ pool: POOL, load })

describe('TagInput — הוספה והסרה', () => {
  it('Enter מוסיף (ולא שולח טופס), "הוסף" מוסיף, וכל תגית ניתנת להסרה בשם נגיש', () => {
    const onSubmit = vi.fn((e) => e.preventDefault())
    render(<Harness initial={['מילון']} onSubmit={onSubmit} />)
    fireEvent.change(input(), { target: { value: 'חיפוש' } })
    fireEvent.keyDown(input(), { key: 'Enter' })
    expect(onSubmit).not.toHaveBeenCalled()
    fireEvent.change(input(), { target: { value: 'כלי עזר' } })
    fireEvent.click(screen.getByRole('button', { name: 'הוסף' }))
    expect(chips()).toEqual(['מילון', 'חיפוש', 'כלי עזר'])
    expect(input()).toHaveValue('')

    fireEvent.click(screen.getByRole('button', { name: 'הסרת התגית מילון' }))
    expect(chips()).toEqual(['חיפוש', 'כלי עזר'])
    // הפוקוס חוזר לשדה, לא נופל לגוף הדף
    expect(input()).toHaveFocus()
  })

  it('נרמול: גרשיים ורווחים מאוחדים, וכתיב שכבר קיים לא נוסף שוב', () => {
    render(<Harness initial={['תנ"ך']} />)
    fireEvent.change(input(), { target: { value: '  תנ״ך ' } })
    fireEvent.keyDown(input(), { key: 'Enter' })
    expect(chips()).toEqual(['תנ"ך'])
    expect(input()).toHaveValue('')
  })

  it('בלי תגיות — אין רשימה; הסבר מקושר לשדה', () => {
    render(<Harness />)
    expect(screen.queryByRole('list')).toBeNull()
    expect(input()).toHaveAccessibleDescription('אפשר להוסיף כמה תגיות בבת אחת, מופרדות בפסיק.')
  })
})

describe('TagInput — פיצול לפי מפרידים', () => {
  it('הקלדה: מה שלפני הפסיק נהפך לתגית, ומה שאחריו נשאר בשדה', () => {
    render(<Harness />)
    fireEvent.change(input(), { target: { value: 'כלי עזר,' } })
    expect(chips()).toEqual(['כלי עזר'])
    expect(input()).toHaveValue('')
    fireEvent.change(input(), { target: { value: 'גימטריא; סימ' } })
    expect(chips()).toEqual(['כלי עזר', 'גימטריא'])
    expect(input()).toHaveValue('סימ')
  })

  it('הדבקה עם מפרידים: כל הקטעים נהפכים לתגיות (גם האחרון), כולל פסיק ערבי וירידת שורה', () => {
    render(<Harness initial={['כלי עזר']} />)
    const paste = createEvent.paste(input(), {
      clipboardData: { getData: () => 'כלי עזר, סימניות،רצף לימוד\nלימוד יומי' }
    })
    fireEvent(input(), paste)
    expect(paste.defaultPrevented).toBe(true)
    expect(chips()).toEqual(['כלי עזר', 'סימניות', 'רצף לימוד', 'לימוד יומי'])
    expect(input()).toHaveValue('')
  })

  it('תגית של 40 תווים בדיוק + פסיק — נוספת (אין maxLength על השדה כולו); 41 — הודעה בזמן ההקלדה', () => {
    render(<Harness />)
    expect(input()).not.toHaveAttribute('maxLength')
    fireEvent.change(input(), { target: { value: `${'א'.repeat(40)},` } })
    expect(chips()).toEqual(['א'.repeat(40)])
    fireEvent.change(input(), { target: { value: 'ב'.repeat(41) } })
    expect(input()).toHaveAttribute('aria-invalid', 'true')
  })

  it('הדבקה בלי מפריד — התנהגות רגילה של השדה', () => {
    render(<Harness />)
    const paste = createEvent.paste(input(), { clipboardData: { getData: () => 'מילון' } })
    fireEvent(input(), paste)
    expect(paste.defaultPrevented).toBe(false)
    expect(chips()).toEqual([])
  })

  it('תגית ארוכה מ-40 תווים לא נוספת: נשארת בשדה עם הודעת שגיאה מקושרת', () => {
    render(<Harness />)
    const long = 'א'.repeat(41)
    const paste = createEvent.paste(input(), { clipboardData: { getData: () => `${long}, קצר` } })
    fireEvent(input(), paste)
    expect(chips()).toEqual(['קצר'])
    expect(input()).toHaveValue(long)
    expect(input()).toHaveAttribute('aria-invalid', 'true')
    expect(input()).toHaveAccessibleDescription(/כל תגית יכולה להכיל עד 40 תווים/)
  })
})

describe('TagInput — הצעות (combobox)', () => {
  it('המאגר נטען בפוקוס; בלי טקסט — אין רשימה', () => {
    const load = vi.fn()
    render(<Harness suggestions={source(load)} />)
    fireEvent.focus(input())
    expect(load).toHaveBeenCalledTimes(1)
    expect(input()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('הקלדה מציגה תגיות קיימות לפי שכיחות עם מונה — גם בלי גרשיים ("תנך" מוצא את "תנ"ך")', () => {
    render(<Harness suggestions={source()} />)
    fireEvent.focus(input())
    fireEvent.change(input(), { target: { value: 'תנך' } })
    expect(input()).toHaveAttribute('aria-expanded', 'true')
    const options = screen.getAllByRole('option')
    expect(options.map((o) => o.textContent)).toEqual(['תנ"ך (5)', 'תנך (1)'])
    expect(input()).toHaveAttribute('aria-controls', screen.getByRole('listbox').id)
  })

  it('חצים מזיזים את הפריט הפעיל (aria-activedescendant, במעגל), Enter בוחר אותו', () => {
    render(<Harness suggestions={source()} />)
    fireEvent.focus(input())
    fireEvent.change(input(), { target: { value: 'תנ' } })
    expect(input()).not.toHaveAttribute('aria-activedescendant')
    fireEvent.keyDown(input(), { key: 'ArrowDown' })
    let options = screen.getAllByRole('option')
    expect(input()).toHaveAttribute('aria-activedescendant', options[0].id)
    expect(options[0]).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(input(), { key: 'ArrowDown' })
    fireEvent.keyDown(input(), { key: 'ArrowDown' })
    options = screen.getAllByRole('option')
    expect(input()).toHaveAttribute('aria-activedescendant', options[0].id)
    fireEvent.keyDown(input(), { key: 'ArrowUp' })
    expect(input()).toHaveAttribute('aria-activedescendant', options[1].id)
    fireEvent.keyDown(input(), { key: 'Enter' })
    expect(chips()).toEqual(['תנך'])
    expect(input()).toHaveValue('')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('Enter בלי פריט פעיל מוסיף את מה שהוקלד; תגית שכבר נבחרה לא מוצעת', () => {
    render(<Harness initial={['תנ"ך']} suggestions={source()} />)
    fireEvent.focus(input())
    fireEvent.change(input(), { target: { value: 'תנ' } })
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['תנך (1)'])
    fireEvent.keyDown(input(), { key: 'Enter' })
    expect(chips()).toEqual(['תנ"ך', 'תנ'])
  })

  it('לחיצה על הצעה בוחרת אותה, והפוקוס נשאר בשדה', () => {
    render(<Harness suggestions={source()} />)
    input().focus()
    fireEvent.change(input(), { target: { value: 'מיל' } })
    fireEvent.click(screen.getByRole('option', { name: /מילון/ }))
    expect(chips()).toEqual(['מילון'])
    expect(input()).toHaveFocus()
  })

  it('Esc סוגר את הרשימה ומסמן preventDefault (החלון שמסביב לא ייסגר); Esc נוסף לא מסומן', () => {
    render(<Harness suggestions={source()} />)
    fireEvent.focus(input())
    fireEvent.change(input(), { target: { value: 'כלי' } })
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    const first = createEvent.keyDown(input(), { key: 'Escape' })
    fireEvent(input(), first)
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(first.defaultPrevented).toBe(true)
    const second = createEvent.keyDown(input(), { key: 'Escape' })
    fireEvent(input(), second)
    expect(second.defaultPrevented).toBe(false)
    // הקלדה נוספת פותחת שוב
    fireEvent.change(input(), { target: { value: 'כלי ע' } })
    expect(screen.getByRole('listbox')).toBeInTheDocument()
  })

  it('יציאה מהשדה סוגרת את הרשימה', () => {
    render(<Harness suggestions={source()} />)
    fireEvent.focus(input())
    fireEvent.change(input(), { target: { value: 'כלי' } })
    fireEvent.blur(input())
    expect(screen.queryByRole('listbox')).toBeNull()
  })
})

describe('usePluginTagSuggestions', () => {
  afterEach(() => {
    resetTagSuggestionCache()
    vi.unstubAllGlobals()
  })

  function SourceHarness() {
    return <Harness suggestions={usePluginTagSuggestions()} />
  }

  it('טוען פעם אחת את /api/plugins הקיים, ומחשב מאגר מנורמל (פסיקים מתפצלים, כתיבים מתאחדים)', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([
      { tags: ['כלי עזר, גימטריא', 'תנ״ך'] },
      { tags: ['תנ"ך', 'מראה תואם לאוצריא'] }
    ]), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    render(<SourceHarness />)
    await act(async () => { fireEvent.focus(input()) })
    fireEvent.blur(input())
    await act(async () => { fireEvent.focus(input()) })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/api/plugins')
    fireEvent.change(input(), { target: { value: 'ת' } })
    // תגית ההתאמה ("מראה תואם לאוצריא") אינה מוצעת
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['תנ"ך (2)'])
  })

  it('כישלון בטעינה — אין הצעות, והפוקוס הבא מנסה שוב', async () => {
    const fetchMock = vi.fn(async () => new Response('', { status: 500 }))
    vi.stubGlobal('fetch', fetchMock)
    render(<SourceHarness />)
    await act(async () => { fireEvent.focus(input()) })
    fireEvent.change(input(), { target: { value: 'ת' } })
    expect(screen.queryByRole('listbox')).toBeNull()
    fireEvent.blur(input())
    await act(async () => { fireEvent.focus(input()) })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
