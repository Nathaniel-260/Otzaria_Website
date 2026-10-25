import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import ReportsSection from './ReportsSection'

// "דיווחים": מסננים (מצב, קטגוריה, מסכת), חיתוכי האזורים מהסריקה ומהעמוד שלנו, קישור לעמוד, ושינוי
// מצב עם הערה (PATCH reports/[id] {status, note}).

const API = '/api/admin/tzurat-hadaf'

const report = (id, extra = {}) => ({
  id,
  page: 'p1',
  slug: 'berakhot',
  masechet: 'ברכות',
  daf: 'ב:',
  category: 'linebreak',
  text: 'השורה נשברת מוקדם מדי',
  status: 'new',
  userName: 'יהודה',
  createdAt: '2026-10-22T09:00:00Z',
  scanUrl: '/api/tzurat-hadaf/pages/p1/image?side=scan',
  oursUrl: '/api/tzurat-hadaf/pages/p1/image?side=ours',
  regions: [
    { side: 'scan', x: 0.1, y: 0.2, w: 0.3, h: 0.05 },
    { side: 'ours', x: 0.15, y: 0.25, w: 0.3, h: 0.05 },
  ],
  ...extra,
})

function mockServer(reports = [report('r1')], { fail = false } = {}) {
  const patches = []
  const gets = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, init = {}) => {
      const method = init.method || 'GET'
      const reply = (status, json) => ({ ok: status < 400, status, json: async () => json })
      if (url === `${API}/batches`) return reply(200, { batches: [{ slug: 'berakhot', masechet: 'ברכות', order: 1 }] })
      if (url.startsWith(`${API}/reports?`) || url === `${API}/reports`) {
        gets.push(url)
        return reply(200, { reports, total: reports.length })
      }
      const m = url.match(/\/reports\/(\w+)$/)
      if (m && method === 'PATCH') {
        const body = JSON.parse(init.body)
        patches.push({ id: m[1], body })
        if (fail) return reply(400, { error: 'מצב לא מוכר' })
        return reply(200, { report: { ...reports.find((r) => r.id === m[1]), status: body.status, resolution: { note: body.note } } })
      }
      throw new Error(`fetch לא צפוי: ${method} ${url}`)
    })
  )
  return { patches, gets }
}

afterEach(() => vi.unstubAllGlobals())

describe('ReportsSection', () => {
  it('מציג דיווח עם חיתוכי האזורים, המדווח וקישור לעמוד', async () => {
    const { gets } = mockServer()
    render(<ReportsSection />)
    const card = await screen.findByTestId('admin-report')
    expect(gets[0]).toBe(`${API}/reports?status=new&page=1`)
    expect(card.textContent).toContain('השורה נשברת מוקדם מדי')
    expect(card.textContent).toContain('שבירת שורה')
    expect(card.textContent).toContain('יהודה')
    const imgs = within(card).getAllByRole('img').map((i) => i.getAttribute('src'))
    expect(imgs).toEqual([
      '/api/tzurat-hadaf/pages/p1/image?side=scan&x=0.1&y=0.2&w=0.3&h=0.05',
      '/api/tzurat-hadaf/pages/p1/image?side=ours&x=0.15&y=0.25&w=0.3&h=0.05',
    ])
    expect(within(card).getByRole('link', { name: /פתח את העמוד/ }).getAttribute('href')).toBe('/library/tzurat-hadaf/review?page=p1')
  })

  it('שינוי מצב עם הערה — PATCH והתגית מתעדכנת', async () => {
    const { patches } = mockServer()
    render(<ReportsSection />)
    const card = await screen.findByTestId('admin-report')
    const save = within(card).getByRole('button', { name: 'שמירה' })
    expect(save).toBeDisabled()
    fireEvent.change(within(card).getByLabelText('מצב'), { target: { value: 'fixed' } })
    fireEvent.change(within(card).getByLabelText('הערה לדיווח'), { target: { value: 'תוקן בבנייה 33' } })
    fireEvent.click(save)
    await waitFor(() => expect(patches).toEqual([{ id: 'r1', body: { status: 'fixed', note: 'תוקן בבנייה 33' } }]))
    await waitFor(() => expect(within(card).getAllByText('תוקן').length).toBeGreaterThan(1))
    expect(within(card).getByRole('button', { name: 'שמירה' })).toBeDisabled()
  })

  it('שגיאה בשמירה — מוצגת', async () => {
    mockServer([report('r1')], { fail: true })
    render(<ReportsSection />)
    const card = await screen.findByTestId('admin-report')
    fireEvent.change(within(card).getByLabelText('מצב'), { target: { value: 'wontfix' } })
    fireEvent.click(within(card).getByRole('button', { name: 'שמירה' }))
    expect((await within(card).findByRole('alert')).textContent).toBe('מצב לא מוכר')
  })

  it('מסננים — מצב, קטגוריה ומסכת', async () => {
    const { gets } = mockServer()
    render(<ReportsSection />)
    await screen.findByTestId('admin-report')
    const filters = screen.getAllByLabelText('מצב')[0]
    fireEvent.change(filters, { target: { value: 'all' } })
    fireEvent.change(screen.getByLabelText('קטגוריה'), { target: { value: 'size' } })
    await screen.findByRole('option', { name: 'ברכות' })
    fireEvent.change(screen.getByLabelText('מסכת'), { target: { value: 'berakhot' } })
    await waitFor(() => expect(gets.at(-1)).toBe(`${API}/reports?category=size&slug=berakhot&page=1`))
  })

  it('בלי scanUrl — חיתוך דרך תמונת העמוד', async () => {
    mockServer([report('r2', { scanUrl: undefined, oursUrl: undefined, regions: [{ side: 'scan', x: 0, y: 0, w: 0.5, h: 0.5 }] })])
    render(<ReportsSection />)
    const card = await screen.findByTestId('admin-report')
    expect(within(card).getByRole('img').getAttribute('src')).toBe('/api/tzurat-hadaf/pages/p1/image?side=scan&x=0&y=0&w=0.5&h=0.5')
  })
})
