import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import UploadCard from './UploadCard'

// כרטיס ההעלאה: קובץ לחלק אחר ← הודעה ברורה ושום קליטה; קובץ תקין ← "נקרא מהקובץ",
// ואז מנה אחרי מנה עד הסוף (כל מנה בקשה משלה); העלאה חוזרת — אזהרה שלא ישוכפל דבר.

const ok = (body) => Promise.resolve(new Response(JSON.stringify({ success: true, ...body }), { status: 200 }))
const bad = (status, body) => Promise.resolve(new Response(JSON.stringify({ success: false, ...body }), { status }))
const zip = () => new File([new Uint8Array([80, 75, 3, 4])], 'tp-ocr-1.zip', { type: 'application/zip' })

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('UploadCard', () => {
  it('קובץ של חלק אחר — הודעה ברורה ובלי קליטה', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockImplementation(() => bad(400, { error: 'x', errors: ['x'], wrongSection: 'ocr' }))
    render(<UploadCard section="router" />)
    fireEvent.change(screen.getByLabelText('קובץ ZIP לנתב הכתב'), { target: { files: [zip()] } })
    expect(await screen.findByText(/הקובץ הזה שייך ל"זיהוי טקסט", לא ל"נתב הכתב"/)).toBeInTheDocument()
    expect(f).toHaveBeenCalledTimes(1)
  })

  it('קובץ תקין — נקרא מהקובץ, ואז מנות עד הסוף', async () => {
    const onDone = vi.fn()
    const f = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementationOnce(() =>
        ok({ token: 't'.repeat(24), total: 600, existing: 600, proofed: 3, warnings: [], read: { items: 600, byTrack: { rashi: 400, square: 200 } }, manifest: { label: 'רש"י', part: 1, parts: 1 } })
      )
      .mockImplementationOnce(() => ok({ done: 300, total: 600, inserted: 0, skipped: 300, finished: false }))
      .mockImplementationOnce(() => ok({ done: 600, total: 600, inserted: 0, skipped: 600, finished: true }))
    render(<UploadCard section="ocr" onDone={onDone} />)
    fireEvent.change(screen.getByLabelText('קובץ ZIP לזיהוי טקסט'), { target: { files: [zip()] } })
    expect(await screen.findByText(/600 שורות · רש"י 400 · מרובע 200/)).toBeInTheDocument()
    expect(screen.getByText(/כבר באתר \(3 כבר הוגו\) — הם לא ישוכפלו ולא יידרסו/)).toBeInTheDocument()
    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect(screen.getByText(/נקלט: 0 חדשים, 600 כבר היו באתר/)).toBeInTheDocument()
    expect(f).toHaveBeenCalledTimes(3)
    expect(f.mock.calls[1][0]).toBe(`/api/admin/training-proof/upload/${'t'.repeat(24)}`)
    const form = f.mock.calls[0][1].body
    expect(form.get('section')).toBe('ocr')
  })

  it('כמה קבצים יחד — כולם נקלטים בזה אחר זה, לפי סדר החלקים', async () => {
    const onDone = vi.fn()
    const sent = []
    let n = 0
    const f = vi.spyOn(globalThis, 'fetch').mockImplementation((url, opts) => {
      if (url.endsWith('/upload')) {
        const name = opts.body.get('file').name
        sent.push(name)
        const part = Number(name.match(/-(\d+)\.zip$/)[1])
        return ok({ token: String(part).repeat(24), total: part * 10, existing: 0, warnings: [], read: { items: part * 10, byTrack: { rashi: part * 10 } }, manifest: { label: '', part, parts: 10 } })
      }
      n++
      const part = Number(url.slice(-24, -23))
      return ok({ done: part * 10, total: part * 10, inserted: part * 10, skipped: 0, finished: true })
    })
    const file = (name) => new File([new Uint8Array([80, 75, 3, 4])], name, { type: 'application/zip' })
    render(<UploadCard section="router" onDone={onDone} />)
    fireEvent.change(screen.getByLabelText('קובץ ZIP לנתב הכתב'), { target: { files: [file('tp-router-3.zip'), file('tp-router-1.zip'), file('tp-router-2.zip')] } })
    expect(await screen.findByText(/3 מתוך 3 קבצים נקלטו: 60 חדשים/)).toBeInTheDocument()
    expect(sent).toEqual(['tp-router-1.zip', 'tp-router-2.zip', 'tp-router-3.zip'])
    expect(n).toBe(3)
    expect(f).toHaveBeenCalledTimes(6)
    expect(onDone).toHaveBeenCalledTimes(3)
    expect(screen.getByText('נקלט: 10 חדשים.')).toBeInTheDocument()
    expect(screen.getByText('נקלט: 30 חדשים.')).toBeInTheDocument()
  })

  it('כמה קבצים — קובץ פגום אחד אינו עוצר את האחרים', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((url, opts) => {
      if (url.endsWith('/upload')) {
        if (opts.body.get('file').name === 'tp-ocr-1.zip') return bad(400, { error: 'x', errors: ['x'], wrongSection: 'router' })
        return ok({ token: 'u'.repeat(24), total: 5, existing: 0, warnings: [], read: { items: 5 }, manifest: { label: '', part: 2, parts: 2 } })
      }
      return ok({ done: 5, total: 5, inserted: 5, skipped: 0, finished: true })
    })
    render(<UploadCard section="ocr" />)
    fireEvent.change(screen.getByLabelText('קובץ ZIP לזיהוי טקסט'), { target: { files: [zip(), new File([new Uint8Array([80, 75, 3, 4])], 'tp-ocr-2.zip')] } })
    expect(await screen.findByText(/1 מתוך 2 קבצים נקלטו: 5 חדשים/)).toBeInTheDocument()
    expect(screen.getByText(/הקובץ הזה שייך ל"נתב הכתב"/)).toBeInTheDocument()
  })

  it('לא ZIP — בלי לשלוח', async () => {
    const f = vi.spyOn(globalThis, 'fetch')
    render(<UploadCard section="frames" />)
    fireEvent.change(screen.getByLabelText('קובץ ZIP לגלאי אזורים'), { target: { files: [new File(['x'], 'a.txt')] } })
    expect(await screen.findByText('יש להעלות קובץ ZIP מתחנת-האימון')).toBeInTheDocument()
    expect(f).not.toHaveBeenCalled()
  })
})
