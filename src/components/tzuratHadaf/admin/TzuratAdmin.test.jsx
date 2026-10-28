import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import TzuratAdmin from './TzuratAdmin'
import ExportCard from './ExportCard'
import GuideEditorCard from './GuideEditorCard'
import UploadsSection from './UploadsSection'

// מסך הניהול: לשוניות (ונשמרות ב-hash), "סקירה" מ-GET stats, טבלת החבילות (השהיה/חידוש),
// ההעלאות האחרונות ("נסה שוב"), הייצוא (קישור והורדה) ועורך ההנחיות.

const { showConfirm, showAlert } = vi.hoisted(() => ({ showConfirm: vi.fn(), showAlert: vi.fn() }))
vi.mock('@/components/providers/DialogContext', () => ({ useDialog: () => ({ showConfirm, showAlert }) }))
vi.mock('@/components/pageProof/guide/GuideBody', () => ({ default: ({ html }) => <div data-testid="guide-body">{html}</div> }))

const API = '/api/admin/tzurat-hadaf'
const reply = (status, json) => ({ ok: status < 400, status, json: async () => json, blob: async () => new Blob(['{"type":"meta"}\n']) })

const STATS = {
  books: [
    { slug: 'shabbat', masechet: 'שבת', order: 2, pages: 314, pagesOpen: 300, pagesDone: 14, items: 900, itemsOpen: 800, itemsAgreed: 90, itemsDisputed: 10 },
    { slug: 'berakhot', masechet: 'ברכות', order: 1, pages: 125, pagesOpen: 25, pagesDone: 100, items: 400, itemsOpen: 100, itemsAgreed: 280, itemsDisputed: 20 },
  ],
  items: { byStatus: { open: 900, disputed: 30, agreed: 370 }, byKind: { g: 1000, r: 300 } },
  submissions: { byStatus: { submitted: 4, approved: 20 } },
  reports: { byStatus: { new: 3 } },
  volunteers: { total: 42, active7d: 11 },
  uploads: [],
}

function mockServer(extra = {}) {
  const calls = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, init = {}) => {
      const method = init.method || 'GET'
      calls.push({ url, method, body: init.body ? JSON.parse(init.body) : null })
      for (const [k, fn] of Object.entries(extra)) if (`${method} ${url}`.startsWith(k)) return fn(init)
      if (url === `${API}/stats`) return reply(200, STATS)
      if (url === `${API}/batches`) return reply(200, { batches: [{ slug: 'berakhot', masechet: 'ברכות', order: 1, buildId: '5f143e8+v32', pages: 125, items: 400, status: 'active', importedAt: '2026-10-25T21:00:00Z' }] })
      if (url === `${API}/uploads`) return reply(200, { uploads: [{ id: 'u9', name: 'berakhot.zip', size: 300 * 1024 ** 2, status: 'failed', errors: ['images/002a.scan.png חסר'], startedAt: '2026-10-25T21:00:00Z' }] })
      if (url.startsWith(`${API}/batches/`) && method === 'PATCH') return reply(200, { batch: { status: JSON.parse(init.body).status } })
      if (url === `${API}/uploads/u9/retry`) return reply(202, {})
      return reply(404, { error: `לא צפוי ${method} ${url}` })
    })
  )
  return { calls }
}

beforeEach(() => {
  vi.clearAllMocks()
  window.history.replaceState(null, '', '/library/admin/tzurat-hadaf')
})
afterEach(() => vi.unstubAllGlobals())

