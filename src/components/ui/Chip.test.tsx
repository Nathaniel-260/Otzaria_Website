import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Chip from './Chip'

describe('Chip', () => {
  it('href → קישור; current → aria-current="page"', () => {
    render(<Chip href="/plugins/category/prayer" current icon="extension" count={3}>תפילה</Chip>)
    const link = screen.getByRole('link', { name: /תפילה/ })
    expect(link).toHaveAttribute('href', '/plugins/category/prayer')
    expect(link).toHaveAttribute('aria-current', 'page')
    expect(link).toHaveTextContent('(3)')
    // רווח בין השם למונה גם בשם הנגיש
    expect(link.textContent).toMatch(/תפילה\s+\(3\)/)
  })

  it('בלי href → כפתור דו-מצבי (aria-pressed) שמפעיל onClick', async () => {
    const onClick = vi.fn()
    render(<Chip selected={false} onClick={onClick}>כלי עזר</Chip>)
    const button = screen.getByRole('button', { name: 'כלי עזר' })
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(button).toHaveAttribute('type', 'button')
    await userEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('נבחר — aria-pressed="true" ו-data-selected', () => {
    render(<Chip selected>הכול</Chip>)
    const button = screen.getByRole('button', { name: 'הכול' })
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(button).toHaveAttribute('data-selected')
  })

  it('כפתור בלי selected — לא מסמן aria-pressed (שבב פעולה, לא מסנן)', () => {
    render(<Chip onClick={() => {}}>פעולה</Chip>)
    expect(screen.getByRole('button', { name: 'פעולה' })).not.toHaveAttribute('aria-pressed')
  })
})
