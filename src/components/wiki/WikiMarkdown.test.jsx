import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import WikiMarkdown, { isAllowedImageSrc, isInternalHref } from './WikiMarkdown'

describe('isInternalHref', () => {
  it('נתיב באתר ועוגן — פנימיים', () => {
    expect(isInternalHref('/docs/search')).toBe(true)
    expect(isInternalHref('#intro')).toBe(true)
  })

  it('//host ו-/\host (protocol-relative) — חיצוניים', () => {
    expect(isInternalHref('//evil.example/login')).toBe(false)
    expect(isInternalHref('/\\evil.example')).toBe(false)
    expect(isInternalHref('https://example.com')).toBe(false)
  })
})

describe('SmartLink', () => {
  it('//host נפתח כקישור חיצוני (לשונית חדשה), לא כ-Link פנימי', () => {
    render(<WikiMarkdown markdown="[כניסה](//evil.example/login) ו-[חיפוש](/docs/search)" />)
    const external = screen.getByRole('link', { name: 'כניסה' })
    expect(external).toHaveAttribute('target', '_blank')
    expect(external).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByRole('link', { name: 'חיפוש' })).not.toHaveAttribute('target')
  })
})

describe('isAllowedImageSrc', () => {
  it('GitHub, האתר ונתיב יחסי — מותרים', () => {
    expect(isAllowedImageSrc('https://raw.githubusercontent.com/wiki/Otzaria/otzaria/a.png')).toBe(true)
    expect(isAllowedImageSrc('https://github.com/user-attachments/assets/x')).toBe(true)
    expect(isAllowedImageSrc('https://www.otzaria.org/logo.png')).toBe(true)
    expect(isAllowedImageSrc('/logo.png')).toBe(true)
    expect(isAllowedImageSrc('https://media.githubusercontent.com/media/a.png')).toBe(true)
  })

  it('מארח זר, http, //host ו-javascript — חסומים', () => {
    expect(isAllowedImageSrc('https://tracker.example/p.gif')).toBe(false)
    expect(isAllowedImageSrc('http://raw.githubusercontent.com/a.png')).toBe(false)
    expect(isAllowedImageSrc('//tracker.example/p.gif')).toBe(false)
    expect(isAllowedImageSrc('https://raw.githubusercontent.com.evil.example/a.png')).toBe(false)
    expect(isAllowedImageSrc('javascript:alert(1)')).toBe(false)
    expect(isAllowedImageSrc('data:image/png;base64,AAAA')).toBe(false)
    expect(isAllowedImageSrc('/api/auth/signout')).toBe(false)
    expect(isAllowedImageSrc('/API/x')).toBe(false)
    expect(isAllowedImageSrc('/docs/../api/x')).toBe(false)
    expect(isAllowedImageSrc('/%61pi/x')).toBe(false)
    expect(isAllowedImageSrc('')).toBe(false)
  })

  it('תמונה ממארח זר — לא נטענת, רק טקסט החלופה', () => {
    const { container } = render(<WikiMarkdown markdown="![פיקסל](https://tracker.example/p.gif)" />)
    expect(container.querySelector('img')).toBeNull()
    expect(container).toHaveTextContent('פיקסל')
  })
})

describe('נרמול TAB/LF/CR (עקיפת protocol-relative)', () => {
  it('isInternalHref: "/\t/evil" ודומיו — חיצוניים', () => {
    expect(isInternalHref('/\t/evil.example')).toBe(false)
    expect(isInternalHref('/\n/evil.example')).toBe(false)
    expect(isInternalHref('/\r/evil.example')).toBe(false)
    expect(isInternalHref('/ /evil.example')).toBe(false)
    expect(isInternalHref('/\t\\evil.example')).toBe(false)
    expect(isInternalHref('/docs/a%20b')).toBe(true)
  })

  it('isAllowedImageSrc: תמונה "/\t/tracker" חסומה; נתיב תקין ועוגן-בלבד כמו קודם', () => {
    expect(isAllowedImageSrc('/\t/tracker.example/p.gif')).toBe(false)
    expect(isAllowedImageSrc('/\n/tracker.example/p.gif')).toBe(false)
    expect(isAllowedImageSrc('/\t/api/x')).toBe(false)
    expect(isAllowedImageSrc('/a\tpi/x')).toBe(false)
    expect(isAllowedImageSrc('/img/a.png')).toBe(true)
  })

  it('camo.githubusercontent.com אינו מארח מותר', () => {
    expect(isAllowedImageSrc('https://camo.githubusercontent.com/abc')).toBe(false)
  })
})

describe('SmartLink — מקרי קצה', () => {
  it('mailto/tel — בלי target=_blank', () => {
    render(<WikiMarkdown markdown="[כתבו](mailto:a@b.co)" />)
    const a = screen.getByRole('link', { name: 'כתבו' })
    expect(a).toHaveAttribute('href', 'mailto:a@b.co')
    expect(a).not.toHaveAttribute('target')
  })

  it('href ריק — טקסט בלבד, לא קישור', () => {
    render(<WikiMarkdown markdown="[ריק]()" />)
    expect(screen.queryByRole('link')).toBeNull()
    screen.getByText('ריק')
  })
})

describe('מזהי כותרות', () => {
  it('כותרות כפולות — מזהים ייחודיים, זהים ל-TOC', () => {
    const { container } = render(<WikiMarkdown markdown={'## שלום\n\ntext\n\n## שלום\n\n### [קישור](/x) **מודגש**\n'} />)
    const ids = [...container.querySelectorAll('h2, h3')].map((h) => h.id)
    expect(ids).toEqual(['שלום', 'שלום-2', 'קישור-מודגש'])
  })

  it('## בתוך בלוק קוד אינה כותרת ולא מסיטה את המזהים', () => {
    const { container } = render(<WikiMarkdown markdown={'```\n## x\n```\n\n## א\n\n## א\n'} />)
    expect([...container.querySelectorAll('h2')].map((h) => h.id)).toEqual(['א', 'א-2'])
  })
})
