// @vitest-environment node
// POST /api/admin/books/ocr/start עם method=local — מול MongoDB אמיתי (mongodb-memory-server)
// ותמונות JPEG אמיתיות בתיקייה זמנית. בלי בינארי Mongo — הבדיקות מדולגות.
//
// מכסה: 202 רק אחרי PDF עמיד + queued; אידמפוטנטיות לפי requestId (אותו קלט → אותה עבודה,
// קלט אחר → 409); חסימה לפי עבודה פעילה לספר (כולל מרוץ על book_active_unique); הכנה שנקטעה
// ממשיכה באותו requestId; שגיאת קלט קבועה מול זמנית; skip; תצורה חסרה; runOcrJob לא נקרא.
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest'

// images.js ו-localStorage קוראים את התיקיות מה-env — חייב לקרות לפני ה-imports
const env = await vi.hoisted(async () => {
  const os = await import('node:os')
  const path = await import('node:path')
  const fs = await import('node:fs')
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ocr-local-start-'))
  const uploads = path.join(tmp, 'uploads')
  const storage = path.join(tmp, 'storage')
  process.env.UPLOAD_DIR = uploads
  process.env.OCR_LOCAL_STORAGE_DIR = storage
  return { tmp, uploads, storage }
})

const { getServerSessionMock, buildCtl } = vi.hoisted(() => ({
  getServerSessionMock: vi.fn(),
  buildCtl: { failNext: 0, calls: 0 },
}))
vi.mock('@/lib/db', () => ({ default: vi.fn().mockResolvedValue(undefined) }))
vi.mock('next-auth', () => ({ getServerSession: getServerSessionMock }))
vi.mock('@/app/api/auth/[...nextauth]/route', () => ({ authOptions: {} }))
vi.mock('@/lib/ocr/runOcrJob', () => ({ runOcrJob: vi.fn().mockResolvedValue(undefined) }))
// buildJobInput האמיתי, עם אפשרות להכשיל פעם אחת בתקלה זמנית (כמו EIO באמצע הכתיבה)
vi.mock('@/lib/ocr/localPdf', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    buildJobInput: async (args) => {
      buildCtl.calls++
      if (buildCtl.failNext > 0) {
        buildCtl.failNext--
        throw Object.assign(new Error('simulated I/O failure'), { code: 'EIO' })
      }
      return actual.buildJobInput(args)
    },
  }
})

import path from 'node:path'
import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { PDFDocument } from 'pdf-lib'
import Book from '@/models/Book'
import Page from '@/models/Page'
import OcrJob from '@/models/OcrJob'
import { startMongo } from '@/lib/corrections/testing/mongo.js'
import { runOcrJob } from '@/lib/ocr/runOcrJob'
import { relToAbs } from '@/lib/ocr/localStorage'
import { POST } from './route'

vi.setConfig({ testTimeout: 30000 })

let db
beforeAll(async () => {
  db = await startMongo()
}, 120000)
afterAll(async () => {
  if (db && !db.skip) await db.stop()
  await fs.rm(env.tmp, { recursive: true, force: true })
})

const sha = (b) => createHash('sha256').update(b).digest('hex')
const solid = (w, h, r) => sharp({ create: { width: w, height: h, channels: 3, background: { r, g: 40, b: 90 } } }).jpeg({ quality: 85 }).toBuffer()
const SECRET = 'k'.repeat(48)
const session = { user: { id: '507f1f77bcf86cd799439099', _id: '507f1f77bcf86cd799439099', name: 'מנהל ספרים', role: 'admin_books' } }

let book
let images
let seq = 0
const rid = () => `req-${Date.now().toString(36)}-${++seq}-abcdef`

