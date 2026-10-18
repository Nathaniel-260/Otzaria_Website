import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PluginResultRow, { PluginResultRowSkeleton } from './PluginResultRow'
import type { PluginSearchResult } from '@/components/plugins/types'
import type { DirectInstallState } from '@/components/plugins/useDirectInstall'

const idle: DirectInstallState = { phase: 'idle', pluginId: null, error: null, updated: false }

const plugin: PluginSearchResult = {
  id: 'p1',
  name: 'מקומות בתנך',
  shortDescription: 'מדריך מקומות',
  description: '',
  version: '1.2.0',
  status: 'stable',
  author: '',
  updatedAt: '2026-10-01T00:00:00.000Z',
  compatibleWith: '',
  tags: ['מפות'],
  image: '/api/plugins/p1/image',
  screenshots: [],
  downloadUrl: '/api/plugins/p1/download',
  supportsDirectInstall: true,
  homepage: '',
  downloadCount: 1234,
  ratingAvg: 4.5,
  ratingCount: 2,
  score: 1,
  matchedFields: ['name'],
  categories: [{ slug: 'study-tools', name: 'כלי לימוד' }]
}

describe('PluginResultRow', () => {
  it('השם הוא קישור יחיד לעמוד התוסף, עם מילות החיפוש מודגשות', () => {
    render(<PluginResultRow plugin={plugin} query="תנך" installState={idle} onInstall={vi.fn()} />)
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading.querySelector('a')).toHaveAttribute('href', '/plugins/p1')
    expect(heading.querySelector('mark')).toHaveTextContent('תנך')
    expect(screen.getAllByRole('link').filter((a) => a.getAttribute('href') === '/plugins/p1')).toHaveLength(1)
  })

  it('שורת מטא כמו בכרטיס; "יציב" לא מוצג כתג; בלי תגיות ובלי "לפרטים מלאים"', () => {
    render(<PluginResultRow plugin={plugin} query="" installState={idle} onInstall={vi.fn()} />)
    expect(screen.getByText('גרסה 1.2.0')).toBeInTheDocument()
    expect(screen.queryByText('יציב')).toBeNull()
    expect(screen.queryByText('מפות')).toBeNull()
    expect(screen.queryByText('לפרטים מלאים')).toBeNull()
  })

  it('תג סטטוס לבטא; שבבי קטגוריה מקושרים לדף הקטגוריה', () => {
    render(<PluginResultRow plugin={{ ...plugin, status: 'beta' }} query="" installState={idle} onInstall={vi.fn()} />)
    expect(screen.getByText('בטא')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'כלי לימוד' })).toHaveAttribute('href', '/plugins/category/study-tools')
  })

  it('הורדה — אותו URL ובלשונית חדשה; התקנה ישירה קוראת ל-onInstall עם התוסף', async () => {
    const onInstall = vi.fn()
    render(<PluginResultRow plugin={plugin} query="" installState={idle} onInstall={onInstall} />)
    const download = screen.getByRole('link', { name: /הורדה/ })
    expect(download).toHaveAttribute('href', '/api/plugins/p1/download')
    expect(download).toHaveAttribute('target', '_blank')
    await userEvent.click(screen.getByRole('button', { name: /התקנה ישירה/ }))
    expect(onInstall).toHaveBeenCalledWith(plugin)
  })

  it('השלד דקורטיבי', () => {
    const { container } = render(<PluginResultRowSkeleton />)
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  })
})
