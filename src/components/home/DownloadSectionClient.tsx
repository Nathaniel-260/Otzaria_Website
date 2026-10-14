'use client'

import { useState, useEffect } from 'react'
import DownloadAssistantOptions, { AndroidAssistantNotice, hasDownloadAssistant } from './DownloadAssistantOptions'
import SectionHeading from './SectionHeading'
import IconTile from './IconTile'
import DownloadDialog from './DownloadDialog'
import DownloadOptionCard from './DownloadOptionCard'
// ייבוא טיפוס בלבד (נמחק בקומפילציה) — הקוד של stableDownloads.ts נשאר בשרת
import type { Downloads } from './stableDownloads'

type PlatformLinks = Record<string, string | undefined>

type PlatformButtonConfig = {
  icon: string
  title: string
  subtitle: string
  onClick: () => void
}

type DownloadOption = {
  key: string
  icon: string
  title: string
  desc: string
  isLink?: boolean
}

// stableDownloads מגיע כבר טעון מהשרת (ראו DownloadSection.tsx, ה-Server Component
// שעוטף את הרכיב הזה) — כאן נשארת רק האינטראקטיביות (זיהוי פלטפורמה, מודלים).
export default function DownloadSectionClient({ stableDownloads }: { stableDownloads: Downloads | null }) {
  // חלון ההורדה הפתוח (מפתח פלטפורמה: windows / linux / ...), או null
  const [openPlatform, setOpenPlatform] = useState<string | null>(null)

  const [detectedPlatform, setDetectedPlatform] = useState<string | null>(null)
  const [showAllPlatforms, setShowAllPlatforms] = useState(false)

  // זיהוי פלטפורמה אוטומטי
  useEffect(() => {
    const detectPlatform = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      const platform = navigator.platform?.toLowerCase() || ''

      if (/android/.test(userAgent)) {
        return 'android'
      } else if (/iphone|ipad|ipod/.test(userAgent)) {
        return 'ios'
      } else if (/mac/.test(platform) || /macintosh/.test(userAgent)) {
        return 'macos'
      } else if (/win/.test(platform) || /windows/.test(userAgent)) {
        return 'windows'
      } else if (/linux/.test(platform) || /linux/.test(userAgent)) {
        return 'linux'
      }
      return null
    }

    // זיהוי פלטפורמה רץ רק בצד הלקוח (navigator לא קיים בשרת)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDetectedPlatform(detectPlatform())
  }, [])

  // פונקציה להחזרת שם הפלטפורמה בעברית
  const getPlatformName = (platform: string) => {
    const names: Record<string, string> = {
      windows: 'Windows',
      linux: 'Linux',
      android: 'Android',
      ios: 'iOS',
      macos: 'macOS'
    }
    return names[platform] || platform
  }

  // פונקציה להצגת כפתור פלטפורמה
  const renderPlatformButton = (platform: string, large: boolean = false) => {
    const platformConfig: Record<string, PlatformButtonConfig> = {
      windows: {
        icon: 'desktop_windows',
        title: 'Windows',
        subtitle: '10 / 11',
        onClick: () => setOpenPlatform('windows')
      },
      linux: {
        icon: 'computer',
        title: 'Linux',
        subtitle: 'כל ההפצות',
        onClick: () => setOpenPlatform('linux')
      },
      android: {
        icon: 'phone_android',
        title: 'Android',
        subtitle: 'Google Play / APK',
        onClick: () => setOpenPlatform('android')
      },
      ios: {
        icon: 'phone_iphone',
        title: 'iOS',
        subtitle: 'App Store',
        onClick: () => setOpenPlatform('ios')
      },
      macos: {
        icon: 'laptop_mac',
        title: 'macOS',
        subtitle: 'Intel / Apple Silicon',
        onClick: () => setOpenPlatform('macos')
      }
    }

    const config = platformConfig[platform]
    if (!config) return null
    const assistantLinks = stableDownloads?.[platform as keyof Downloads]
    const subtitle = hasDownloadAssistant(config.title, (assistantLinks as PlatformLinks | undefined) || {})
      ? `${config.subtitle} · באמצעות מסייע ההורדה`
      : config.subtitle

    // שורת כרטיס בסגנון המתקין: אריח אייקון, כותרת ושורת משנה, ו"כפתור" ראשי מלא
    if (large) {
      return (
        <button
          type="button"
          onClick={config.onClick}
          className="group flex w-full items-center gap-4 rounded-lg bg-card p-4 text-start transition-colors hover:bg-card-selected focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:gap-5 sm:p-6"
        >
          <IconTile icon={config.icon} size="lg" />
          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-bold text-on-surface sm:text-2xl">{config.title}</h3>
            <p className="mt-0.5 text-sm text-on-surface-variant sm:text-base">{subtitle}</p>
          </div>
          <span className="inline-flex h-12 shrink-0 items-center gap-2 rounded-lg bg-primary px-3 font-semibold text-on-primary transition-colors group-hover:bg-primary-hover sm:px-5">
            <span className="material-symbols-outlined">download</span>
            <span className="hidden sm:inline">הורדה</span>
          </span>
        </button>
      )
    }

    return (
      <button
        type="button"
        onClick={config.onClick}
        className="group flex h-full w-full items-center gap-4 rounded-lg bg-card p-4 text-start transition-colors hover:bg-card-selected focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:flex-col lg:items-start lg:p-5"
      >
        <IconTile icon={config.icon} size="md" />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold text-on-surface">{config.title}</h3>
          <p className="mt-0.5 text-sm text-on-surface-variant">{subtitle}</p>
        </div>
        <span className="material-symbols-outlined text-primary lg:hidden" aria-hidden="true">chevron_left</span>
      </button>
    )
  }

  return (
    <>
      {/* Download Section (Software) */}
      <section id="download" aria-labelledby="download-heading" className="anchor-section px-4 py-14 md:px-8 md:py-20">
          <div className="container mx-auto w-full max-w-6xl 2xl:max-w-7xl">
              <SectionHeading id="download-heading" title="הורדת התוכנה" className="md:!mb-6 !mb-5" />

              {/* הצגת כפתור הורדה לפלטפורמה שזוהתה */}
              {detectedPlatform && !showAllPlatforms ? (
                <div className="mx-auto max-w-2xl">
                  <p className="mb-6 text-center text-lg text-on-surface-variant">זיהינו שאתה משתמש ב-{getPlatformName(detectedPlatform)}</p>

                  <div className="flex flex-col items-center gap-3">
                    {renderPlatformButton(detectedPlatform, true)}

                    <button
                      type="button"
                      onClick={() => setShowAllPlatforms(true)}
                      className="flex min-h-12 items-center gap-1 rounded-lg px-3 text-sm font-medium text-primary hover:bg-card-selected"
                    >
                      <span>הורדה למערכת אחרת</span>
                      <span className="material-symbols-outlined text-lg">expand_more</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="mb-8 text-center text-lg text-on-surface-variant">
                    {detectedPlatform ? 'בחר מערכת' : 'לא הצלחנו לזהות את המערכת שלך — בחר מערכת'}
                  </p>

                  {/* נייד: רשימה; טבלט: שתי עמודות; דסקטופ: חמישה כרטיסים אנכיים בשורה */}
                  <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-5">
                      {renderPlatformButton('windows')}
                      {renderPlatformButton('linux')}
                      {renderPlatformButton('android')}
                      {renderPlatformButton('ios')}
                      {renderPlatformButton('macos')}
                  </div>

                  {detectedPlatform && (
                    <div className="mt-6 text-center">
                      <button
                        type="button"
                        onClick={() => setShowAllPlatforms(false)}
                        className="mx-auto flex min-h-12 items-center gap-1 rounded-lg px-3 text-sm font-medium text-primary hover:bg-card-selected"
                      >
                        <span className="material-symbols-outlined text-lg">expand_less</span>
                        <span>חזור להורדה ל-{getPlatformName(detectedPlatform)}</span>
                      </button>
                    </div>
                  )}
                </>
              )}
          </div>
      </section>

      {openPlatform && (
        <DownloadDialog
          title={`הורדת אוצריא ל-${getPlatformName(openPlatform)}`}
          onClose={() => setOpenPlatform(null)}
        >
          {renderDownloadOptions(getPlatformName(openPlatform), getDialogLinks(openPlatform, stableDownloads))}
        </DownloadDialog>
      )}
    </>
  )
}

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=org.otzaria.otzaria'
const APP_STORE_URL = 'https://apps.apple.com/us/app/otzaria/id6738098031'

