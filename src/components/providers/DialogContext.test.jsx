import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { DialogProvider, useDialog } from './DialogContext'
import Dialog from '@/components/ui/Dialog'

function Harness({ onResult }) {
  const { showConfirm } = useDialog()
  const [open, setOpen] = useState(true)
  return open ? (
    <Dialog title="עריכה" onClose={() => setOpen(false)}>
      <input aria-label="שדה בחלון" />
      <button type="button" onClick={async () => onResult(await showConfirm('למחוק?', 'פעולה בלתי הפיכה'))}>
        מחק
      </button>
    </Dialog>
  ) : null
}

describe('DialogContext — חלון אישור', () => {
  it('נפתח כ-alertdialog מודאלי עם שם ותיאור, והפוקוס עובר אליו', async () => {
    const user = userEvent.setup()
    render(<DialogProvider><Harness onResult={vi.fn()} /></DialogProvider>)
    await user.click(screen.getByRole('button', { name: 'מחק' }))
    const confirm = await screen.findByRole('alertdialog', { name: 'למחוק?' })
    expect(confirm).toHaveAttribute('aria-modal', 'true')
    expect(confirm).toHaveAccessibleDescription('פעולה בלתי הפיכה')
    expect(confirm.contains(document.activeElement)).toBe(true)
  })

  it('מעל ui/Dialog — Tab מסתובב בתוך חלון האישור ולא בורח לחלון שמתחתיו', async () => {
    const user = userEvent.setup()
    render(<DialogProvider><Harness onResult={vi.fn()} /></DialogProvider>)
    await user.click(screen.getByRole('button', { name: 'מחק' }))
    const confirm = await screen.findByRole('alertdialog')
    for (let i = 0; i < 5; i++) {
      await user.tab()
      expect(confirm.contains(document.activeElement)).toBe(true)
    }
    await user.tab({ shift: true })
    expect(confirm.contains(document.activeElement)).toBe(true)
  })

  it('Esc סוגר רק את חלון האישור (תוצאה false), והחלון שמתחתיו נשאר', async () => {
    const user = userEvent.setup()
    const onResult = vi.fn()
    render(<DialogProvider><Harness onResult={onResult} /></DialogProvider>)
    await user.click(screen.getByRole('button', { name: 'מחק' }))
    await screen.findByRole('alertdialog')
    await user.keyboard('{Escape}')
    expect(onResult).toHaveBeenCalledWith(false)
    expect(screen.getByRole('dialog', { name: 'עריכה' })).toBeInTheDocument()
  })

  it('Enter על "ביטול" ממוקד — מבטל ולא מאשר', async () => {
    const user = userEvent.setup()
    const onResult = vi.fn()
    render(<DialogProvider><Harness onResult={onResult} /></DialogProvider>)
    await user.click(screen.getByRole('button', { name: 'מחק' }))
    await screen.findByRole('alertdialog')
    act(() => screen.getByRole('button', { name: 'ביטול' }).focus())
    await user.keyboard('{Enter}')
    expect(onResult).toHaveBeenCalledWith(false)
  })

  it('Enter כשהפוקוס על החלון עצמו — מאשר (ההתנהגות הקיימת)', async () => {
    const user = userEvent.setup()
    const onResult = vi.fn()
    render(<DialogProvider><Harness onResult={onResult} /></DialogProvider>)
    await user.click(screen.getByRole('button', { name: 'מחק' }))
    await screen.findByRole('alertdialog')
    await user.keyboard('{Enter}')
    expect(onResult).toHaveBeenCalledWith(true)
  })
})
