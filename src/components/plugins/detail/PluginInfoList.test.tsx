import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PluginInfoList, { buildInfoRows } from './PluginInfoList'

const plugin = {
  version: '1.2.0',
  status: 'beta' as const,
  author: 'מפתח א',
  fileUpdatedAt: '2026-01-05',
  updatedAt: '2026-01-01',
  downloadCount: 1200,
  pluginFileSize: 2048,
  compatibleWith: '0.9.97',
  requiresNetwork: true
}

describe('PluginInfoList', () => {
  it('רשימת הגדרות עם כל השדות והתוויות הקיימות', () => {
    const { container } = render(<PluginInfoList plugin={plugin} />)
    const labels = Array.from(container.querySelectorAll('dt')).map((dt) => dt.textContent)
    expect(labels).toEqual(['גרסה', 'סטטוס', 'מפתח', 'עודכן', 'הורדות', 'גודל', 'תאימות', 'חיבור אינטרנט'])
    expect(screen.getByText('בטא')).toBeInTheDocument()
    expect(screen.getByText('2 KB')).toBeInTheDocument()
    expect(screen.getByText('נדרש')).toBeInTheDocument()
  })

  it('בלי גודל ידוע ובלי תאימות — השורות לא מוצגות', () => {
    const keys = buildInfoRows({ ...plugin, pluginFileSize: 0, compatibleWith: '', requiresNetwork: false }).map((r) => r.key)
    expect(keys).not.toContain('size')
    expect(keys).not.toContain('compat')
    render(<PluginInfoList plugin={{ ...plugin, requiresNetwork: false }} />)
    expect(screen.getByText('לא נדרש')).toBeInTheDocument()
  })
})