// הקישורים שמוצגים בחלון של כל מערכת. Android ו-iOS מקבלים גם קישורי חנות קבועים,
// ו-Android גם את מסייע ה-Windows (להכנת התקנה למכשיר בלי אינטרנט).
function getDialogLinks(platform: string, downloads: Downloads | null): PlatformLinks {
  if (platform === 'android') {
    return {
      playStore: PLAY_STORE_URL,
      apk: downloads?.android?.apk,
      zipFull: downloads?.android?.zipFull,
      windowsAssistant: downloads?.windows?.assistant
    }
  }
  if (platform === 'ios') return { appStore: APP_STORE_URL }
  return (downloads?.[platform as 'windows' | 'linux' | 'macos'] as PlatformLinks | undefined) || {}
}

function renderDownloadOptions(platform: string, links: PlatformLinks) {
  // כשיש מסייע הורדה לפלטפורמה מוצג רק הוא; release ישן בלעדיו מציג את הקבצים הישירים.
  if (hasDownloadAssistant(platform, links)) {
    return <DownloadAssistantOptions platform={platform} links={links} />
  }

  const options: Record<string, DownloadOption[]> = {
    Windows: [
      { key: 'exe', icon: 'install_desktop', title: 'EXE Installer', desc: 'קובץ התקנה רגיל — הורדת הספרייה תתבצע דרך התוכנה' },
      { key: 'exeArm64', icon: 'memory', title: 'EXE Installer (ARM64)', desc: 'למחשבי ARM עם מעבד Snapdragon — רק בגרסה זו התוספים עובדים' },
      { key: 'exeFull', icon: 'install_desktop', title: 'EXE Installer (Full)', desc: 'מתקין מלא להתקנה במחשב ללא אינטרנט' },
      { key: 'msix', icon: 'package_2', title: 'MSIX Package', desc: 'התקנה דרך החנות' }
    ],
    Linux: [
      { key: 'deb', icon: 'package_2', title: 'DEB Package', desc: 'עבור Ubuntu/Debian' },
      { key: 'rpm', icon: 'package_2', title: 'RPM Package', desc: 'עבור Fedora/RedHat' },
      { key: 'appimage', icon: 'apps', title: 'AppImage', desc: 'קובץ הרצה אוניברסלי' },
      { key: 'tarFull', icon: 'folder_zip', title: 'Full Package', desc: 'מתקין מלא להתקנה במחשב ללא אינטרנט' }
    ],
    Android: [
      { key: 'playStore', icon: 'shop', title: 'Google Play', desc: 'התקנה מהחנות', isLink: true },
      { key: 'apk', icon: 'android', title: 'APK File', desc: 'התקנה ידנית — הורדת הספרייה תתבצע דרך התוכנה' },
      { key: 'zipFull', icon: 'folder_zip', title: 'Full Package', desc: 'מתקין מלא להתקנה ללא אינטרנט' }
    ],
    iOS: [
      { key: 'appStore', icon: 'shop', title: 'App Store', desc: 'הורדה מחנות האפליקציות', isLink: true }
    ],
    macOS: [
      { key: 'dmg', icon: 'album', title: 'DMG Image', desc: 'קובץ התקנה רגיל — הורדת הספרייה תתבצע דרך התוכנה' },
      { key: 'zip', icon: 'folder_zip', title: 'macOS Package', desc: 'גרסה דחוסה' },
      { key: 'zipFull', icon: 'folder_zip', title: 'Full Package', desc: 'מתקין מלא להתקנה במחשב ללא אינטרנט' }
    ]
  }

  const platformOptions = options[platform] || []
  const validOptions = platformOptions.filter((opt) => links && links[opt.key])

  if (validOptions.length === 0) {
    return <p className="rounded-lg bg-card p-4 text-center text-on-surface-variant">אין הורדות זמינות כרגע לגרסה זו.</p>
  }

  // האפשרות הראשונה היא הפעולה הראשית בחלון; השאר חלופות משניות
  const optionLinks = validOptions.map((option, index) => (
    <DownloadOptionCard
      key={option.key}
      href={links[option.key] as string}
      icon={option.icon}
      title={option.title}
      desc={option.desc}
      emphasis={index === 0 ? 'primary' : 'tonal'}
      external={option.isLink}
    />
  ))

  if (platform === 'Android' && links.windowsAssistant) {
    return [...optionLinks, <AndroidAssistantNotice key="windowsAssistant" href={links.windowsAssistant} />]
  }
  return optionLinks
}
