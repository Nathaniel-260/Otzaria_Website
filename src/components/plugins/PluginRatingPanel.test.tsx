import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const sessionState: { data: unknown; status: string } = { data: null, status: 'unauthenticated' }
vi.mock('next-auth/react', () => ({ useSession: () => sessionState }))
vi.mock('@/components/providers/DialogContext', () => ({
  useDialog: () => ({ showAlert: vi.fn(), showConfirm: vi.fn() })
}))

import PluginRatingPanel from './PluginRatingPanel'

const initial = { ratingAvg: 4.5, ratingCount: 4, ratingVerifiedCount: 1, ratingBreakdown: [0, 0, 0, 2, 2] }

describe('PluginRatingPanel', () => {
  beforeEach(() => {
    // בטסט אין שרת — הבקשה לדירוג נכשלת בשקט והלוח נשאר עם הנתונים ההתחלתיים
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false })))
    sessionState.data = null
    sessionState.status = 'unauthenticated'
  })

  it('ממוצע, כוכבים, מאומתים והתפלגות; אורח מוזמן להתחבר', () => {
    render(<PluginRatingPanel pluginId="p1" initial={initial} />)
    expect(screen.getByRole('img', { name: 'דירוג 4.5 מתוך 5' })).toBeInTheDocument()
    expect(screen.getByText('1 מאומתים')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'התחבר לאתר' })).toHaveAttribute(
      'href',
      `/auth/login?callbackUrl=${encodeURIComponent('/plugins/p1')}`
    )
  })

  it('בלי דירוגים — "התוסף עדיין לא דורג" בלי פסי התפלגות', () => {
    const { container } = render(
      <PluginRatingPanel pluginId="p1" initial={{ ratingAvg: 0, ratingCount: 0, ratingVerifiedCount: 0, ratingBreakdown: [0, 0, 0, 0, 0] }} />
    )
    expect(screen.getByText('התוסף עדיין לא דורג')).toBeInTheDocument()
    expect(container.querySelector('.bg-rating')).toBeNull()
  })

  it('משתמש מחובר — חמישה כפתורי דירוג במטרת מגע מלאה', () => {
    sessionState.data = { user: { id: 'u1' } }
    sessionState.status = 'authenticated'
    render(<PluginRatingPanel pluginId="p1" initial={initial} />)
    const buttons = [1, 2, 3, 4, 5].map((n) => screen.getByRole('button', { name: `דרג ${n} מתוך 5` }))
    expect(buttons).toHaveLength(5)
    expect(buttons[0]).toHaveClass('size-(--touch-target)')
  })
})
