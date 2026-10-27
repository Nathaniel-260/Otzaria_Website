import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { fakeApi, routerPublic } from '../testing/fakeApi'

// מסך נתב-הכתב: 1–4 לשורה (נשמר ועובר הלאה), Enter = ההצעה, 0 = פסול, ובשורה מעורבת —
// מסגרת לכל מילה עם שם הכתב מעליה, 1–4 למילה (4 = ניטרלי), ←→ בין מילים, Tab לשורה,
// ושמירה רק כשלכל מילה יש כתב.

const nav = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => nav }))
const alert = vi.hoisted(() => vi.fn())
vi.mock('@/components/providers/DialogContext', () => ({ useDialog: () => ({ showAlert: alert }) }))

import RouterScreen from './RouterScreen'

const words = [
  { k: 0, box: [400, 2, 530, 50], pred: 'square', text: '' },
  { k: 1, box: [250, 2, 390, 50], pred: 'rashi', text: '' },
  { k: 2, box: [20, 2, 240, 50], pred: 'rashi', text: '' },
]

function api(items) {
  return fakeApi({
    'GET /api/training-proof/round?section=router': () => ({ status: 200, data: { round: 'r1', items, open: items.length, done: false } }),
    'POST /api/training-proof/items/*': (body, path) => {
      const id = path.split('/')[4]
      const base = items.find((i) => i.id === id)
      return {
        status: 200,
        data: { item: { ...base, status: 'submitted', result: body.bad ? { label: '', bad: true } : { ...body, bad: false } }, skipped: false },
      }
    },
    'POST /api/training-proof/round/heartbeat': () => ({ status: 200, data: { open: 1 } }),
  })
}
const marks = (calls, id) => calls.filter((c) => c.path === `/api/training-proof/items/${id}/mark`).map((c) => c.body)

beforeEach(() => {
  vi.clearAllMocks()
  Element.prototype.scrollIntoView = vi.fn()
})
afterEach(() => vi.unstubAllGlobals())

