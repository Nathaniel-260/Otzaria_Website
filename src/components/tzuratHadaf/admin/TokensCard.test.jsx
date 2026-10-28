import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import TokensCard from './TokensCard'

// "מפתחות API" של צורת הדף (tht_): רשימה, יצירה (המפתח מוצג פעם אחת), ביטול באישור, תקרה.
// התגובות בלי success (CONTRACT.md) — ההצלחה לפי res.ok.

const { showConfirm, showAlert } = vi.hoisted(() => ({ showConfirm: vi.fn(), showAlert: vi.fn() }))
vi.mock('@/components/providers/DialogContext', () => ({ useDialog: () => ({ showConfirm, showAlert }) }))

const BASE = '/api/admin/tzurat-hadaf/tokens'
const SECRET = `tht_${'Q'.repeat(43)}`
const T = (id, extra = {}) => ({
  id,
  name: `מפתח ${id}`,
  prefix: 'tht_Ab12',
  scopes: ['read', 'review', 'import'],
  createdAt: '2026-10-01T10:00:00.000Z',
  expiresAt: '2027-03-30T10:00:00.000Z',
  lastUsedAt: null,
  state: 'active',
  ...extra,
})

function mockServer({ tokens = [T('t1'), T('t2', { state: 'revoked' })], createReply } = {}) {
  let list = tokens
  const calls = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, init = {}) => {
      const method = init.method || 'GET'
      const body = init.body ? JSON.parse(init.body) : null
      calls.push({ url, method, body })
      const reply = (status, json) => ({ ok: status < 400, status, json: async () => json })
      if (url === BASE && method === 'GET') return reply(200, { tokens: list, active: list.filter((t) => t.state === 'active').length, max: 5 })
      if (url === BASE && method === 'POST') {
        if (createReply) return reply(createReply.status, createReply.json)
        const item = T('new', { name: body.name, scopes: body.scopes })
        list = [item, ...list]
        return reply(201, { token: SECRET, item })
      }
      const m = url.match(/\/tokens\/(\w+)$/)
      if (m && method === 'DELETE') {
        list = list.map((t) => (t.id === m[1] ? { ...t, state: 'revoked' } : t))
        return reply(200, { item: list.find((t) => t.id === m[1]) })
      }
      throw new Error(`fetch לא צפוי: ${method} ${url}`)
    })
  )
  return { calls }
}

beforeEach(() => {
  vi.clearAllMocks()
  showConfirm.mockImplementation((_t, _m, action) => action())
})
afterEach(() => vi.unstubAllGlobals())

describe('TokensCard (צורת הדף)', () => {
  it('רשימה: prefix, הרשאות בעברית, ביטול רק לפעיל', async () => {
    mockServer()
    render(<TokensCard />)
    const table = await screen.findByTestId('tokens-table')
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows[0].textContent).toContain('tht_Ab12…')
    expect(rows[0].textContent).toContain('קריאה · הכרעה · ייבוא')
    expect(rows[0].textContent).toContain('לא נעשה שימוש')
    expect(within(rows[0]).getByRole('button', { name: 'ביטול המפתח מפתח t1' })).toBeInTheDocument()
    expect(within(rows[1]).queryByRole('button')).toBeNull()
    expect(rows[1].textContent).toContain('בוטל')
  })

  it('יצירה: שולח שם/ימים/הרשאות, מציג את המפתח פעם אחת, ונעלם אחרי "הסתר"', async () => {
    const { calls } = mockServer()
    render(<TokensCard />)
    await screen.findByTestId('tokens-table')
    fireEvent.change(screen.getByLabelText('שם המפתח'), { target: { value: 'site_pull' } })
    fireEvent.change(screen.getByLabelText('תוקף (ימים)'), { target: { value: '30' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /^ייבוא/ }))
    fireEvent.click(screen.getByRole('button', { name: /צור מפתח/ }))
    expect((await screen.findByTestId('token-value')).textContent).toBe(SECRET)
    expect(calls.find((c) => c.method === 'POST').body).toEqual({ name: 'site_pull', days: 30, scopes: ['read', 'review'] })
    fireEvent.click(screen.getByRole('button', { name: /הסתר את המפתח/ }))
    expect(screen.queryByTestId('token-value')).toBeNull()
    await waitFor(() => expect(screen.getByTestId('tokens-table').textContent).toContain('site_pull'))
  })

  it('שגיאת שרת ביצירה — הודעה, בלי מפתח', async () => {
    mockServer({ createReply: { status: 409, json: { error: 'יש כבר 5 מפתחות פעילים' } } })
    render(<TokensCard />)
    await screen.findByTestId('tokens-table')
    fireEvent.click(screen.getByRole('button', { name: /צור מפתח/ }))
    await waitFor(() => expect(showAlert).toHaveBeenCalledWith('שגיאה', 'יש כבר 5 מפתחות פעילים'))
    expect(screen.queryByTestId('token-value')).toBeNull()
  })

  it('ביטול: DELETE באישור, והרשימה מתעדכנת', async () => {
    const { calls } = mockServer()
    render(<TokensCard />)
    fireEvent.click(await screen.findByRole('button', { name: 'ביטול המפתח מפתח t1' }))
    await waitFor(() => expect(calls.some((c) => c.method === 'DELETE' && c.url === `${BASE}/t1`)).toBe(true))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'ביטול המפתח מפתח t1' })).toBeNull())
  })

  it('בלי אישור — לא נשלח דבר', async () => {
    showConfirm.mockImplementation(() => {})
    const { calls } = mockServer()
    render(<TokensCard />)
    fireEvent.click(await screen.findByRole('button', { name: 'ביטול המפתח מפתח t1' }))
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false)
  })

  it('5 פעילים — היצירה כבויה', async () => {
    mockServer({ tokens: ['a', 'b', 'c', 'd', 'e'].map((id) => T(id)) })
    render(<TokensCard />)
    await screen.findByTestId('tokens-table')
    expect(screen.getByRole('button', { name: /צור מפתח/ })).toBeDisabled()
    expect(screen.getByText(/יש כבר 5 מפתחות פעילים/)).toBeInTheDocument()
  })
})
