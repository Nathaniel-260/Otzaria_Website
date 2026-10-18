import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Tooltip from './Tooltip'

describe('Tooltip', () => {
  it('הרמז מחובר לרכיב כתיאור נגיש (aria-describedby → role="tooltip")', () => {
    render(<Tooltip content="פותח בחלון חדש"><a href="/x">קישור</a></Tooltip>)
    const link = screen.getByRole('link', { name: 'קישור' })
    expect(link).toHaveAccessibleDescription('פותח בחלון חדש')
    expect(document.getElementById(link.getAttribute('aria-describedby')!)).toHaveAttribute('role', 'tooltip')
  })

  it('שומר aria-describedby קיים של הרכיב', () => {
    render(
      <>
        <span id="extra">עוד</span>
        <Tooltip content="רמז"><button aria-describedby="extra">כפתור</button></Tooltip>
      </>
    )
    expect(screen.getByRole('button').getAttribute('aria-describedby')).toMatch(/^extra /)
  })

  it('Esc מסתיר (data-tip-dismissed), ויציאת הפוקוס מחזירה', () => {
    render(<Tooltip content="רמז"><button>כפתור</button></Tooltip>)
    const button = screen.getByRole('button')
    const host = button.closest('.tooltip-host')!
    button.focus()
    fireEvent.keyDown(button, { key: 'Escape' })
    expect(host).toHaveAttribute('data-tip-dismissed', 'true')
    fireEvent.blur(button)
    expect(host).not.toHaveAttribute('data-tip-dismissed')
  })

  it('Esc מסתיר רמז בריחוף גם כשהפוקוס מחוץ לו, בלי להשפיע על רמז אחר', () => {
    render(<>
      <button>מחוץ לרמז</button>
      <Tooltip content="רמז פעיל"><a href="/x">קישור</a></Tooltip>
      <Tooltip content="רמז אחר"><a href="/y">אחר</a></Tooltip>
    </>)
    const outside = screen.getByRole('button')
    outside.focus()
    const host = screen.getByRole('link', { name: 'קישור' }).closest('.tooltip-host')!
    const other = screen.getByRole('link', { name: 'אחר' }).closest('.tooltip-host')!
    fireEvent.pointerEnter(host, { pointerType: 'mouse' })
    fireEvent.keyDown(outside, { key: 'Escape' })
    expect(host).toHaveAttribute('data-tip-dismissed', 'true')
    expect(other).not.toHaveAttribute('data-tip-dismissed')
    expect(outside).toHaveFocus()
    fireEvent.pointerLeave(host, { pointerType: 'mouse' })
    expect(host).not.toHaveAttribute('data-tip-dismissed')
  })

  it('מכבד Esc שכבר טופל ואינו בולע Esc נוסף לאחר הסגירה', () => {
    render(<Tooltip content="רמז"><button>כפתור</button></Tooltip>)
    const host = screen.getByRole('button').closest('.tooltip-host')!
    fireEvent.pointerEnter(host, { pointerType: 'mouse' })
    const handled = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    handled.preventDefault()
    fireEvent(document.body, handled)
    expect(host).not.toHaveAttribute('data-tip-dismissed')

    expect(fireEvent.keyDown(document.body, { key: 'Escape' })).toBe(false)
    expect(host).toHaveAttribute('data-tip-dismissed', 'true')
    expect(fireEvent.keyDown(document.body, { key: 'Escape' })).toBe(true)
  })
})
