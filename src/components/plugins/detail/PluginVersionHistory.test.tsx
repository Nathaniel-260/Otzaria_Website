import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PluginVersionHistory, { VERSIONS_PREVIEW } from './PluginVersionHistory'

const versions = Array.from({ length: 8 }, (_, i) => ({
  version: `1.${7 - i}.0`,
  status: i === 0 ? 'stable' : 'beta',
  releasedAt: '2026-01-01',
  pluginFileSize: 2048,
  isLatest: i === 0
}))

describe('PluginVersionHistory', () => {
  it('לא מוצג כשיש גרסה אחת בלבד', () => {
    const { container } = render(<PluginVersionHistory pluginId="p" versions={versions.slice(0, 1)} currentVersion="1.7.0" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('הגרסה הנצפית מסומנת ואינה קישור; האחרות מקשרות לעמוד הגרסה', () => {
    render(<PluginVersionHistory pluginId="p" versions={versions} currentVersion="1.7.0" />)
    const current = screen.getByText('1.7.0').closest('[aria-current="page"]')
    expect(current).not.toBeNull()
    expect(screen.getByText('עדכנית')).toBeInTheDocument()
    expect(screen.getByText('1.6.0').closest('a')).toHaveAttribute('href', '/plugins/p@1.6.0')
  })

  it('מקוצר ל-5 גרסאות, "הצג עוד" פותח את כולן', async () => {
    const user = userEvent.setup()
    render(<PluginVersionHistory pluginId="p" versions={versions} currentVersion="1.7.0" />)
    expect(screen.getAllByRole('listitem')).toHaveLength(VERSIONS_PREVIEW)
    const more = screen.getByRole('button', { name: 'הצג עוד (3)' })
    expect(more).toHaveAttribute('aria-expanded', 'false')
    await user.click(more)
    expect(screen.getAllByRole('listitem')).toHaveLength(8)
    expect(screen.getByRole('button', { name: 'הצג פחות' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('גרסה ישנה שנצפית נשארת גלויה גם בתצוגה המקוצרת, והעדכנית מקשרת לעמוד הראשי', () => {
    render(<PluginVersionHistory pluginId="p" versions={versions} currentVersion="1.0.0" />)
    expect(screen.getByText('1.0.0').closest('[aria-current="page"]')).not.toBeNull()
    expect(screen.getByText('1.7.0').closest('a')).toHaveAttribute('href', '/plugins/p')
  })
})
