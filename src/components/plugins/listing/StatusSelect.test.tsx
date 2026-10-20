import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StatusSelect, { STATUS_OPTIONS } from './StatusSelect'

describe('StatusSelect', () => {
  it('התווית הגלויה מחוברת לשדה (שם נגיש "סטטוס")', () => {
    render(<StatusSelect value="all" onChange={vi.fn()} />)
    const select = screen.getByRole('combobox', { name: 'סטטוס' })
    expect(select).toHaveValue('all')
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(STATUS_OPTIONS.map((o) => o.label))
  })

  it('בחירה מעבירה את הערך (לא את התווית)', async () => {
    const onChange = vi.fn()
    render(<StatusSelect value="all" onChange={onChange} />)
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'סטטוס' }), 'בטא')
    expect(onChange).toHaveBeenCalledWith('beta')
  })

  it('מראה שדה מטוקני --field-*, בלי החץ של מערכת ההפעלה', () => {
    render(<StatusSelect value="all" onChange={vi.fn()} />)
    const cls = screen.getByRole('combobox').className
    expect(cls).toContain('border-(--field-border)')
    expect(cls).toContain('appearance-none')
  })
})
