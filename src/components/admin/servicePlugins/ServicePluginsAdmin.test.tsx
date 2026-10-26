import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'

const showAlert = vi.fn()
const showConfirm = vi.fn(async () => true)
vi.mock('@/components/providers/DialogContext', () => ({ useDialog: () => ({ showAlert, showConfirm }) }))

import ServicePluginsAdmin from './ServicePluginsAdmin'

function review(overrides: Record<string, unknown>) {
  return {
    id: 'r1', pluginId: 'p1', pluginName: 'שירות א', kind: 'service', status: 'pending_admin', pluginVersion: '1.0.0',
    serviceVersion: '1.0.0', ownerName: 'מפתח', createdAt: '2026-10-01T00:00:00Z', selectedAt: null, attempts: 0,
    nextAttemptAt: null, lastError: null, decision: null, cooldown: { blocked: false, nextAllowedAt: null },
    adminException: false, canRollback: false, ...overrides
  }
}

let adminBody: unknown
const fetchSpy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input)
  if (url === '/api/service-plugins/admin') return new Response(JSON.stringify(adminBody), { status: 200 })
  if (url.startsWith('/api/service-plugins/admin/') && init?.method === 'POST') return new Response('{"ok":true}', { status: 200 })
  return new Response('{}', { status: 404 })
})

beforeEach(() => {
  showAlert.mockReset(); showConfirm.mockClear(); fetchSpy.mockClear()
  vi.stubGlobal('fetch', fetchSpy)
})
afterEach(() => vi.unstubAllGlobals())

describe('ServicePluginsAdmin', () => {
  it('הסבר ההגנות, השהיית מכסה, ותקלה תפעולית בנפרד עם הנחיה לאחראי השרת', async () => {
    adminBody = {
      control: { quotaPausedUntil: new Date(Date.now() + 3600_000).toISOString(), lock: null },
      reviews: [
        review({ id: 'a' }),
        review({ id: 'b', pluginId: 'p2', pluginName: 'שירות ב', status: 'needs_operator', lastError: { class: 'operator', code: 'gh_auth', message: 'gh לא מחובר' } })
      ]
    }
    render(<ServicePluginsAdmin />)
    expect(await screen.findByText(/סקירת המקור בידי AI חלקית/)).toBeInTheDocument()
    expect(screen.getByText(/תור הסקירה מושהה עד/)).toBeInTheDocument()
    const operator = screen.getByRole('heading', { name: /תקלות תפעוליות/ }).closest('section') as HTMLElement
    expect(within(operator).getByText('תקלה תפעולית — יש להעביר לאחראי השרת')).toBeInTheDocument()
    expect(within(operator).getByText('gh_auth')).toBeInTheDocument()
    expect(within(operator).getByRole('button', { name: /ניסיון חוזר/ })).toBeInTheDocument()
  })

  it('"בחר בתוסף והתחל בדיקה" — אישור שמסביר פרסום מותנה, ואז POST start', async () => {
    adminBody = { control: { quotaPausedUntil: null, lock: null }, reviews: [review({})] }
    render(<ServicePluginsAdmin />)
    fireEvent.click(await screen.findByRole('button', { name: /בחר בתוסף והתחל בדיקה/ }))
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith('/api/service-plugins/admin/p1', expect.objectContaining({ method: 'POST' })))
    expect(showConfirm).toHaveBeenCalledWith('בחירה והתחלת בדיקה', expect.stringContaining('אישור פרסום מותנה'), 'בחר והתחל בדיקה')
    const call = fetchSpy.mock.calls.find(([u]) => String(u) === '/api/service-plugins/admin/p1')!
    expect(JSON.parse(String(call[1]!.body))).toEqual({ action: 'start', jobId: 'r1' })
  })

  it('21 יום — חריגת חירום דרך חלון עם סיבה', async () => {
    adminBody = { control: { quotaPausedUntil: null, lock: null }, reviews: [review({ cooldown: { blocked: true, nextAllowedAt: '2026-11-01T00:00:00Z' } })] }
    render(<ServicePluginsAdmin />)
    fireEvent.click(await screen.findByRole('button', { name: /חריגת חירום/ }))
    const dialog = await screen.findByRole('dialog', { name: 'חריגת חירום' })
    const submit = within(dialog).getByRole('button', { name: /אשר חריגה/ })
    expect(submit).toBeDisabled()
    fireEvent.change(within(dialog).getByLabelText(/^סיבה/), { target: { value: 'תיקון אבטחה דחוף' } })
    fireEvent.click(submit)
    await waitFor(() => expect(showAlert).toHaveBeenCalledWith('החריגה אושרה', expect.any(String)))
    const call = fetchSpy.mock.calls.find(([u]) => String(u) === '/api/service-plugins/admin/p1')!
    expect(JSON.parse(String(call[1]!.body))).toEqual({ action: 'emergency', jobId: 'r1', reason: 'תיקון אבטחה דחוף' })
  })

  it('תכונה כבויה (404) — הודעה', async () => {
    fetchSpy.mockImplementationOnce(async () => new Response('{"error":"disabled"}', { status: 404 }))
    render(<ServicePluginsAdmin />)
    expect(await screen.findByText(/תוספי השירות כבויים באתר/)).toBeInTheDocument()
  })
})
