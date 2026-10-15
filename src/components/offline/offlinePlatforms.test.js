import { describe, expect, it } from 'vitest'
import { detectOfflinePlatform, formatReleaseDate, formatSize } from './offlinePlatforms.js'

const WIN_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36'
const MAC_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15'

describe('detectOfflinePlatform', () => {
  it('מזהה Windows ו-macOS', () => {
    expect(detectOfflinePlatform({ userAgent: WIN_UA, platform: 'Win32' })).toBe('windows')
    expect(detectOfflinePlatform({ userAgent: MAC_UA, platform: 'MacIntel' })).toBe('macos')
  })
  it('טלפון וטאבלט (כולל iPad שמתחזה ל-Mac) — mobile', () => {
    expect(detectOfflinePlatform({ userAgent: 'Mozilla/5.0 (Linux; Android 14) Mobile', platform: 'Linux armv8l' })).toBe('mobile')
    expect(detectOfflinePlatform({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', platform: 'iPhone' })).toBe('mobile')
    expect(detectOfflinePlatform({ userAgent: MAC_UA, platform: 'MacIntel', maxTouchPoints: 5 })).toBe('mobile')
  })
  it('Linux — other; בלי מידע — null', () => {
    expect(detectOfflinePlatform({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64)', platform: 'Linux x86_64' })).toBe('other')
    expect(detectOfflinePlatform({})).toBe(null)
  })
})

describe('formatSize', () => {
  it('מגה-בייט עם ספרה אחת, ובלי ספרה מ-100MB', () => {
    expect(formatSize(19_640_320)).toBe('18.7 MB')
    expect(formatSize(150 * 1024 * 1024)).toBe('150 MB')
  })
  it('בלי גודל — null', () => {
    expect(formatSize(0)).toBe(null)
    expect(formatSize(undefined)).toBe(null)
  })
})

describe('formatReleaseDate', () => {
  it('לפי שעון ירושלים (23:07 UTC הוא כבר היום הבא)', () => {
    const text = formatReleaseDate('2026-10-11T23:07:00Z')
    expect(text).toMatch(/12/)
    expect(text).toMatch(/2026/)
  })
  it('ערך חסר או שגוי — null', () => {
    expect(formatReleaseDate(null)).toBe(null)
    expect(formatReleaseDate('not-a-date')).toBe(null)
  })
})
