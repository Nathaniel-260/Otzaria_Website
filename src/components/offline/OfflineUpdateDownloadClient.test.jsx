// בדיקות ל-OfflineUpdateDownloadClient: מספר הגרסה שמגיע כבר טעון (releases prop, נשלף בשרת
// ע"י OfflineUpdateDownload.jsx) מוצג; כש-releases הוא null מוצג מסר הנפילה והכרטיסים מובילים
// לדף הגרסאות; המערכת שזוהתה בדפדפן מסומנת (בלי לשנות סדר); בלי זיהוי מתאים — Windows ראשי בלי
// התג "המחשב שלך"; בטלפון — הערה שהכלי למחשב.
import { afterEach, describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import OfflineUpdateDownloadClient from './OfflineUpdateDownloadClient'

const REPO = 'https://github.com/org/repo'
const RELEASES = {
  version: 'v1.2.3',
  publishedAt: '2026-10-11T23:07:00Z',
  windows: { url: 'https://example.com/win.exe', size: 19_640_320 },
  macos: { url: 'https://example.com/mac.zip', size: 48_603_042 }
}

function mockNavigator({ userAgent, platform }) {
  vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(userAgent)
  vi.spyOn(window.navigator, 'platform', 'get').mockReturnValue(platform)
}

const downloadLinks = () => screen.getAllByRole('link', { name: /^הורד ל-/ })
// הכרטיס הראשי — "כפתור" ההורדה שבו מלא (filled); בשאר — tonal
const isPrimary = (link) => link.querySelector('[id$="-action"]').className.includes('--button-filled-bg')

afterEach(() => vi.restoreAllMocks())

describe('OfflineUpdateDownloadClient', () => {
  test('מציג את מספר הגרסה ואת הקישורים הישירים לקבצים', () => {
    render(<OfflineUpdateDownloadClient repoUrl={REPO} releases={RELEASES} />)

    expect(screen.getByText('v1.2.3')).toBeInTheDocument()
    const windows = screen.getByRole('link', { name: 'הורד ל-Windows' })
    expect(windows).toHaveAttribute('href', RELEASES.windows.url)
    expect(windows).toHaveAccessibleDescription(/18\.7 MB/)
    expect(screen.getByRole('link', { name: 'הורד ל-macOS' })).toHaveAttribute('href', RELEASES.macos.url)
  })

  test('מציג מסר נפילה כש-releases הוא null, והכרטיסים מובילים לדף הגרסה האחרונה', () => {
    render(<OfflineUpdateDownloadClient repoUrl={REPO} releases={null} />)

    expect(screen.getByText(/לא הצלחנו לטעון את פרטי הגרסה/)).toBeInTheDocument()
    for (const link of downloadLinks()) expect(link).toHaveAttribute('href', `${REPO}/releases/latest`)
  })

  test('המערכת שזוהתה (macOS) מסומנת "המחשב שלך", והסדר נשאר קבוע', () => {
    mockNavigator({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', platform: 'MacIntel' })
    render(<OfflineUpdateDownloadClient repoUrl={REPO} releases={RELEASES} />)

    const [first, second] = downloadLinks()
    expect(first).toHaveAccessibleName('הורד ל-Windows')
    expect(first).not.toHaveTextContent('המחשב שלך')
    expect(second).toHaveAccessibleName('הורד ל-macOS')
    expect(second).toHaveTextContent('המחשב שלך')
    expect(isPrimary(first)).toBe(false)
    expect(isPrimary(second)).toBe(true)
  })

  test('ב-Linux (מערכת שהכלי לא זמין לה) Windows ראשי, ובלי "המחשב שלך"', () => {
    mockNavigator({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64)', platform: 'Linux x86_64' })
    render(<OfflineUpdateDownloadClient repoUrl={REPO} releases={RELEASES} />)

    const [windows, macos] = downloadLinks()
    expect(isPrimary(windows)).toBe(true)
    expect(isPrimary(macos)).toBe(false)
    expect(screen.queryByText('המחשב שלך')).not.toBeInTheDocument()
  })

  test('בטלפון מוצגת הערה שהכלי מיועד למחשב, ושני הכרטיסים נשארים זמינים', () => {
    mockNavigator({ userAgent: 'Mozilla/5.0 (Linux; Android 14) Mobile', platform: 'Linux armv8l' })
    render(<OfflineUpdateDownloadClient repoUrl={REPO} releases={RELEASES} />)

    expect(screen.getByRole('note')).toHaveTextContent(/מיועד למחשב/)
    const [windows, macos] = downloadLinks()
    expect(isPrimary(windows)).toBe(true)
    expect(isPrimary(macos)).toBe(false)
    expect(screen.queryByText('המחשב שלך')).not.toBeInTheDocument()
  })
})