function post(body) {
  return new Request('http://localhost/api/admin/books/ocr/start', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}
const start = async (extra = {}) => {
  const res = await POST(post({ bookId: String(book._id), method: 'local', existingTextMode: 'overwrite', ...extra }))
  return { res, body: await res.json() }
}

async function makeBook(slug, pages) {
  const b = await Book.create({ name: `ספר ${slug}`, slug })
  const dir = path.join(env.uploads, 'books', slug)
  await fs.mkdir(dir, { recursive: true })
  const imgs = {}
  for (const { n, content = '', w = 60 + n, h = 80 } of pages) {
    imgs[n] = await solid(w, h, n * 20)
    await fs.writeFile(path.join(dir, `page.${n}.jpg`), imgs[n])
    await Page.create({ book: b._id, pageNumber: n, imagePath: `/uploads/books/${slug}/page.${n}.jpg`, content })
  }
  return { b, imgs }
}

beforeEach(async (ctx) => {
  if (db.skip) return ctx.skip()
  await db.reset()
  vi.clearAllMocks()
  buildCtl.failNext = 0
  buildCtl.calls = 0
  process.env.OCR_WORKER_SECRET = SECRET
  process.env.OCR_WORKER_ID = 'worker-1'
  getServerSessionMock.mockResolvedValue(session)
  const slug = `b${++seq}`
  // סדר יצירה מעורבב — ה-PDF חייב להיות לפי pageNumber
  ;({ b: book, imgs: images } = await makeBook(slug, [{ n: 3 }, { n: 1 }, { n: 2, content: 'כבר יש טקסט' }]))
})

describe('יצירה', () => {
  it('202 queued רק אחרי שה-PDF נשמר: קובץ קיים, hash תואם, pageMap לפי סדר העמודים', async () => {
    const requestId = rid()
    const { res, body } = await start({ requestId })
    expect(res.status).toBe(202)
    expect(res.headers.get('Cache-Control')).toBe('private, no-store')
    expect(body).toEqual({ success: true, jobId: expect.stringMatching(/^[a-f0-9]{24}$/), status: 'queued', totalPages: 3 })
    expect(runOcrJob).not.toHaveBeenCalled()

    const job = await OcrJob.findById(body.jobId).lean()
    expect(job).toMatchObject({
      method: 'local',
      status: 'queued',
      active: true,
      requestId,
      workerId: 'worker-1',
      taskType: 'ocr',
      existingTextMode: 'overwrite',
      options: { lm: 'rabbinic', defaultScript: 'square' },
      totalPages: 3,
      editedPagesCount: 1,
      startedByName: 'מנהל ספרים',
    })
    expect(job.prepLeaseUntil).toBeNull()
    expect(job.preparedAt).toBeInstanceOf(Date)
    expect(job.requestFingerprint).toMatch(/^[0-9a-f]{64}$/)
    expect(job.inputPath).toBe(`${body.jobId}/input-${job.inputSha256}.pdf`)

    const abs = relToAbs(job.inputPath)
    expect(abs.startsWith(path.resolve(env.storage) + path.sep)).toBe(true)
    const pdf = await fs.readFile(abs)
    expect(sha(pdf)).toBe(job.inputSha256)
    expect(pdf.length).toBe(job.inputBytes)
    expect((await PDFDocument.load(pdf)).getPageCount()).toBe(3)

    const pages = await Page.find({ book: book._id }).sort({ pageNumber: 1 }).lean()
    expect(job.pageMap.map((e) => [e.pdfPageIndex, e.pageNumber, String(e.page), e.imageSha256, e.expectedUpdatedAt.getTime()])).toEqual(
      pages.map((p, i) => [i + 1, p.pageNumber, String(p._id), sha(images[p.pageNumber]), p.updatedAt.getTime()])
    )
  })

  it('אותו requestId פעמיים → אותה עבודה, רשומה אחת, בלי לבנות שוב', async () => {
    const requestId = rid()
    const a = await start({ requestId })
    const st = await fs.stat(relToAbs((await OcrJob.findById(a.body.jobId).lean()).inputPath))
    const b = await start({ requestId })
    expect(a.res.status).toBe(202)
    expect(b.res.status).toBe(202)
    expect(b.body).toEqual(a.body)
    expect(await OcrJob.countDocuments({})).toBe(1)
    expect(buildCtl.calls).toBe(1)
    const job = await OcrJob.findById(a.body.jobId).lean()
    expect((await fs.stat(relToAbs(job.inputPath))).mtimeMs).toBe(st.mtimeMs)
  })

  it('אותו requestId עם קלט אחר → 409 request_conflict', async () => {
    const requestId = rid()
    await start({ requestId })
    for (const extra of [{ existingTextMode: 'skip' }, { options: { lm: 'off' } }]) {
      const { res, body } = await start({ requestId, ...extra })
      expect(res.status).toBe(409)
      expect(body.code).toBe('request_conflict')
      expect(body.error).toMatch(/[א-ת]/)
    }
    expect(await OcrJob.countDocuments({})).toBe(1)
  })

  it('requestId אחר על ספר עם עבודה פעילה → 409 עם jobId', async () => {
    const first = await start({ requestId: rid() })
    const { res, body } = await start({ requestId: rid() })
    expect(res.status).toBe(409)
    expect(body).toMatchObject({ code: 'active_job', jobId: first.body.jobId })
    expect(await OcrJob.countDocuments({})).toBe(1)
  })

  it('עבודת ocrwin פעילה חוסמת local, ו-ocrwin לא השתנה (200 + runOcrJob)', async () => {
    const ocrwin = await POST(post({ bookId: String(book._id), method: 'ocrwin', existingTextMode: 'overwrite' }))
    expect(ocrwin.status).toBe(200)
    expect(runOcrJob).toHaveBeenCalledTimes(1)
    const { res, body } = await start({ requestId: rid() })
    expect(res.status).toBe(409)
    expect(body.code).toBe('active_job')
  })

  it('skip שולח רק עמודים בלי טקסט', async () => {
    const { res, body } = await start({ requestId: rid(), existingTextMode: 'skip' })
    expect(res.status).toBe(202)
    expect(body.totalPages).toBe(2)
    const job = await OcrJob.findById(body.jobId).lean()
    expect(job.pageMap.map((e) => e.pageNumber)).toEqual([1, 3])
    expect((await PDFDocument.load(await fs.readFile(relToAbs(job.inputPath)))).getPageCount()).toBe(2)
  })

  it('options מה-whitelist נשמרים', async () => {
    const { body } = await start({ requestId: rid(), options: { lm: 'modern', defaultScript: 'rashi' } })
    expect((await OcrJob.findById(body.jobId).lean()).options).toEqual({ lm: 'modern', defaultScript: 'rashi' })
  })

  it('מרוץ: שתי בקשות במקביל עם אותו requestId → עבודה אחת', async () => {
    const requestId = rid()
    const results = await Promise.all([start({ requestId }), start({ requestId })])
    const statuses = results.map((r) => r.res.status).sort()
    expect(statuses[0]).toBe(202)
    // השנייה: 202 (אם הגיעה אחרי הסיום) או 409 preparing (אם ההכנה עוד רצה)
    expect([202, 409]).toContain(statuses[1])
    if (statuses[1] === 409) expect(results.find((r) => r.res.status === 409).body.code).toBe('preparing')
    expect(await OcrJob.countDocuments({})).toBe(1)
    expect(new Set(results.map((r) => r.body.jobId)).size).toBe(1)
  })

  it('מרוץ: שני requestId שונים במקביל על אותו ספר → אחד 202, השני 409 (book_active_unique)', async () => {
    const results = await Promise.all([start({ requestId: rid() }), start({ requestId: rid() })])
    expect(results.map((r) => r.res.status).sort()).toEqual([202, 409])
    expect(results.find((r) => r.res.status === 409).body.code).toBe('active_job')
    expect(await OcrJob.countDocuments({ active: true })).toBe(1)
  })
})

describe('הכנה שנקטעה', () => {
  it('תקלה זמנית ב-buildJobInput → 500 בלי 202, העבודה preparing; ניסיון חוזר באותו requestId → 202', async () => {
    const requestId = rid()
    buildCtl.failNext = 1
    const first = await start({ requestId })
    expect(first.res.status).toBe(500)
    expect(first.body).toMatchObject({ code: 'preparation_retry', jobId: expect.any(String) })
    expect(first.body.error).toMatch(/[א-ת]/)
    expect(first.body.success).toBeUndefined()
    const pending = await OcrJob.findById(first.body.jobId).lean()
    expect(pending).toMatchObject({ status: 'preparing', active: true })
    expect(pending.inputPath).toBeUndefined()
    expect(pending.pageMap).toBeUndefined()

    // requestId אחר עדיין חסום (העבודה פעילה)
    expect((await start({ requestId: rid() })).res.status).toBe(409)

    const retry = await start({ requestId })
    expect(retry.res.status).toBe(202)
    expect(retry.body).toMatchObject({ jobId: first.body.jobId, status: 'queued', totalPages: 3 })
    expect(await OcrJob.countDocuments({})).toBe(1)
  })

  it('lease בתוקף (הכנה רצה בבקשה אחרת) → 409 preparing; אחרי שפג → ממשיכים ל-202', async () => {
    const requestId = rid()
    buildCtl.failNext = 1
    const first = await start({ requestId })
    // מדמים בקשה אחרת שמחזיקה lease בתוקף
    await OcrJob.updateOne({ _id: first.body.jobId }, { $set: { prepLeaseUntil: new Date(Date.now() + 60_000) } })
    const busy = await start({ requestId })
    expect(busy.res.status).toBe(409)
    expect(busy.body).toMatchObject({ code: 'preparing', jobId: first.body.jobId })

    // ה-lease פג (תהליך שקרס באמצע) — הניסיון החוזר לוקח אותו וממשיך
    await OcrJob.updateOne({ _id: first.body.jobId }, { $set: { prepLeaseUntil: new Date(Date.now() - 1000) } })
    const done = await start({ requestId })
    expect(done.res.status).toBe(202)
    expect(done.body.jobId).toBe(first.body.jobId)
  })

  it('הכנה נטושה של בקשה אחרת (lease פג לפני יותר מ-15 דקות) נסגרת, והספר מתפנה', async () => {
    buildCtl.failNext = 1
    const stale = await start({ requestId: rid() })
    await OcrJob.updateOne({ _id: stale.body.jobId }, { $set: { prepLeaseUntil: new Date(Date.now() - 5 * 60_000) } })
    // 5 דקות — עדיין לא נטושה
    expect((await start({ requestId: rid() })).res.status).toBe(409)

    await OcrJob.updateOne({ _id: stale.body.jobId }, { $set: { prepLeaseUntil: new Date(Date.now() - 20 * 60_000) } })
    const fresh = await start({ requestId: rid() })
    expect(fresh.res.status).toBe(202)
    expect(await OcrJob.findById(stale.body.jobId).lean()).toMatchObject({
      status: 'failed',
      active: false,
      errorCode: 'prep_abandoned',
      error: 'הכנת הקלט נקטעה',
    })
  })
})

describe('שגיאות קלט קבועות', () => {
  it('תמונה חסרה → 422 missing_image, העבודה failed ומשחררת את הספר; אותו requestId → אותה שגיאה', async () => {
    await fs.rm(path.join(env.uploads, 'books', book.slug, 'page.3.jpg'))
    const requestId = rid()
    const { res, body } = await start({ requestId })
    expect(res.status).toBe(422)
    expect(body).toMatchObject({ code: 'missing_image', pageNumbers: [3] })
    expect(body.error).toMatch(/3/)
    expect(await OcrJob.findById(body.jobId).lean()).toMatchObject({ status: 'failed', active: false, errorCode: 'missing_image' })

    const again = await start({ requestId })
    expect(again.res.status).toBe(422)
    expect(again.body).toMatchObject({ code: 'missing_image', jobId: body.jobId })
    expect(buildCtl.calls).toBe(1)

    // הספר פנוי: אחרי תיקון התמונה, בקשה חדשה מצליחה
    await fs.writeFile(path.join(env.uploads, 'books', book.slug, 'page.3.jpg'), images[3])
    expect((await start({ requestId: rid() })).res.status).toBe(202)
  })

  it('אין עמודים לעיבוד (skip וכולם ערוכים) → 400, העבודה failed', async () => {
    await Page.updateMany({ book: book._id }, { $set: { content: 'טקסט' } })
    const { res, body } = await start({ requestId: rid(), existingTextMode: 'skip' })
    expect(res.status).toBe(400)
    expect(body.code).toBe('no_pages')
    expect(body.error).toMatch(/[א-ת]/)
    expect(await OcrJob.countDocuments({ active: true })).toBe(0)
  })

  it('חריגה ממגבלת העמודים → 413', async () => {
    process.env.OCR_LOCAL_MAX_PAGES = '2'
    try {
      const { res, body } = await start({ requestId: rid() })
      expect(res.status).toBe(413)
      expect(body.code).toBe('too_many_pages')
      expect(await OcrJob.countDocuments({ active: true })).toBe(0)
    } finally {
      delete process.env.OCR_LOCAL_MAX_PAGES
    }
  })
})

describe('ולידציה, תצורה והרשאות', () => {
  it('תצורת עובד חסרה או חלשה → 503 בלי ליצור רשומה', async () => {
    delete process.env.OCR_WORKER_SECRET
    const missing = await start({ requestId: rid() })
    expect(missing.res.status).toBe(503)
    expect(missing.body.error).toBe('ספק המחשב המקומי אינו מוגדר בשרת')
    process.env.OCR_WORKER_SECRET = 'short'
    expect((await start({ requestId: rid() })).res.status).toBe(503)
    expect(await OcrJob.countDocuments({})).toBe(0)
  })

  it('קלט לא תקין → 400 בעברית בלי ליצור רשומה', async () => {
    for (const extra of [{}, { requestId: 'bad id!' }, { requestId: rid(), splitColumns: true }, { requestId: rid(), options: { lm: 'gpt' } }]) {
      const { res, body } = await start(extra)
      expect(res.status, JSON.stringify(extra)).toBe(400)
      expect(body.error).toMatch(/[א-ת]/)
    }
    expect(await OcrJob.countDocuments({})).toBe(0)
  })

  it('401 בלי session, 403 בלי הרשאת ספרייה', async () => {
    getServerSessionMock.mockResolvedValueOnce(null)
    expect((await start({ requestId: rid() })).res.status).toBe(401)
    getServerSessionMock.mockResolvedValueOnce({ user: { role: 'admin_ocr' } })
    expect((await start({ requestId: rid() })).res.status).toBe(403)
    expect(await OcrJob.countDocuments({})).toBe(0)
  })
})
