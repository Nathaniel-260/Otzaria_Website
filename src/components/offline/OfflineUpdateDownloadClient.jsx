'use client'

import { useEffect, useState } from 'react'
import AppIcon from '@/components/ui/AppIcon'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import OfflinePlatformCard from './OfflinePlatformCard'
import { detectOfflinePlatform, formatReleaseDate, formatSize, OFFLINE_PLATFORM_KEYS, resolvePrimaryPlatform } from './offlinePlatforms'

// מונחים לועזיים בבידוד (bdi) — אחרת "10 / 11" והסוגריים מתהפכים בשורה עברית
const PLATFORMS = {
  windows: {
    icon: 'desktop_windows',
    title: 'Windows',
    requirement: <><bdi dir="ltr" className="whitespace-nowrap">Windows 10 / 11</bdi> (64 סיביות)</>,
    kind: 'קובץ אחד, בלי התקנה'
  },
  macos: {
    icon: 'laptop_mac',
    title: 'macOS',
    requirement: <><bdi dir="ltr" className="whitespace-nowrap">macOS 10.15</bdi> ומעלה</>,
    kind: <>קובץ <bdi dir="ltr" className="whitespace-nowrap">zip</bdi></>
  }
}

/**
 * אזור ההורדה של "עדכוני אוצריא" — releases מגיע כבר טעון מהשרת (OfflineUpdateDownload.jsx,
 * ה-Server Component שעוטף את הרכיב הזה). כש-releases הוא null (השליפה נכשלה) כל כרטיס מוביל
 * לדף הגרסאות. כאן נשאר רק מה שדורש דפדפן: זיהוי המערכת — הכרטיס שלה בולט (מורם, כפתור מלא)
 * ומסומן "המחשב שלך". בלי זיהוי מתאים (טלפון, Linux, לא ידוע — וגם ברינדור השרת) כרטיס Windows
 * ראשי, בלי התג. סדר הכרטיסים קבוע (Windows, macOS) גם אחרי הזיהוי, וההדגשה משנה רק צבע וצל —
 * העמוד לא זז אחרי ה-hydration.
 */
export default function OfflineUpdateDownloadClient({ repoUrl, releases }) {
  const [detected, setDetected] = useState(null)

  useEffect(() => {
    // navigator קיים רק בדפדפן; עד הזיהוי — ברירת המחדל (Windows ראשי, כמו ברינדור השרת)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDetected(detectOfflinePlatform({
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      maxTouchPoints: navigator.maxTouchPoints
    }))
  }, [])

  const primary = resolvePrimaryPlatform(detected)
  const releasesPage = releases?.releaseUrl || `${repoUrl}/releases/latest`
  const date = formatReleaseDate(releases?.publishedAt)

  return (
    <div className="flex flex-col gap-5">
      <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        {OFFLINE_PLATFORM_KEYS.map((key) => {
          const platform = PLATFORMS[key]
          const asset = releases?.[key]
          const size = formatSize(asset?.size)
          return (
            <li key={key}>
              <OfflinePlatformCard
                href={asset?.url || releasesPage}
                icon={platform.icon}
                title={platform.title}
                details={[platform.requirement, size ? <>{platform.kind} · <bdi dir="ltr" className="whitespace-nowrap">{size}</bdi></> : platform.kind]}
                actionLabel={`הורד ל-${platform.title}`}
                idPrefix={`offline-download-${key}`}
                primary={key === primary.key}
                matched={key === primary.key && primary.matched}
              />
            </li>
          )
        })}
      </ul>

      {/* אחרי הכרטיסים ולא לפניהם: ההערה מופיעה רק אחרי הזיהוי בדפדפן, ומעליהם הייתה דוחפת
          אותם למטה (קפיצת layout) */}
      {detected === 'mobile' && (
        <Card tone="tonal" role="note" padding="sm" className="flex items-start gap-3 text-body-sm text-on-surface">
          <AppIcon name="smartphone" className="mt-0.5 shrink-0 text-xl text-on-tile" />
          <p>הכלי הזה מיועד למחשב (<bdi dir="ltr" className="whitespace-nowrap">Windows</bdi> או <bdi dir="ltr" className="whitespace-nowrap">macOS</bdi>). בטלפון ובטאבלט, אוצריא מתעדכנת דרך חנות האפליקציות.</p>
        </Card>
      )}

      <div className="flex flex-col items-center gap-3 text-center">
        <p className="flex max-w-measure items-start gap-2 text-body-sm text-on-surface-variant">
          <AppIcon name="usb" className="mt-0.5 shrink-0 text-xl text-on-tile" />
          <span>שמור את הקובץ ישר על כונן USB. אותו כונן ישמש אותך בשני המחשבים.</span>
        </p>
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-body-sm text-on-surface-variant">
          {releases?.version ? (
            <>
              <Badge>גרסה <bdi dir="ltr" className="whitespace-nowrap">{releases.version}</bdi></Badge>
              {date && <span>פורסמה ב-{date}</span>}
            </>
          ) : (
            <span>לא הצלחנו לטעון את פרטי הגרסה. אפשר להוריד את הכלי מדף כל הגרסאות.</span>
          )}
          <Button href={`${repoUrl}/releases`} external variant="text" size="sm" iconEnd="open_in_new">
            כל הגרסאות<span className="sr-only"> ב-GitHub (נפתח בחלון חדש)</span>
          </Button>
        </p>
      </div>
    </div>
  )
}
