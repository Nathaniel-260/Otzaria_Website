import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Card, { cardClasses } from './Card'

describe('Card', () => {
  it('סטטי — div כברירת מחדל, בלי ריחוף ובלי טבעת פוקוס', () => {
    render(<Card data-testid="c">תוכן</Card>)
    const card = screen.getByTestId('c')
    expect(card.tagName).toBe('DIV')
    expect(card.className).not.toContain('hover:')
    expect(card.className).not.toContain('focus-visible')
  })

  it('as + role עוברים הלאה (למשל li, או role="note")', () => {
    render(<ul><Card as="li" tone="tonal" role="note">הערה</Card></ul>)
    const note = screen.getByRole('note')
    expect(note.tagName).toBe('LI')
    expect(note.className).toContain('--card-bg-tonal')
  })

  it('href — קישור אינטראקטיבי (group, ריחוף, פוקוס); כתובת מלאה → <a>', () => {
    render(<Card href="https://example.com/file.zip">קובץ</Card>)
    const link = screen.getByRole('link', { name: 'קובץ' })
    expect(link).toHaveAttribute('href', 'https://example.com/file.zip')
    expect(link).not.toHaveAttribute('target')
    expect(link).toHaveClass('group')
    expect(link.className).toContain('hover:bg-(--card-bg-hover)')
  })

  it('external — target=_blank ו-rel בטוח', () => {
    render(<Card href="https://play.google.com" external>חנות</Card>)
    expect(screen.getByRole('link', { name: 'חנות' })).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('onClick — <button type="button"> שלם', () => {
    const onClick = vi.fn()
    render(<Card onClick={onClick}>Windows</Card>)
    const button = screen.getByRole('button', { name: 'Windows' })
    expect(button).toHaveAttribute('type', 'button')
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalled()
  })
})

describe('cardClasses', () => {
  it('ריפוד לפי מפה, וצבעים רק מטוקני הכרטיס', () => {
    expect(cardClasses({ padding: 'md' })).toContain('p-4 sm:p-5 xl:p-6')
    expect(cardClasses({ tone: 'raised' })).toContain('shadow-(--card-raised-shadow)')
    expect(cardClasses()).toBe('rounded-(--card-radius) bg-(--card-bg)')
  })
})
