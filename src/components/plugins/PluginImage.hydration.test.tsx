import { describe, it, expect, vi, afterEach } from 'vitest'
import { act } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { hydrateRoot } from 'react-dom/client'
import PluginImage, { PLUGIN_IMAGE_FALLBACK } from './PluginImage'

// hydration של HTML מהשרת: בלי אזהרת אי-התאמה, ותמונה שנכשלה *לפני* ה-hydration (onError כבר לא
// יירה) עוברת לחלופה רק אחרי ה-hydration — לא ברינדור הראשון של הלקוח.
afterEach(() => vi.restoreAllMocks())

function serverMarkup(src: string) {
  const container = document.createElement('div')
  container.innerHTML = renderToString(<PluginImage src={src} priority />)
  document.body.appendChild(container)
  return container
}

describe('PluginImage — hydration', () => {
  it('בלי אזהרות אי-התאמה', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const container = serverMarkup('/api/plugins/p1/image')
    await act(async () => { hydrateRoot(container, <PluginImage src="/api/plugins/p1/image" priority />) })
    expect(errors).not.toHaveBeenCalled()
  })

  it('תמונה שכבר נכשלה לפני ה-hydration — חלופה אחרי ה-hydration, בלי אזהרה', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const container = serverMarkup('/missing.webp')
    const img = container.querySelector('img') as HTMLImageElement
    Object.defineProperty(img, 'complete', { value: true })
    Object.defineProperty(img, 'naturalWidth', { value: 0 })
    await act(async () => { hydrateRoot(container, <PluginImage src="/missing.webp" priority />) })
    expect(errors).not.toHaveBeenCalled()
    expect(container.querySelector('img')).toHaveAttribute('src', PLUGIN_IMAGE_FALLBACK)
  })
})
