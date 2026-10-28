import { describe, it, expect, vi } from 'vitest'
import { API, NETWORK_ERROR, apiCall, pageCount, pageImageUrl, query, withRegion } from './adminApi'
import { exportUrl } from './ExportCard'

describe('apiCall', () => {
  it('JSON עם method ו-body, הצלחה לפי res.ok', async () => {
    const fetchFn = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ x: 1 }) }))
    const r = await apiCall('items/1', { method: 'PATCH', body: { action: 'reopen' }, fetchFn })
    expect(r).toMatchObject({ ok: true, data: { x: 1 } })
    const [url, init] = fetchFn.mock.calls[0]
    expect(url).toBe(`${API}/items/1`)
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body)).toEqual({ action: 'reopen' })
  })
  it('שגיאה מהשרת — error ו-code', async () => {
    const fetchFn = async () => ({ ok: false, status: 409, json: async () => ({ error: 'כבר נסגר', code: 'closed' }) })
    expect(await apiCall('x', { fetchFn })).toMatchObject({ ok: false, status: 409, error: 'כבר נסגר', code: 'closed' })
  })
  it('תשובה שאינה JSON / אין רשת', async () => {
    const bad = async () => ({ ok: false, status: 502, json: async () => JSON.parse('<html>') })
    expect((await apiCall('x', { fetchFn: bad })).error).toContain('502')
    const down = async () => {
      throw new TypeError('Failed to fetch')
    }
    expect(await apiCall('x', { fetchFn: down })).toMatchObject({ ok: false, status: 0, error: NETWORK_ERROR })
  })
})

describe('כתובות', () => {
  it('query בלי ערכים ריקים ובלי all', () => {
    expect(query({ status: 'disputed', slug: 'all', kind: '', page: 2 })).toBe('?status=disputed&page=2')
    expect(query({})).toBe('')
  })
  it('withRegion מוסיף אזור לכתובת קיימת', () => {
    expect(withRegion('/a/image?side=scan', { x: 0.123456, y: 0.2, w: 0.3, h: 0.05 })).toBe('/a/image?side=scan&x=0.1235&y=0.2&w=0.3&h=0.05')
    expect(withRegion('/a', null)).toBe('/a')
  })
  it('pageImageUrl', () => {
    expect(pageImageUrl('p1', 'ours')).toBe('/api/tzurat-hadaf/pages/p1/image?side=ours')
    expect(pageImageUrl('p1', 'scan', { x: 0, y: 0, w: 1, h: 1 })).toContain('&x=0&y=0&w=1&h=1')
  })
  it('exportUrl — since כ-ISO, types רק כשלא כולם', () => {
    expect(exportUrl('', ['decisions', 'anchors', 'checks', 'reports', 'contributors'])).toBe(`${API}/export`)
    const u = new URL(exportUrl('2026-10-01', ['decisions', 'anchors']), 'http://x')
    expect(u.searchParams.get('types')).toBe('decisions,anchors')
    expect(u.searchParams.get('parts')).toBe('decisions,anchors')
    expect(new Date(u.searchParams.get('since')).getTime()).toBe(new Date('2026-10-01T00:00:00').getTime())
  })
})

describe('pageCount', () => {
  it('מהשרת, או לפי גודל הדף הראשון', () => {
    expect(pageCount(null)).toBe(1)
    expect(pageCount({ pages: 4, total: 100 })).toBe(4)
    expect(pageCount({ pageSize: 30, total: 61 })).toBe(3)
    expect(pageCount({ total: 61 }, 30)).toBe(3)
    expect(pageCount({ total: 61 }, 0)).toBe(1)
  })
})
