import { describe, it, expect, vi } from 'vitest'
import { useRef, useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { useDialogA11y } from './useDialogA11y'

function Harness({ onEscape, enabled = true, children }: { onEscape: () => void; enabled?: boolean; children?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useDialogA11y(ref, onEscape, enabled)
  return <div ref={ref} tabIndex={-1} role="dialog">{children ?? <button>א</button>}</div>
}

function Opener({ onEscape }: { onEscape: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>פתיחה</button>
      {open && <Harness onEscape={onEscape}><button autoFocus>ממוקד</button></Harness>}
    </>
  )
}

describe('useDialogA11y', () => {
  it('Esc שכבר טופל (defaultPrevented) לא קורא ל-onEscape', () => {
    const onEscape = vi.fn()
    render(<Harness onEscape={onEscape} />)
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    event.preventDefault()
    document.dispatchEvent(event)
    expect(onEscape).not.toHaveBeenCalled()
  })

  it('כשהדגל כבוי — Esc לא נבלע (בלי preventDefault) ולא קורא ל-onEscape', () => {
    const onEscape = vi.fn()
    render(<Harness onEscape={onEscape} enabled={false} />)
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    document.dispatchEvent(event)
    expect(onEscape).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })

  it('ילד עם autoFocus לא נדרס, והפוקוס חוזר לפותח בסגירה', () => {
    render(<Opener onEscape={() => {}} />)
    const opener = screen.getByRole('button', { name: 'פתיחה' })
    opener.focus()
    fireEvent.click(opener)
    expect(screen.getByRole('button', { name: 'ממוקד' })).toHaveFocus()
  })

  it('לכידת Tab מדלגת על אלמנטים מוסתרים', () => {
    render(
      <Harness onEscape={() => {}}>
        <button>ראשון</button>
        <button>אחרון</button>
        <button hidden>מוסתר</button>
        <button style={{ display: 'none' }}>נעלם</button>
      </Harness>
    )
    screen.getByRole('button', { name: 'אחרון' }).focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(screen.getByRole('button', { name: 'ראשון' })).toHaveFocus()
  })

  it('נעילת גלילה: בלי פיצוי padding כש-scrollbar-gutter יציב, ואיפוס בסגירה', () => {
    const root = document.documentElement
    root.style.scrollbarGutter = 'stable'
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1015 })
    Object.defineProperty(root, 'clientWidth', { configurable: true, value: 1000 })
    const { unmount } = render(<Harness onEscape={() => {}} />)
    expect(document.body.style.overflow).toBe('hidden')
    expect(document.body.style.paddingRight).toBe('')
    expect(document.body.style.paddingLeft).toBe('')
    unmount()
    expect(document.body.style.overflow).toBe('')
    root.style.scrollbarGutter = ''
  })
  it('keeps scroll locked and focus in the top dialog when a lower dialog unmounts first', () => {
    const outside = document.createElement('button')
    document.body.append(outside)
    outside.focus()
    document.body.style.overflow = 'auto'
    document.body.style.paddingLeft = '7px'
    const lower = render(<Harness onEscape={() => {}}><button>lower</button></Harness>)
    screen.getByRole('button', { name: 'lower' }).focus()
    const upper = render(<Harness onEscape={() => {}}><button>upper</button></Harness>)
    const top = screen.getByRole('button', { name: 'upper' })
    top.focus()
    lower.unmount()
    expect(document.body.style.overflow).toBe('hidden')
    expect(top).toHaveFocus()
    upper.unmount()
    expect(document.body.style.overflow).toBe('auto')
    expect(document.body.style.paddingLeft).toBe('7px')
    expect(outside).toHaveFocus()
    outside.remove()
    document.body.style.overflow = ''
    document.body.style.paddingLeft = ''
  })

  it('only the top dialog handles Tab and Escape, then restores the lower dialog', () => {
    const lowerEscape = vi.fn()
    const upperEscape = vi.fn()
    const lower = render(<Harness onEscape={lowerEscape}><button>lower first</button><button>lower last</button></Harness>)
    const lowerLast = screen.getByRole('button', { name: 'lower last' })
    lowerLast.focus()
    const upper = render(<Harness onEscape={upperEscape}><button>upper first</button><button>upper last</button></Harness>)
    screen.getByRole('button', { name: 'upper last' }).focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(screen.getByRole('button', { name: 'upper first' })).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(upperEscape).toHaveBeenCalledTimes(1)
    expect(lowerEscape).not.toHaveBeenCalled()
    upper.unmount()
    expect(lowerLast).toHaveFocus()
    expect(document.body.style.overflow).toBe('hidden')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(lowerEscape).toHaveBeenCalledTimes(1)
    lower.unmount()
    expect(document.body.style.overflow).toBe('')
  })

})
