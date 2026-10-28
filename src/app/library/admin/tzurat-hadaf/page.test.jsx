import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import Page from './page'

// דף הניהול של צורת הדף: מנהל ומנהל ספרים — המסך; תפקיד אחר — חזרה ללוח הניהול; לא מחובר — להתחברות.

const { useSession, push } = vi.hoisted(() => ({ useSession: vi.fn(), push: vi.fn() }))
vi.mock('next-auth/react', () => ({ useSession }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/components/tzuratHadaf/admin/TzuratAdmin', () => ({ default: () => <div data-testid="tzurat-admin" /> }))

beforeEach(() => vi.clearAllMocks())

describe('/library/admin/tzurat-hadaf', () => {
  it.each(['admin', 'admin_books'])('%s — רואה את המסך', (role) => {
    useSession.mockReturnValue({ status: 'authenticated', data: { user: { role } } })
    render(<Page />)
    expect(screen.getByTestId('tzurat-admin')).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })

  it.each(['admin_ocr', 'user', 'admin_books_only'])('%s — מופנה ללוח הניהול', (role) => {
    useSession.mockReturnValue({ status: 'authenticated', data: { user: { role } } })
    render(<Page />)
    expect(screen.queryByTestId('tzurat-admin')).toBeNull()
    expect(push).toHaveBeenCalledWith('/library/admin')
  })

  it('לא מחובר — להתחברות עם חזרה', () => {
    useSession.mockReturnValue({ status: 'unauthenticated', data: null })
    render(<Page />)
    expect(push).toHaveBeenCalledWith('/auth/login?callbackUrl=/library/admin/tzurat-hadaf')
  })
})
