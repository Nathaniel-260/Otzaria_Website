import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PluginReportModal from './PluginReportModal'

const PLUGIN = { id: 'p1', pluginUid: 'com.x.y', name: 'מילון', version: '1.0.0' }
const fetchSpy = vi.fn()

beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia
  fetchSpy.mockReset()
  vi.stubGlobal('fetch', fetchSpy)
})
afterEach(() => vi.unstubAllGlobals())

function setup(props: Partial<Parameters<typeof PluginReportModal>[0]> = {}) {
  const onClose = vi.fn()
  const onSuccess = vi.fn()
  render(<PluginReportModal plugin={PLUGIN} defaultEmail="a@b.co" onClose={onClose} onSuccess={onSuccess} {...props} />)
  return { onClose, onSuccess }
}

describe('PluginReportModal', () => {
  it('ui/Dialog: שם מהכותרת, תיאור עם שם התוסף והגרסה, פוקוס בחלון; Esc סוגר', () => {
    const { onClose } = setup()
    const dialog = screen.getByRole('dialog', { name: 'דיווח לבעל התוסף' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleDescription('הדיווח על מילון (גרסה 1.0.0) יישלח במייל למפתח התוסף.')
    expect(dialog).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('סוג הדיווח — קבוצה עם legend ושבבים לחיצים (aria-pressed)', () => {
    setup()
    expect(screen.getByRole('group', { name: 'סוג הדיווח' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'תקלה' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'קריסה' }))
    expect(screen.getByRole('button', { name: 'קריסה' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'תקלה' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('שדות עם תוויות; המייל ממולא מראש; מונה התווים מקושר לשדה', () => {
    setup()
    const details = screen.getByRole('textbox', { name: 'תיאור הבעיה' })
    expect(details).toBeRequired()
    fireEvent.change(details, { target: { value: 'שלום' } })
    expect(details).toHaveAccessibleDescription('4 / 5,000')
    expect(screen.getByRole('textbox', { name: 'כתובת מייל למענה (לא חובה)' })).toHaveValue('a@b.co')
  })

  it('כפתור השליחה בשורת הפעולות מחובר לטופס; שליחה עם אותו גוף בקשה', async () => {
    fetchSpy.mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ duplicate: true }) })
    const { onSuccess } = setup()
    fireEvent.change(screen.getByRole('textbox', { name: 'תיאור הבעיה' }), { target: { value: ' לא עובד ' } })
    fireEvent.click(screen.getByRole('button', { name: 'קריסה' }))
    const submit = screen.getByRole('button', { name: 'שליחת הדיווח' })
    expect(submit).toHaveAttribute('form', 'plugin-report-form')
    fireEvent.submit(document.getElementById('plugin-report-form')!)
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(true))
    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe('/api/plugin-reports')
    expect(JSON.parse(init.body)).toMatchObject({
      pluginUid: 'com.x.y', pluginName: 'מילון', pluginVersion: '1.0.0', reportType: 'crash',
      details: 'לא עובד', reporterEmail: 'a@b.co', platform: 'web'
    })
  })

  it('שגיאת שרת (429) — הודעה בחלון עצמו, role="alert"', async () => {
    fetchSpy.mockResolvedValue({ ok: false, status: 429, json: () => Promise.resolve({}) })
    setup()
    fireEvent.change(screen.getByRole('textbox', { name: 'תיאור הבעיה' }), { target: { value: 'x' } })
    fireEvent.submit(document.getElementById('plugin-report-form')!)
    expect(await screen.findByRole('alert')).toHaveTextContent('נשלחו יותר מדי דיווחים. נסה שוב בעוד מספר דקות.')
  })

  it('תיאור ריק (רווחים) — "נא לתאר את הבעיה" בלי פנייה לשרת', async () => {
    setup()
    fireEvent.change(screen.getByRole('textbox', { name: 'תיאור הבעיה' }), { target: { value: '   ' } })
    fireEvent.submit(document.getElementById('plugin-report-form')!)
    expect(await screen.findByRole('alert')).toHaveTextContent('נא לתאר את הבעיה')
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
