import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import NavDropdown from './NavDropdown'

const ITEMS = [
  { href: '/library/upload', label: 'העלו ספר חדש', icon: 'upload_file' },
  { href: '/library/info', label: 'הוסיפו מידע על ספרים', icon: 'info' },
  { href: '/library', label: 'דרכים נוספות לסיוע', more: true }
]

function setup() {
  render(<NavDropdown label="עזרו לספרייה" items={ITEMS} />)
  const trigger = screen.getByRole('button', { name: /עזרו לספרייה/ })
  return { trigger, root: trigger.closest('.nav-dropdown') }
}

describe('NavDropdown', () => {
  it('כפתור disclosure סגור, שמצביע על רשימת הקישורים', () => {
    const { trigger } = setup()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    const panel = document.getElementById(trigger.getAttribute('aria-controls'))
    expect(panel).toContainElement(screen.getByRole('link', { name: 'העלו ספר חדש' }))
    expect(screen.getByRole('link', { name: 'דרכים נוספות לסיוע' })).toHaveAttribute('href', '/library')
  })

  it('לחיצה פותחת, לחיצה נוספת סוגרת', () => {
    const { trigger, root } = setup()
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(root).toHaveAttribute('data-open', 'true')
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('ריחוף בעכבר פותח, ויציאה סוגרת', () => {
    const { trigger, root } = setup()
    fireEvent.pointerEnter(root, { pointerType: 'mouse' })
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    fireEvent.pointerLeave(root, { pointerType: 'mouse' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('Esc סוגר — גם מעל ריחוף — ומחזיר את הפוקוס לכפתור', () => {
    const { trigger, root } = setup()
    fireEvent.pointerEnter(root, { pointerType: 'mouse' })
    const link = screen.getByRole('link', { name: 'העלו ספר חדש' })
    link.focus()
    fireEvent.keyDown(link, { key: 'Escape' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(root).toHaveAttribute('data-dismissed', 'true')
    expect(trigger).toHaveFocus()
  })

  it('חץ למטה מהכפתור — לקישור הראשון; חיצים נעים בין הקישורים במעגל', () => {
    const { trigger } = setup()
    trigger.focus()
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    expect(screen.getByRole('link', { name: 'העלו ספר חדש' })).toHaveFocus()
    fireEvent.keyDown(document.activeElement, { key: 'ArrowUp' })
    expect(screen.getByRole('link', { name: 'דרכים נוספות לסיוע' })).toHaveFocus()
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  it('לחיצה מחוץ לרכיב סוגרת את המצב הנעוץ', () => {
    const { trigger } = setup()
    fireEvent.click(trigger)
    fireEvent.pointerDown(document.body)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })
})