describe('TzuratAdmin', () => {
  it('"סקירה" כברירת מחדל: מסכתות לפי הסדר, פילוח ומתנדבים', async () => {
    mockServer()
    render(<TzuratAdmin />)
    const books = await screen.findByTestId('overview-books')
    const rows = within(books).getAllByRole('row').slice(1)
    expect(rows.map((r) => r.cells[0].textContent)).toEqual(['ברכות', 'שבת'])
    expect(rows[0].textContent).toContain('100 / 125')
    expect(within(rows[0]).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '80')
    expect(screen.getByTestId('overview-volunteers').textContent).toContain('11')
    expect(screen.getByTestId('overview-counts').textContent).toContain('במחלוקת')
    expect(screen.getByTestId('overview-counts').textContent).toContain('רש"י')
  })

  it('מעבר בין לשוניות — רק הפעילה מוצגת, וה-hash מתעדכן', async () => {
    mockServer()
    render(<TzuratAdmin />)
    await screen.findByTestId('overview-books')
    fireEvent.click(screen.getByRole('tab', { name: /ייצוא/ }))
    expect(screen.getByTestId('export-card')).toBeInTheDocument()
    expect(screen.queryByTestId('overview-books')).toBeNull()
    expect(window.location.hash).toBe('#export')
    expect(screen.getByRole('tab', { name: /ייצוא/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('נפתח בלשונית מה-hash', async () => {
    mockServer()
    window.history.replaceState(null, '', '#tokens')
    render(<TzuratAdmin />)
    expect(await screen.findByTestId('tokens-card')).toBeInTheDocument()
  })
})

describe('UploadsSection', () => {
  it('חבילות: השהיה ← PATCH, והמצב מתעדכן; העלאה שנכשלה: "נסה שוב"', async () => {
    const { calls } = mockServer()
    render(<UploadsSection />)
    const batches = await screen.findByTestId('batches')
    await within(batches).findByText('פעילה')
    fireEvent.click(within(batches).getByRole('button', { name: 'השהיה ברכות' }))
    await within(batches).findByText('מושהית')
    expect(calls.find((c) => c.method === 'PATCH')).toMatchObject({ url: `${API}/batches/berakhot`, body: { status: 'paused' } })
    expect(within(batches).getByRole('button', { name: 'חידוש ברכות' })).toBeInTheDocument()

    const recent = screen.getByTestId('recent-uploads')
    expect(await within(recent).findByText('images/002a.scan.png חסר')).toBeInTheDocument()
    fireEvent.click(within(recent).getByRole('button', { name: 'נסה שוב את berakhot.zip' }))
    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.url === `${API}/uploads/u9/retry`)).toBe(true))
  })
})

describe('ExportCard', () => {
  it('ייצוא מלא ומאז תאריך — הורדה, ושגיאה מוצגת', async () => {
    mockServer({
      [`GET ${API}/export?`]: () => reply(403, { error: 'אין הרשאה' }),
      [`GET ${API}/export`]: () => reply(200, {}),
    })
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<ExportCard />)
    fireEvent.click(screen.getByRole('button', { name: /ייצוא מלא/ }))
    await screen.findByText(/^הורד/)
    expect(click).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0][0]).toBe(`${API}/export`)

    fireEvent.click(screen.getByRole('checkbox', { name: 'תורמים' }))
    fireEvent.change(screen.getByLabelText('ייצוא מאז תאריך'), { target: { value: '2026-10-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'ייצוא מאז התאריך' }))
    expect((await screen.findByRole('alert')).textContent).toBe('אין הרשאה')
    const u = new URL(fetch.mock.calls.at(-1)[0], 'http://x')
    expect(u.searchParams.get('types')).toBe('decisions,anchors,checks,reports')
    expect(u.searchParams.get('since')).toBeTruthy()
    click.mockRestore()
  })
})

describe('GuideEditorCard (צורת הדף)', () => {
  it('טוען, תצוגה מקדימה ושמירה מול api/admin/tzurat-hadaf/guide', async () => {
    const { calls } = mockServer({
      [`GET ${API}/guide`]: () => reply(200, { saved: null, default: '<section><h2>פתיחה</h2></section>', codes: { figures: ['[[איור:חיתוך]]'], buttons: [], values: [] } }),
      [`PUT ${API}/guide`]: (init) => (JSON.parse(init.body).preview ? reply(200, { preview: { html: 'PREVIEW', toc: [], unknown: [] } }) : reply(200, { ok: true, unknown: [] })),
    })
    render(<GuideEditorCard />)
    const area = await screen.findByLabelText('תוכן דף ההנחיות (HTML)')
    expect(area.value).toContain('פתיחה')
    expect(screen.getByRole('link', { name: 'פתח את הדף' }).getAttribute('href')).toBe('/docs/tzurat-hadaf')
    fireEvent.click(screen.getByRole('button', { name: 'תצוגה מקדימה' }))
    expect((await screen.findByTestId('guide-body')).textContent).toBe('PREVIEW')
    fireEvent.change(area, { target: { value: '<section><h2>חדש</h2></section>' } })
    fireEvent.click(screen.getByRole('button', { name: 'שמור ועדכן את הדף' }))
    await waitFor(() => expect(showAlert).toHaveBeenCalledWith('נשמר', 'דף ההנחיות עודכן.'))
    expect(calls.filter((c) => c.method === 'PUT').map((c) => c.body)).toEqual([
      { html: '<section><h2>פתיחה</h2></section>', preview: true },
      { html: '<section><h2>חדש</h2></section>' },
    ])
  })
})
