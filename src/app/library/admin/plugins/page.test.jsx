import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const showAlert = vi.fn()
const showConfirm = vi.fn(async () => true)
vi.mock('@/components/providers/DialogContext', () => ({ useDialog: () => ({ showAlert, showConfirm }) }))
vi.mock('./StoreLayoutTab', () => ({ default: () => null }))
vi.mock('@/components/admin/servicePlugins/ServicePluginsAdmin', () => ({ default: () => null }))

import AdminPluginsPage from './page'

const base = { status: 'stable', version: '1.0.0', shortDescription: 'תיאור', author: 'מפתח', createdAt: '2026-10-01T10:00:00Z' }
const APPROVED = [
  { ...base, _id: 'svc1', name: 'תוסף שירות', hasService: true },
  { ...base, _id: 'reg1', name: 'תוסף רגיל' }
]

let routes
const json = (body, status = 200) => new Response(JSON.stringify(body), { status })

beforeEach(() => {
  showAlert.mockReset()
  showConfirm.mockClear()
  routes = {
    'GET /api/admin/plugins?status=pending': () => json([]),
    'GET /api/admin/plugins?status=approved': () => json(APPROVED),
    'GET /api/admin/plugin-categories': () => json([])
  }
  vi.stubGlobal('fetch', vi.fn(async (input, init) => {
    const handler = routes[`${init?.method || 'GET'} ${String(input)}`]
    return handler ? handler() : json({ error: 'unexpected' }, 500)
  }))
})
afterEach(() => vi.unstubAllGlobals())

async function openApproved() {
  render(<AdminPluginsPage />)
  await userEvent.click(await screen.findByRole('button', { name: /^מאושרים/ }))
  await screen.findByRole('heading', { name: 'תוסף שירות' })
}

const cardOf = (name) => screen.getByRole('heading', { name }).closest('.glass')

describe('ניהול תוספים — ביטול אישור', () => {
  it('לתוסף שירות אין "בטל אישור" — הפניה להשהיה; לתוסף רגיל הכפתור נשאר', async () => {
    await openApproved()
    const service = within(cardOf('תוסף שירות'))
    expect(service.queryByRole('button', { name: /בטל אישור/ })).toBeNull()
    expect(service.getByText(/השהו אותו/)).toBeInTheDocument()
    expect(service.getByRole('button', { name: /השהה/ })).toBeInTheDocument()
    expect(within(cardOf('תוסף רגיל')).getByRole('button', { name: /בטל אישור/ })).toBeInTheDocument()
  })

  it('שגיאת השרת מוצגת בעברית כפי שהיא', async () => {
    routes['PATCH /api/admin/plugins/reg1'] = () => json({ error: 'לא ניתן לבטל אישור של תוסף שירות — יש להשהות אותו', code: 'service_plugin_unapprove_blocked' }, 409)
    await openApproved()
    await userEvent.click(within(cardOf('תוסף רגיל')).getByRole('button', { name: /בטל אישור/ }))
    await waitFor(() => expect(showAlert).toHaveBeenCalledWith('שגיאה', 'לא ניתן לבטל אישור של תוסף שירות — יש להשהות אותו'))
  })

  it('תשובה בלי גוף — הודעת ברירת מחדל', async () => {
    routes['PATCH /api/admin/plugins/reg1'] = () => new Response('', { status: 500 })
    await openApproved()
    await userEvent.click(within(cardOf('תוסף רגיל')).getByRole('button', { name: /בטל אישור/ }))
    await waitFor(() => expect(showAlert).toHaveBeenCalledWith('שגיאה', 'לא הצלחנו לבטל את האישור'))
  })
})
