import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/db', () => ({ default: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/ocr/localCleanup', () => ({ runLocalOcrCleanup: vi.fn() }))

import { GET, POST } from './route'
import { runLocalOcrCleanup } from '@/lib/ocr/localCleanup'

const SECRET = 's'.repeat(40)
const req = (auth) =>
  new Request('http://localhost/api/cron/ocr-local-cleanup', {
    method: 'POST',
    headers: auth ? { authorization: auth } : {},
  })

const PURGE = {
  storageMissing: false,
  scanned: 2,
  jobsPurged: 1,
  inputsDeleted: 1,
  resultsDeleted: 1,
  rejectedDeleted: 0,
  kept: 1,
  tmpDeleted: 0,
  truncated: false,
  errors: 0,
  errorSamples: [],
}

describe('/api/cron/ocr-local-cleanup', () => {
  const prev = process.env.CRON_SECRET
  beforeEach(() => {
    process.env.CRON_SECRET = SECRET
    vi.mocked(runLocalOcrCleanup).mockReset()
    vi.mocked(runLocalOcrCleanup).mockResolvedValue({ resumed: { count: 0, ok: 0, results: [] }, purge: PURGE })
  })
  afterEach(() => {
    if (prev === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = prev
  })

  it('401 בלי כותרת / עם סוד שגוי — ולא מריץ ניקוי', async () => {
    for (const auth of [undefined, 'Bearer wrong', `Basic ${SECRET}`, SECRET]) {
      const res = await POST(req(auth))
      expect(res.status).toBe(401)
      expect(res.headers.get('cache-control')).toBe('no-store')
    }
    expect(runLocalOcrCleanup).not.toHaveBeenCalled()
  })

  it('500 כש-CRON_SECRET לא מוגדר', async () => {
    delete process.env.CRON_SECRET
    const res = await POST(req(`Bearer ${SECRET}`))
    expect(res.status).toBe(500)
    expect(runLocalOcrCleanup).not.toHaveBeenCalled()
  })

  it('סוד נכון → מריץ ומחזיר את הסיכום (POST ו-GET)', async () => {
    for (const handler of [POST, GET]) {
      const res = await handler(req(`Bearer ${SECRET}`))
      expect(res.status).toBe(200)
      expect(res.headers.get('cache-control')).toBe('no-store')
      const body = await res.json()
      expect(body.ok).toBe(true)
      expect(body.purge).toEqual(PURGE)
      expect(body.resumed).toEqual({ count: 0, ok: 0, results: [] })
      expect(typeof body.ranAt).toBe('string')
    }
    expect(runLocalOcrCleanup).toHaveBeenCalledTimes(2)
  })

  it('שורש אחסון חסר או שגיאות → ok:false (200, כדי שהסיכום יירשם בלוג)', async () => {
    vi.mocked(runLocalOcrCleanup).mockResolvedValue({
      resumed: { count: 0, ok: 0, results: [] },
      purge: { ...PURGE, storageMissing: true },
    })
    const body = await (await POST(req(`Bearer ${SECRET}`))).json()
    expect(body.ok).toBe(false)
  })

  it('חריגה → 500 cleanup_failed בלי פרטים', async () => {
    vi.mocked(runLocalOcrCleanup).mockRejectedValue(new Error('secret detail'))
    const res = await POST(req(`Bearer ${SECRET}`))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ ok: false, error: 'cleanup_failed' })
  })
})
