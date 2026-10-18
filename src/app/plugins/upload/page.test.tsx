import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'

const push = vi.fn()
const showAlert = vi.fn()
const showMessage = vi.fn(() => Promise.resolve())

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/components/providers/DialogContext', () => ({ useDialog: () => ({ showAlert, showMessage }) }))

import UploadPluginPage from './page'

const fetchSpy = vi.fn()

beforeEach(() => {
  push.mockReset(); showAlert.mockReset(); showMessage.mockClear(); fetchSpy.mockReset()
  vi.stubGlobal('fetch', fetchSpy)
})
afterEach(() => vi.unstubAllGlobals())

describe('/plugins/upload (מחובר — ה-proxy מפנה אורח להתחברות לפני העמוד)', () => {
  it('main#main-content יחיד, h1 אחד, פירורי לחם ושלבים ממוספרים (h2) בסדר המילוי', () => {
    const { container } = render(<UploadPluginPage />)
    expect(container.querySelectorAll('main#main-content')).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'העלאת תוסף חדש' })).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'פירורי לחם' })).getByRole('link', { name: 'חנות התוספים' })).toHaveAttribute('href', '/plugins')
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['קבצים', 'מידע בסיסי', 'תגיות'])
    expect(screen.getByText(/^מלא את הפרטים הבאים/)).toBeInTheDocument()
  })

  it('שדות החובה מסומנים ומחוברים לתוויות; כפתור ראשי אחד', () => {
    render(<UploadPluginPage />)
    expect(screen.getByLabelText(/קובץ תוסף/)).toBeRequired()
    expect(screen.getByLabelText(/צילומי מסך/)).toBeRequired()
    expect(screen.getByLabelText(/תמונת תוסף/)).not.toBeRequired()
    expect(screen.getByRole('textbox', { name: 'תיאור מלא' })).toHaveAttribute('aria-required', 'true')
    expect(screen.getByRole('checkbox', { name: /אני מאשר קבלת דיווחים/ })).toBeRequired()
    const submit = screen.getByRole('button', { name: 'העלה תוסף' })
    expect(submit).toHaveAttribute('type', 'submit')
    expect(screen.getByRole('link', { name: 'ביטול' })).toHaveAttribute('href', '/plugins')
  })

  it('שליחה בלי קובץ: אותה הודעת שגיאה בחלון, גם ליד השדה, ובלי פנייה לשרת', async () => {
    const { container } = render(<UploadPluginPage />)
    fireEvent.submit(container.querySelector('form')!)
    await waitFor(() => expect(showMessage).toHaveBeenCalledWith('שגיאה בהעלאת התוסף', 'חובה לצרף קובץ תוסף'))
    expect(fetchSpy).not.toHaveBeenCalled()
    const fileInput = screen.getByLabelText(/קובץ תוסף/)
    await waitFor(() => expect(fileInput).toHaveAttribute('aria-invalid', 'true'))
    expect(fileInput).toHaveAccessibleDescription(expect.stringContaining('חובה לצרף קובץ תוסף'))
    expect(fileInput).toHaveFocus()
  })

  it('קובץ בסיומת שגויה: הודעה (כמו קודם) + שגיאה ליד השדה, והשדה מתאפס', async () => {
    render(<UploadPluginPage />)
    const input = screen.getByLabelText(/קובץ תוסף/) as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['x'], 'a.zip')] } })
    await waitFor(() => expect(showAlert).toHaveBeenCalledWith('שגיאה', 'קובץ התוסף חייב להיות בפורמט .otzplugin'))
    expect(screen.getAllByText('קובץ התוסף חייב להיות בפורמט .otzplugin').length).toBeGreaterThan(0)
  })

  it('צילום מסך בפורמט לא נתמך — שגיאה ליד שדה צילומי המסך', async () => {
    render(<UploadPluginPage />)
    fireEvent.change(screen.getByLabelText(/צילומי מסך/), { target: { files: [new File(['x'], 'a.bmp', { type: 'image/bmp' })] } })
    expect(showAlert).toHaveBeenCalledWith('שגיאה', 'צילומי מסך חייבים להיות בפורמט PNG, JPEG, WEBP או GIF')
    await waitFor(() => expect(screen.getByLabelText(/צילומי מסך/)).toHaveAttribute('aria-invalid', 'true'))
  })

  it('תגיות: Enter מוסיף, בלי כפילויות, והסרה', () => {
    render(<UploadPluginPage />)
    const input = screen.getByRole('combobox', { name: /הוסף תגית/ })
    fireEvent.change(input, { target: { value: ' מילון ' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.change(input, { target: { value: 'מילון' } })
    fireEvent.click(screen.getByRole('button', { name: 'הוסף' }))
    expect(screen.getAllByRole('button', { name: 'הסרת התגית מילון' })).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'הסרת התגית מילון' }))
    expect(screen.queryByRole('button', { name: 'הסרת התגית מילון' })).toBeNull()
  })
})
