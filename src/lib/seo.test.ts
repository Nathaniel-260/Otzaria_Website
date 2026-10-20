import { describe, expect, it } from 'vitest'
import { OG_IMAGE, pageMetadata, SITE_URL } from './seo'

describe('pageMetadata', () => {
  it('בונה canonical, Open Graph ו-Twitter עקביים מאותה כותרת ותיאור', () => {
    const m = pageMetadata({ title: 'שאלות נפוצות', description: 'תיאור', path: '/faq' })
    expect(m.title).toBe('שאלות נפוצות | אוצריא')
    expect(m.alternates?.canonical).toBe('/faq')
    expect(m.openGraph).toMatchObject({ title: 'שאלות נפוצות', description: 'תיאור', url: '/faq', locale: 'he_IL', type: 'website' })
    expect(m.twitter).toMatchObject({ card: 'summary', title: 'שאלות נפוצות' })
    expect(OG_IMAGE.url.startsWith('/')).toBe(true)
  })

  it('כתובת האתר ללא / בסוף', () => {
    expect(SITE_URL.endsWith('/')).toBe(false)
  })
})
