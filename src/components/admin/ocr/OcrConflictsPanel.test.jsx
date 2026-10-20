import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OcrConflictsPanel from './OcrConflictsPanel'

const fetchMock = vi.fn()
const reply = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body })

const UPDATED = '2026-10-20T10:00:00.000Z'
const conflict = (over = {}) => ({
  id: 'c1',
  pageNumber: 4,
  status: 'open',
  ocrText: 'טקסט מה-OCR',
  pageContent: 'טקסט שנערך בידי אדם',
  pageExists: true,
  pageIsTwoColumns: false,
  pageUpdatedAt: UPDATED,
  ...over,
})

function listBody(conflicts, extra = {}) {
  return { success: true, total: conflicts.length, openCount: conflicts.filter((c) => c.status === 'open').length, hasMore: false, conflicts, ...extra }
}

beforeEach(() => {
  fetchMock.mockReset()
  global.fetch = fetchMock
})

describe('OcrConflictsPanel', () => {
  it('מציג את הרשימה ואת שני הטקסטים כטקסט רגיל', async () => {
    fetchMock.mockResolvedValueOnce(reply(200, listBody([conflict(), conflict({ id: 'c2', pageNumber: 9, status: 'dismissed', ocrText: '<i>x</i>' })])))
    const user = userEvent.setup()
    const { container } = render(<OcrConflictsPanel jobId="job1" />)

    expect(await screen.findByText('עמוד 4')).toBeInTheDocument()
    expect(screen.getByText('עמוד 9')).toBeInTheDocument()
    expect(screen.getByText(/1 ממתינות מתוך 2/)).toBeInTheDocument()
    expect(fetchMock.mock.calls[0][0]).toBe('/api/admin/books/ocr/conflicts?jobId=job1&limit=50&offset=0')

    const [first, second] = screen.getAllByRole('button', { name: 'הצג טקסטים' })
    await user.click(first)
    expect(screen.getByText('טקסט שנערך בידי אדם')).toBeInTheDocument()
    expect(screen.getByText('טקסט מה-OCR')).toBeInTheDocument()
    await user.click(second)
    expect(screen.getByText('<i>x</i>')).toBeInTheDocument()
    expect(container.querySelector('i')).toBeNull()
  })

  it('"שמור את הטקסט הקיים" קורא ל-API עם dismiss', async () => {
    fetchMock
      .mockResolvedValueOnce(reply(200, listBody([conflict()])))
      .mockResolvedValueOnce(reply(200, { success: true, conflict: conflict({ status: 'dismissed', resolvedByName: 'מנהל' }) }))
    const onChanged = vi.fn()
    const user = userEvent.setup()
    render(<OcrConflictsPanel jobId="job1" onChanged={onChanged} />)

    await user.click(await screen.findByRole('button', { name: 'הצג טקסטים' }))
    await user.click(screen.getByRole('button', { name: 'שמור את הטקסט הקיים' }))

    expect(await screen.findByText('נשמר הטקסט הקיים')).toBeInTheDocument()
    const [url, init] = fetchMock.mock.calls[1]
    expect(url).toBe('/api/admin/books/ocr/conflicts/c1')
    expect(JSON.parse(init.body)).toEqual({ action: 'dismiss' })
    expect(onChanged).toHaveBeenCalled()
  })

  it('אימוץ OCR — רק אחרי אישור, ועם updatedAt של העמוד כפי שהוצג', async () => {
    fetchMock
      .mockResolvedValueOnce(reply(200, listBody([conflict()])))
      .mockResolvedValueOnce(reply(200, { success: true, conflict: conflict({ status: 'applied' }) }))
    const user = userEvent.setup()
    render(<OcrConflictsPanel jobId="job1" />)

    await user.click(await screen.findByRole('button', { name: 'הצג טקסטים' }))
    await user.click(screen.getByRole('button', { name: 'אמץ את טקסט ה-OCR' }))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(screen.getByText('הטקסט הנוכחי בעמוד יוחלף בטקסט ה-OCR. להמשיך?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'כן, לאמץ את ה-OCR' }))

    expect(await screen.findByText('אומץ טקסט ה-OCR')).toBeInTheDocument()
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ action: 'apply', expectedPageUpdatedAt: UPDATED })
  })

  it('409 (העמוד השתנה שוב) — הודעה וטעינה מחדש', async () => {
    fetchMock
      .mockResolvedValueOnce(reply(200, listBody([conflict()])))
      .mockResolvedValueOnce(reply(409, { error: 'העמוד השתנה שוב — רעננו', code: 'page_changed' }))
      .mockResolvedValueOnce(reply(200, listBody([conflict({ pageContent: 'עריכה חדשה', pageUpdatedAt: '2026-10-20T11:00:00.000Z' })])))
    const user = userEvent.setup()
    render(<OcrConflictsPanel jobId="job1" />)

    await user.click(await screen.findByRole('button', { name: 'הצג טקסטים' }))
    await user.click(screen.getByRole('button', { name: 'אמץ את טקסט ה-OCR' }))
    await user.click(screen.getByRole('button', { name: 'כן, לאמץ את ה-OCR' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('העמוד השתנה שוב — רעננו')
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    expect(screen.getByText('עריכה חדשה')).toBeInTheDocument()
  })

  it('עמוד שנמחק — אין אימוץ, רק שמירת הקיים', async () => {
    fetchMock.mockResolvedValueOnce(reply(200, listBody([conflict({ pageExists: false, pageUpdatedAt: null, pageContent: '' })])))
    const user = userEvent.setup()
    render(<OcrConflictsPanel jobId="job1" />)
    await user.click(await screen.findByRole('button', { name: 'הצג טקסטים' }))
    expect(screen.getByText(/העמוד נמחק מהספר/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'אמץ את טקסט ה-OCR' })).not.toBeInTheDocument()
  })

  it('דפדוף — "טען עוד" מבקש את ההמשך', async () => {
    fetchMock
      .mockResolvedValueOnce(reply(200, listBody([conflict()], { total: 2, hasMore: true })))
      .mockResolvedValueOnce(reply(200, listBody([conflict({ id: 'c2', pageNumber: 8 })], { total: 2, hasMore: false })))
    const user = userEvent.setup()
    render(<OcrConflictsPanel jobId="job1" />)
    await user.click(await screen.findByRole('button', { name: 'טען עוד' }))
    expect(await screen.findByText('עמוד 8')).toBeInTheDocument()
    expect(fetchMock.mock.calls[1][0]).toContain('offset=1')
    expect(screen.queryByRole('button', { name: 'טען עוד' })).not.toBeInTheDocument()
  })

  it('שגיאת טעינה מוצגת', async () => {
    fetchMock.mockResolvedValueOnce(reply(403, { error: 'אין הרשאה לבצע פעולה זו' }))
    render(<OcrConflictsPanel jobId="job1" />)
    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText('אין הרשאה לבצע פעולה זו')).toBeInTheDocument()
  })
})
