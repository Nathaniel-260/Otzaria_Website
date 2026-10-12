'use client'

import { useState, useEffect } from 'react'
import DownloadAssistantOptions, { AndroidAssistantNotice, hasDownloadAssistant } from './DownloadAssistantOptions'
import SectionHeading from './SectionHeading'
import IconTile from './IconTile'

// מבנה נתוני ההורדות המוחזר מ-/api/github-releases
type PlatformLinks = Record<string, string | undefined>
type Downloads = {
  version?: string
  versions?: Record<string, string>
  windows?: PlatformLinks
  linux?: PlatformLinks
  android?: PlatformLinks
  ios?: PlatformLinks
  macos?: PlatformLinks
}

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
  const [windowsModalOpen, setWindowsModalOpen] = useState(false)
  const [linuxModalOpen, setLinuxModalOpen] = useState(false)
  const [androidModalOpen, setAndroidModalOpen] = useState(false)
  const [macModalOpen, setMacModalOpen] = useState(false)
  const [iosModalOpen, setIosModalOpen] = useState(false)

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
        onClick: () => setWindowsModalOpen(true)
      },
      linux: {
        icon: 'computer',
        title: 'Linux',
        subtitle: 'כל ההפצות',
        onClick: () => setLinuxModalOpen(true)
      },
      android: {
        icon: 'phone_android',
        title: 'Android',
        subtitle: 'Google Play / APK',
        onClick: () => setAndroidModalOpen(true)
      },
      ios: {
        icon: 'phone_iphone',
        title: 'iOS',
        subtitle: 'App Store',
        onClick: () => setIosModalOpen(true)
      },
      macos: {
        icon: 'laptop_mac',
        title: 'macOS',
        subtitle: 'Intel / Apple Silicon',
        onClick: () => setMacModalOpen(true)
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
      <section id="download" aria-labelledby="download-heading" className="scroll-mt-20 px-4 py-14 md:px-8 md:py-20">
          <div className="container mx-auto max-w-6xl">
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
                      <span>הורד למערכת אחרת</span>
                      <span className="material-symbols-outlined text-lg">expand_more</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="mb-8 text-center text-lg text-on-surface-variant">
                    {detectedPlatform ? 'בחר פלטפורמה' : 'לא הצלחנו לזהות את המערכת שלך - בחר פלטפורמה'}
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

      {/* Modals */}
      <DownloadModal
        isOpen={windowsModalOpen}
        onClose={() => setWindowsModalOpen(false)}
        platform="Windows"
        links={stableDownloads?.windows || {}}
        version={stableDownloads?.versions?.windows ?? stableDownloads?.version}
      />
      <DownloadModal
        isOpen={linuxModalOpen}
        onClose={() => setLinuxModalOpen(false)}
        platform="Linux"
        links={stableDownloads?.linux || {}}
        version={stableDownloads?.versions?.linux ?? stableDownloads?.version}
      />
      <DownloadModal
        isOpen={androidModalOpen}
        onClose={() => setAndroidModalOpen(false)}
        platform="Android"
        links={{
          playStore: 'https://play.google.com/store/apps/details?id=org.otzaria.otzaria',
          apk: stableDownloads?.android?.apk,
          zipFull: stableDownloads?.android?.zipFull,
          windowsAssistant: stableDownloads?.windows?.assistant
        }}
        version={stableDownloads?.versions?.android ?? stableDownloads?.version}
      />
      <DownloadModal
        isOpen={iosModalOpen}
        onClose={() => setIosModalOpen(false)}
        platform="iOS"
        links={{
          appStore: 'https://apps.apple.com/us/app/otzaria/id6738098031'
        }}
        version={stableDownloads?.version}
      />
      <DownloadModal
        isOpen={macModalOpen}
        onClose={() => setMacModalOpen(false)}
        platform="macOS"
        links={stableDownloads?.macos || {}}
        version={stableDownloads?.versions?.macos ?? stableDownloads?.version}
      />
    </>
  )
}

// Download Modal Component
function DownloadModal({ isOpen, onClose, platform, links, version }: {
  isOpen: boolean
  onClose: () => void
  platform: string
  links: PlatformLinks
  version?: string
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 p-3 sm:p-4" onClick={onClose}>
      {/* כניסה ב-CSS (אותה דעיכה והגדלה מ-0.95 שהייתה ב-framer-motion). ה-exit
          של framer לא פעל ממילא — המודל אינו עטוף ב-AnimatePresence. */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ animationDuration: '0.3s' }}
        className="flex flex-col overflow-hidden bg-background rounded-lg w-full max-w-2xl shadow-2xl max-h-[90vh] animate-enter-scale"
      >
        {/* Fixed Header */}
        {/* כותרת המודל ברקע topBar של האפליקציה, עם קו הפרדה דק */}
        <div className="flex items-center justify-between gap-3 py-2 ps-5 pe-2 bg-top-bar border-b border-surface-variant flex-shrink-0 sm:ps-6">
          <h2 className="text-lg font-bold text-on-surface sm:text-xl">
            הורדת אוצריא ל-{platform}
            {version && <span className="text-sm font-normal text-on-surface-variant mr-2"> ({version})</span>}
          </h2>
          <button type="button" onClick={onClose} aria-label="סגירה" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg hover:bg-card-selected transition-colors text-on-surface-variant">
            <span className="material-symbols-outlined text-2xl block">close</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 overflow-y-auto custom-scrollbar flex-1 sm:p-6">
          <div className="grid gap-3">
            {renderDownloadOptions(platform, links)}
          </div>
        </div>
      </div>
    </div>
  )
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
    return <p className="text-on-surface-variant p-4 bg-card rounded-lg text-center">אין הורדות זמינות כרגע לגרסה זו.</p>
  }

  const optionLinks = validOptions.map((option) => (
    <a
      key={option.key}
      href={links[option.key]}
      target={option.isLink ? "_blank" : undefined}
      rel={option.isLink ? "noopener noreferrer" : undefined}
      className="flex items-center gap-4 p-4 rounded-lg transition-colors group bg-card hover:bg-card-selected"
    >
      <IconTile icon={option.icon} />
      <div className="min-w-0 flex-1">
        <h4 className="font-bold text-on-surface">{option.title}</h4>
        <p className="text-sm text-on-surface-variant">{option.desc}</p>
      </div>
      <span className="material-symbols-outlined text-outline group-hover:text-primary">
        {option.isLink ? 'open_in_new' : 'download'}
      </span>
    </a>
  ))

  if (platform === 'Android' && links.windowsAssistant) {
    return [...optionLinks, <AndroidAssistantNotice key="windowsAssistant" href={links.windowsAssistant} />]
  }
  return optionLinks
}