describe('RouterScreen', () => {
  it('1–4 לשורה: נשמר מיד ועוברים לשורה הבאה; 0 = פסול', async () => {
    const { calls } = api([routerPublic(0), routerPublic(1), routerPublic(2)])
    const user = userEvent.setup()
    render(<RouterScreen />)
    await screen.findByText('שורה 1 מתוך 3')
    await user.keyboard('1')
    await waitFor(() => expect(marks(calls, 'r0')).toEqual([{ label: 'square' }]))
    await waitFor(() => expect(document.getElementById('tp-line-r1')).toHaveAttribute('aria-current', 'true'))
    await user.keyboard('0')
    await waitFor(() => expect(marks(calls, 'r1')).toEqual([{ bad: true }]))
    expect(await screen.findByText('נפסלה — לא תיכנס לאימון')).toBeInTheDocument()
  })

  it('Enter = ההצעה של הנתב; בלי הצעה — הודעה ולא נשמר', async () => {
    const { calls } = api([routerPublic(0, { pred: 'latin' }), routerPublic(1, { pred: null })])
    const user = userEvent.setup()
    render(<RouterScreen />)
    await screen.findByText('שורה 1 מתוך 2')
    await user.keyboard('{Enter}')
    await waitFor(() => expect(marks(calls, 'r0')).toEqual([{ label: 'latin' }]))
    await waitFor(() => expect(document.getElementById('tp-line-r1')).toHaveAttribute('aria-current', 'true'))
    await user.keyboard('{Enter}')
    await waitFor(() => expect(alert).toHaveBeenCalledWith('חסר כתב', expect.stringMatching(/אין לנתב הצעה/)))
    expect(marks(calls, 'r1')).toEqual([])
  })

  it('שורה מעורבת: מסגרת לכל מילה ושם הכתב מעליה; 1–4 למילה, נשמר רק כשהכול סומן', async () => {
    const { calls } = api([routerPublic(0, { pred: 'mixed', words }), routerPublic(1)])
    const user = userEvent.setup()
    render(<RouterScreen />)
    await screen.findByText('שורה 1 מתוך 2')
    const card = document.getElementById('tp-line-r0')
    // שלוש מסגרות, עם ההצעה כתווית (מקווקו = הצעה)
    const boxes = within(card).getAllByRole('button', { name: /^מילה \d/ })
    expect(boxes).toHaveLength(3)
    expect(boxes[0]).toHaveAccessibleName('מילה 1: מרובע (הצעה)')
    expect(boxes[0].querySelector('span')).toHaveTextContent('מרובע')
    expect(boxes[0].className).toMatch(/border-dashed/)

    // המקשים חלים על המילים: 1 = מרובע למילה 1, 4 = ניטרלי למילה 2
    await user.keyboard('14')
    expect(marks(calls, 'r0')).toEqual([])
    expect(within(card).getByText(/חסר כתב ל-1 מילים/)).toBeInTheDocument()
    await user.keyboard('2')
    await waitFor(() =>
      expect(marks(calls, 'r0')).toEqual([
        {
          label: 'mixed',
          words: [
            { k: 0, box: words[0].box, label: 'square' },
            { k: 1, box: words[1].box, label: 'neutral' },
            { k: 2, box: words[2].box, label: 'rashi' },
          ],
        },
      ])
    )
    expect(within(card).getByRole('button', { name: 'מילה 2: ניטרלי' }).className).toMatch(/border-solid/)
  })

  it('שורה מעורבת: Enter ממלא את ההצעה למילים שלא סומנו; ← בוחר את המילה הבאה', async () => {
    const { calls } = api([routerPublic(0, { pred: 'mixed', words })])
    const user = userEvent.setup()
    render(<RouterScreen />)
    await screen.findByText('שורה 1 מתוך 1')
    await user.keyboard('{ArrowLeft}3{Enter}')
    await waitFor(() => expect(marks(calls, 'r0').at(-1).words.map((w) => w.label)).toEqual(['square', 'latin', 'rashi']))
  })

  it('Tab מחזיר את המקשים לשורה: 2 = רש"י לשורה כולה', async () => {
    const { calls } = api([routerPublic(0, { pred: 'mixed', words })])
    const user = userEvent.setup()
    render(<RouterScreen />)
    await screen.findByText('שורה 1 מתוך 1')
    await user.keyboard('{Tab}2')
    await waitFor(() => expect(marks(calls, 'r0')).toEqual([{ label: 'rashi' }]))
  })

  it('בחירה במעורבת בשורה בלי מילים מהתחנה — חלוקה לפי הדיו (words_src: site)', async () => {
    // תמונה מדומה: הדפדפן של הבדיקות לא מצייר — Image נטען, canvas מחזיר שתי "מילים"
    const W = 60
    const H = 10
    const data = new Uint8ClampedArray(W * H * 4).fill(255)
    for (let y = 2; y < 8; y++)
      for (const [a, b] of [[5, 20], [35, 55]]) for (let x = a; x < b; x++) data.set([0, 0, 0, 255], (y * W + x) * 4)
    HTMLCanvasElement.prototype.getContext = () => ({ drawImage() {}, getImageData: () => ({ data }) })
    class FakeImage {
      naturalWidth = W
      naturalHeight = H
      set src(_) {
        setTimeout(() => this.onload?.(), 0)
      }
    }
    vi.stubGlobal('Image', FakeImage)
    const { calls } = api([routerPublic(0, { pred: 'rashi', words: null, w: W, h: H })])
    const user = userEvent.setup()
    render(<RouterScreen />)
    await screen.findByText('שורה 1 מתוך 1')
    await user.keyboard('4')
    const card = document.getElementById('tp-line-r0')
    await waitFor(() => expect(within(card).getAllByRole('button', { name: /^מילה \d/ })).toHaveLength(2))
    // בלי הצעה מהנתב — "?" מעל המסגרת, לא "ניטרלי"
    expect(within(card).getByRole('button', { name: 'מילה 1: עוד לא סומנה' }).querySelector('span')).toHaveTextContent('?')
    await user.keyboard('12')
    await waitFor(() =>
      expect(marks(calls, 'r0').at(-1)).toEqual({
        label: 'mixed',
        words: [
          { k: 0, box: [35, 2, 55, 8], label: 'square' },
          { k: 1, box: [5, 2, 20, 8], label: 'rashi' },
        ],
      })
    )
  })
})
