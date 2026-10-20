import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import JsonLd, { serializeJsonLd } from './JsonLd'

describe('JsonLd', () => {
  it('מרנדר script מסוג application/ld+json עם JSON תקין', () => {
    const { container } = render(<JsonLd data={{ '@context': 'https://schema.org', '@type': 'WebSite', name: 'אוצריא' }} />)
    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()
    expect(JSON.parse(script!.textContent ?? '')).toEqual({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'אוצריא',
    })
  })

  it('מחליף את "<" ברצף הבריחה u003c כך שאי אפשר לסגור את ה-script מתוך הנתונים', () => {
    const payload = { name: '</script><script>alert(1)</script>' }
    const out = serializeJsonLd(payload)
    expect(out).not.toContain('<')
    expect(out).toContain(String.fromCharCode(92) + 'u003c/script')
    expect(JSON.parse(out)).toEqual(payload)

    const { container } = render(<JsonLd data={payload} />)
    expect(container.querySelectorAll('script')).toHaveLength(1)
  })

  it('מחליף מפרידי שורה U+2028/U+2029', () => {
    const out = serializeJsonLd({ t: 'a\u2028b\u2029c' })
    expect(out).not.toMatch(/[\u2028\u2029]/)
    expect(JSON.parse(out).t).toBe('a\u2028b\u2029c')
  })
})
