import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PluginInstallActions, { canDirectInstall } from './PluginInstallActions'
import type { DirectInstallState } from './useDirectInstall'

const idle: DirectInstallState = { phase: 'idle', pluginId: null, error: null, updated: false }

describe('PluginInstallActions', () => {
  it('קישור ההורדה — אותה כתובת, בלשונית חדשה', () => {
    render(<PluginInstallActions plugin={{ id: 'p1', downloadUrl: '/api/plugins/p1/download' }} installState={idle} onInstall={vi.fn()} />)
    const link = screen.getByRole('link', { name: 'הורדה' })
    expect(link).toHaveAttribute('href', '/api/plugins/p1/download')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')).toContain('noreferrer')
  })

  it('בלי תמיכה בהתקנה ישירה — רק הורדה', () => {
    render(<PluginInstallActions plugin={{ id: 'p1', downloadUrl: '/d', supportsDirectInstall: false }} installState={idle} onInstall={vi.fn()} />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('עם תמיכה — כפתור התקנה שמפעיל onInstall, ותווית מותאמת', async () => {
    const onInstall = vi.fn()
    render(
      <PluginInstallActions
        plugin={{ id: 'p1', downloadUrl: '/d', supportsDirectInstall: true }}
        installState={idle}
        onInstall={onInstall}
        emphasis="page"
        installLabel="התקנה ישירה לאוצריא"
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /התקנה ישירה לאוצריא/ }))
    expect(onInstall).toHaveBeenCalledTimes(1)
  })

  it('canDirectInstall דורש גם תמיכה וגם קישור', () => {
    expect(canDirectInstall({ id: 'a', downloadUrl: '/d', supportsDirectInstall: true })).toBe(true)
    expect(canDirectInstall({ id: 'a', downloadUrl: '', supportsDirectInstall: true })).toBe(false)
    expect(canDirectInstall({ id: 'a', downloadUrl: '/d' })).toBe(false)
  })
})
