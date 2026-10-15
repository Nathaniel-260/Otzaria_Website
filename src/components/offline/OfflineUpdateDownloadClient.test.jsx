// בדיקות ל-OfflineUpdateDownloadClient: מספר הגרסה שמגיע כבר טעון (releases prop, נשלף בשרת
// ע"י OfflineUpdateDownload.jsx) מוצג; כש-releases הוא null מוצג מסר הנפילה והכרטיסים מובילים
// לדף הגרסאות; המערכת שזוהתה בדפדפן ראשונה ומסומנת; בטלפון — הערה שהכלי למחשב.
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

afterEach(() => vi.restoreAllMocks())

describe('OfflineUpdateDownloadClient', () => {
  test('מציג את מספר הגרסה ואת הקישורים הישירים לקבצים', () => {
    render(<OfflineUpdateDownloadClient repoUrl={REPO} releases={RELEASES} />)

    expect(screen.getByText('v1.2.3')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'הורד ל-Windows, 18.7 MB' })).toHaveAttribute('href', RELEASES.windows.url)
    expect(screen.getByRole('link', { name: 'הורד ל-macOS, 46.4 MB' })).toHaveAttribute('href', RELEASES.macos.url)
  })

  test('מציג מסר נפילה כש-releases הוא null, והכרטיסים מובילים לדף הגרסה האחרונה', () => {
    render(<OfflineUpdateDownloadClient repoUrl={REPO} releases={null} />)

    expect(screen.getByText(/לא הצלחנו לטעון את פרטי הגרסה/)).toBeInTheDocument()
    for (const link of downloadLinks()) expect(link).toHaveAttribute('href', `${REPO}/releases/latest`)
  })

  test('המערכת שזוהתה (macOS) ראשונה ומסומנת "המחשב שלך"', () => {
    mockNavigator({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', platform: 'MacIntel' })
    render(<OfflineUpdateDownloadClient repoUrl={REPO} releases={RELEASES} />)

    const [first, second] = downloadLinks()
    expect(first).toHaveAccessibleName(/macOS/)
    expect(first).toHaveTextContent('המחשב שלך')
    expect(second).not.toHaveTextContent('המחשב שלך')
  })

  test('בטלפון מוצגת הערה שהכלי מיועד למחשב, ושני הכרטיסים נשארים זמינים', () => {
    mockNavigator({ userAgent: 'Mozilla/5.0 (Linux; Android 14) Mobile', platform: 'Linux armv8l' })
    render(<OfflineUpdateDownloadClient repoUrl={REPO} releases={RELEASES} />)

    expect(screen.getByRole('note')).toHaveTextContent(/מיועד למחשב/)
    expect(downloadLinks()).toHaveLength(2)
    expect(screen.queryByText('המחשב שלך')).not.toBeInTheDocument()
  })
})
