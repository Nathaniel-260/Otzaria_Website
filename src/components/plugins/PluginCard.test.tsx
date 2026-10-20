import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PluginCard from './PluginCard'
import type { PluginCardData } from './types'
import type { DirectInstallState } from './useDirectInstall'

const idle: DirectInstallState = { phase: 'idle', pluginId: null, error: null, updated: false }

const plugin: PluginCardData = {
  id: 'p1',
  name: 'מעשר כספים',
  shortDescription: 'ניהול מעשר כספים',
  version: '3.2.0',
  status: 'beta',
  image: '/api/plugins/p1/image',
  downloadUrl: '/api/plugins/p1/download',
  supportsDirectInstall: true,
  tags: ['מעשר', 'כספים', 'ניהול', 'תרומות', 'אישי'],
  downloadCount: 2594,
  ratingAvg: 5,
  ratingCount: 1,
  updatedAt: '2026-10-01T00:00:00.000Z'
}

describe('PluginCard', () => {
  it('שם התוסף הוא הקישור לעמוד התוסף, ברמת הכותרת שנבחרה', () => {
    render(<PluginCard plugin={plugin} installState={idle} onInstall={vi.fn()} headingLevel="h2" />)
    const heading = screen.getByRole('heading', { level: 2, name: 'מעשר כספים' })
    expect(heading.querySelector('a')).toHaveAttribute('href', '/plugins/p1')
    // קישור אחד בלבד לעמוד התוסף (הכרטיס כולו לחיץ דרך ::after — בלי קישורים כפולים)
    expect(screen.getAllByRole('link').filter((a) => a.getAttribute('href') === '/plugins/p1')).toHaveLength(1)
  })

  it('שורת מטא אחת: גרסה, ותג סטטוס רק כשהוא מוסיף מידע; בלי תגיות ובלי תאריך', () => {
    const { rerender } = render(<PluginCard plugin={plugin} installState={idle} onInstall={vi.fn()} category="כלי עזר" />)
    expect(screen.getByText('בטא')).toBeInTheDocument()
    expect(screen.getByText('גרסה 3.2.0')).toBeInTheDocument()
    expect(screen.getByText('כלי עזר')).toBeInTheDocument()
    expect(screen.queryByText('מעשר')).toBeNull()
    expect(screen.queryByText(/עודכן/)).toBeNull()
    rerender(<PluginCard plugin={{ ...plugin, status: 'stable' }} installState={idle} onInstall={vi.fn()} />)
    expect(screen.queryByText('יציב')).toBeNull()
  })

  it('דירוג רק כשיש מדרגים; מונה הורדות', () => {
    const { rerender } = render(<PluginCard plugin={plugin} installState={idle} onInstall={vi.fn()} />)
    expect(screen.getByText(/דירוג ממוצע 5.0/)).toBeInTheDocument()
    expect(screen.getByText('2,594')).toBeInTheDocument()
    rerender(<PluginCard plugin={{ ...plugin, ratingCount: 0 }} installState={idle} onInstall={vi.fn()} />)
    expect(screen.queryByText(/דירוג ממוצע/)).toBeNull()
  })

  it('הורדה בלשונית חדשה, והתקנה ישירה מעבירה את התוסף ל-onInstall', async () => {
    const onInstall = vi.fn()
    render(<PluginCard plugin={plugin} installState={idle} onInstall={onInstall} />)
    expect(screen.getByRole('link', { name: 'הורדה' })).toHaveAttribute('href', '/api/plugins/p1/download')
    await userEvent.click(screen.getByRole('button', { name: /התקנה ישירה/ }))
    expect(onInstall).toHaveBeenCalledWith(plugin)
  })

  it('תוסף בלי התקנה ישירה ובלי תמונה — עדיין כרטיס שלם', () => {
    render(
      <PluginCard
        plugin={{ ...plugin, supportsDirectInstall: false, image: '' }}
        installState={idle}
        onInstall={vi.fn()}
      />
    )
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByRole('heading', { name: 'מעשר כספים' })).toBeInTheDocument()
  })
})
