import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { fakeApi, ocrPublic } from '../testing/fakeApi'

// מסך זיהוי-הטקסט: טעינת הסבב (הנוכחי, או חדש כשאין שורות פתוחות), מקשים 1–6 ו-↑↓,
// עריכה במקום (Enter שומר, Esc מבטל), "דלג" נשאר על המסך, "קח 30 נוספות" רק בסוף,
// ובלי גישה — "אין לך הרשאת גישה לדף זה".

const nav = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => nav }))
const alert = vi.hoisted(() => vi.fn())
vi.mock('@/components/providers/DialogContext', () => ({ useDialog: () => ({ showAlert: alert }) }))
// החלוקה לפי הדיו (של הנתב) — בבדיקה: שלושה קטעים מימין לשמאל, כמו "שורה מספר N"
const ink = vi.hoisted(() => ({ boxes: [[400, 4, 580, 36], [220, 4, 380, 36], [20, 4, 200, 36]] }))
vi.mock('../router/useInkWords', () => ({ useInkWords: (src, needed) => (needed ? ink.boxes : null) }))

import OcrScreen from './OcrScreen'

const round = (items, open = items.filter((i) => i.status === 'held').length) => ({ round: 'r1', items, open, done: open === 0 })

function api({ current, taken, mark } = {}) {
  return fakeApi({
    'GET /api/training-proof/round?section=ocr': () => ({ status: 200, data: current }),
    'POST /api/training-proof/round': () => ({ status: 200, data: taken }),
    'POST /api/training-proof/items/*': (body, path) => {
      const id = path.split('/')[4]
      return mark ? mark(id, body) : { status: 200, data: { item: ocrPublic(Number(id.slice(1)), { status: 'submitted', result: body }), skipped: false } }
    },
    'POST /api/training-proof/round/heartbeat': () => ({ status: 200, data: { open: 1 } }),
    'POST /api/training-proof/round/release': () => ({ status: 200, data: { released: 0 } }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  window.scrollBy = vi.fn()
})
afterEach(() => vi.unstubAllGlobals())

describe('OcrScreen', () => {
  it('סבב פתוח — ממשיכים אותו בלי לקחת חדש; הכתב על כל שורה', async () => {
    const { calls } = api({ current: round([ocrPublic(0), ocrPublic(1)]) })
    render(<OcrScreen />)
    expect(await screen.findByText('שורה 1 מתוך 2')).toBeInTheDocument()
    expect(screen.getByText('רש"י')).toBeInTheDocument()
    expect(screen.getByText('מרובע')).toBeInTheDocument()
    expect(calls.some((c) => c.method === 'POST' && c.path === '/api/training-proof/round')).toBe(false)
  })

  it('אין סבב פתוח — לוקחים חדש', async () => {
    const { calls } = api({ current: round([], 0), taken: round([ocrPublic(5)]) })
    render(<OcrScreen />)
    expect(await screen.findByText('שורה מספר 5')).toBeInTheDocument()
    expect(calls.find((c) => c.path === '/api/training-proof/round' && c.method === 'POST').body).toEqual({ section: 'ocr' })
  })

  it('מקש 1 = נכון, נשמר מיד, ועוברים לשורה הבאה; 5 = לא קריא', async () => {
    const { calls } = api({ current: round([ocrPublic(0), ocrPublic(1)]) })
    const user = userEvent.setup()
    render(<OcrScreen />)
    await screen.findByText('שורה 1 מתוך 2')
    await user.keyboard('1')
    await waitFor(() => expect(calls.find((c) => c.path === '/api/training-proof/items/o0/mark')?.body).toEqual({ action: 'ok' }))
    expect(await screen.findByText(/נשמר באתר: נכון/)).toBeInTheDocument()
    await waitFor(() => expect(document.getElementById('tp-line-o1')).toHaveAttribute('aria-current', 'true'))
    await user.keyboard('5')
    await waitFor(() => expect(calls.find((c) => c.path === '/api/training-proof/items/o1/mark')?.body).toEqual({ action: 'bad' }))
  })

  it('2 = תקן: עריכה במקום, Enter שומר "תוקן" עם הטקסט; Esc מבטל', async () => {
    const { calls } = api({ current: round([ocrPublic(0), ocrPublic(1)]) })
    const user = userEvent.setup()
    render(<OcrScreen />)
    await screen.findByText('שורה 1 מתוך 2')
    await user.keyboard('2')
    const ta = await screen.findByLabelText('הטקסט המתוקן')
    expect(ta).toHaveValue('שורה מספר 0')
    await user.clear(ta)
    await user.type(ta, 'שורה מתוקנת{Enter}')
    await waitFor(() => expect(calls.find((c) => c.path === '/api/training-proof/items/o0/mark')?.body).toEqual({ action: 'fixed', text: 'שורה מתוקנת' }))

    // ↓ לשורה השנייה, 2 ואז Esc — שום שמירה
    await user.keyboard('{ArrowDown}2')
    await screen.findByLabelText('הטקסט המתוקן')
    await user.keyboard('{Escape}')
    expect(calls.filter((c) => c.path === '/api/training-proof/items/o1/mark')).toHaveLength(0)
  })

  it('תקן: הסמן בתחילת הטקסט; המילה שתחת הסמן מסומנת בטקסט ובתמונה, ומתעדכנת כשהסמן זז', async () => {
    api({ current: round([ocrPublic(0), ocrPublic(1)]) })
    const user = userEvent.setup()
    render(<OcrScreen />)
    await screen.findByText('שורה 1 מתוך 2')
    await user.keyboard('2')
    const ta = await screen.findByLabelText('הטקסט המתוקן')
    await waitFor(() => expect(ta).toHaveFocus())
    expect(ta.selectionStart).toBe(0)
    expect(ta.selectionEnd).toBe(0)
    const card = document.getElementById('tp-line-o0')
    const textMark = () => card.querySelector('[data-tp-word-text]')?.textContent
    const imgMark = () => card.querySelector('[data-tp-word-mark]')
    expect(textMark()).toBe('שורה')
    // המילה הראשונה = הקטע הימני
    expect(imgMark()).toHaveAttribute('data-tp-word-mark', '0')
    expect(imgMark().style.left).toBe(`${(100 * 400) / 600}%`)

    // הסמן עובר (חיצים / לחיצה) למילה השנייה
    ta.setSelectionRange(7, 7)
    fireEvent.select(ta)
    await waitFor(() => expect(textMark()).toBe('מספר'))
    expect(imgMark()).toHaveAttribute('data-tp-word-mark', '1')

    // הקלדה: מילה רביעית — 4 מילים מול 3 קטעים → רק בטקסט, בלי תיבה שגויה בתמונה
    ta.setSelectionRange(ta.value.length, ta.value.length)
    fireEvent.select(ta)
    await user.type(ta, ' נוספת')
    await waitFor(() => expect(textMark()).toBe('נוספת'))
    expect(imgMark()).toBeNull()

    // יציאה מהעריכה — שום סימון
    await user.keyboard('{Escape}')
    expect(textMark()).toBeUndefined()
    expect(imgMark()).toBeNull()
  })

  it('שורה לטינית: המילה הראשונה היא הקטע השמאלי; עברית ולטינית יחד — רק בטקסט', async () => {
    api({ current: round([ocrPublic(0, { track: 'latin', text: 'In the beginning' }), ocrPublic(1, { text: 'אמר Rashi כאן' })]) })
    const user = userEvent.setup()
    render(<OcrScreen />)
    await screen.findByText('שורה 1 מתוך 2')
    await user.keyboard('2')
    await screen.findByLabelText('הטקסט המתוקן')
    const c0 = document.getElementById('tp-line-o0')
    await waitFor(() => expect(c0.querySelector('[data-tp-word-mark]')).toBeInTheDocument())
    expect(c0.querySelector('[data-tp-word-mark]').style.left).toBe(`${(100 * 20) / 600}%`)
    await user.keyboard('{Escape}{ArrowDown}2')
    await screen.findByLabelText('הטקסט המתוקן')
    const c1 = document.getElementById('tp-line-o1')
    await waitFor(() => expect(c1.querySelector('[data-tp-word-text]')?.textContent).toBe('אמר'))
    expect(c1.querySelector('[data-tp-word-mark]')).toBeNull()
  })

  it('6 = הכתב שגוי — הודעה שהשורה חוזרת לנתב', async () => {
    api({ current: round([ocrPublic(0)]) })
    const user = userEvent.setup()
    render(<OcrScreen />)
    await screen.findByText('שורה 1 מתוך 1')
    await user.keyboard('6')
    await waitFor(() => expect(alert).toHaveBeenCalledWith('הועבר לנתב הכתב', expect.stringMatching(/תחזור להגהה/)))
  })

  it('"דלג" נשאר על המסך ונספר; "קח 30 נוספות" נפתח רק כשהכול טופל', async () => {
    api({
      current: round([ocrPublic(0), ocrPublic(1)]),
      mark: (id, body) =>
        body.action === 'skip'
          ? { status: 200, data: { item: ocrPublic(0, { status: 'available' }), skipped: true } }
          : { status: 200, data: { item: ocrPublic(1, { status: 'submitted', result: body }), skipped: false } },
    })
    const user = userEvent.setup()
    render(<OcrScreen />)
    await screen.findByText('שורה 1 מתוך 2')
    const more = screen.getByRole('button', { name: /קח 30 שורות נוספות/ })
    expect(more).toBeDisabled()
    await user.keyboard('4')
    expect(await screen.findByText(/דילגתם — השורה חזרה למאגר/)).toBeInTheDocument()
    expect(screen.getByText('1 מתוך 2')).toBeInTheDocument()
    await user.keyboard('1')
    await screen.findByText('סיימתם את הסבב')
    expect(screen.getByRole('button', { name: /קח 30 שורות נוספות/ })).toBeEnabled()
    expect(screen.getByText(/1 נכונות · 0 תוקנו · 0 חיתוך גרוע \/ לא קריא · 1 דילגתם/)).toBeInTheDocument()
  })

  it('בלי גישה — ההודעה ו"בקשת גישה"', async () => {
    fakeApi({
      'GET /api/training-proof/round?section=ocr': () => ({ status: 403, data: { error: 'אין לך הרשאת גישה לדף זה', access: 'none' } }),
    })
    render(<OcrScreen />)
    expect(await screen.findByRole('heading', { name: 'אין לך הרשאת גישה לדף זה' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /בקשת גישה/ })).toBeInTheDocument()
  })

  it('החיבור פג (הפניה לדף ההתחברות, HTML) — לא "נשמר", השורה נשארת כמו שהייתה', async () => {
    api({ current: round([ocrPublic(0)]), mark: () => ({ status: 200, data: {}, contentType: 'text/html' }) })
    const user = userEvent.setup()
    render(<OcrScreen />)
    await screen.findByText('שורה 1 מתוך 1')
    await user.keyboard('1')
    await waitFor(() => expect(alert).toHaveBeenCalledWith('השמירה נכשלה', expect.stringMatching(/החיבור לאתר פג/)))
    expect(screen.getByText('שורה מספר 0')).toBeInTheDocument()
    expect(screen.getByText('ממתינה')).toBeInTheDocument()
  })

  it('"לדף הבית" משחרר את מה שלא סומן לפני המעבר', async () => {
    const { calls } = api({ current: round([ocrPublic(0)]) })
    const user = userEvent.setup()
    render(<OcrScreen />)
    await screen.findByText('שורה 1 מתוך 1')
    await user.click(screen.getByRole('button', { name: /לדף הבית/ }))
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/library/page-proof'))
    expect(calls.find((c) => c.path === '/api/training-proof/round/release').body).toEqual({ section: 'ocr' })
    // הכפתורים בשורה עצמה — כולם עם המקש שלהם
    const card = document.getElementById('tp-line-o0')
    expect(within(card).getByRole('button', { name: /הכתב שגוי/ })).toHaveTextContent('6')
  })
})
