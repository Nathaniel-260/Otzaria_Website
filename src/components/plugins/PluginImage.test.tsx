import { describe, it, expect } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import PluginImage, { PLUGIN_IMAGE_FALLBACK } from './PluginImage'

describe('PluginImage', () => {
  it('מציג את תמונת התוסף, alt ריק כברירת מחדל ו-lazy', () => {
    const { container } = render(<PluginImage src="/api/plugins/p1/image" />)
    const img = container.querySelector('img') as HTMLImageElement
    expect(img).toHaveAttribute('src', '/api/plugins/p1/image')
    expect(img).toHaveAttribute('alt', '')
    expect(img).toHaveAttribute('loading', 'lazy')
  })

  it('priority — eager ובעדיפות גבוהה', () => {
    const { container } = render(<PluginImage src="/x.webp" priority />)
    const img = container.querySelector('img') as HTMLImageElement
    expect(img).toHaveAttribute('loading', 'eager')
    expect(img.getAttribute('fetchpriority') ?? img.getAttribute('fetchPriority')).toBe('high')
  })

  it('בלי src — הלוגו של אוצריא כחלופה', () => {
    const { container } = render(<PluginImage src="" />)
    expect(container.querySelector('img')).toHaveAttribute('src', PLUGIN_IMAGE_FALLBACK)
    expect(container.firstElementChild).toHaveAttribute('data-fallback')
  })

  it('כשל טעינה — עובר לחלופה', () => {
    const { container } = render(<PluginImage src="/missing.webp" alt="שם" />)
    fireEvent.error(container.querySelector('img') as HTMLImageElement)
    const img = container.querySelector('img') as HTMLImageElement
    expect(img).toHaveAttribute('src', PLUGIN_IMAGE_FALLBACK)
    expect(img).toHaveAttribute('alt', 'שם')
  })
})
