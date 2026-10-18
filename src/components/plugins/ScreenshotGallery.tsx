'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import AppIcon from '@/components/ui/AppIcon'
import { cx } from '@/components/ui/cx'
import { FOCUS_RING } from '@/components/ui/focusRing'
import { useDialogA11y } from '@/components/ui/useDialogA11y'

interface ScreenshotGalleryProps {
  screenshots: string[]
  className?: string
}

/**
 * גלריית צילומי מסך + lightbox — חולץ מדף פרטי התוסף. לא מרנדר דבר כשאין צילומי מסך.
 * הכותרת ("צילומי מסך") — אצל העמוד (DetailSection), כמו בשאר האזורים.
 *
 * תמונות ממוזערות: בנייד — מסילה אופקית (snap) שנגללת בתוכה, בלי לגלול את הדף לרוחב; מ-md —
 * רשת. כל תמונה כפתור (פוקוס = טבעת FOCUS_RING), aspect-video ו-object-cover.
 *
 * lightbox: דיאלוג מודאלי (useDialogA11y — פוקוס נכנס ונלכד, Esc סוגר, גלילת הדף ננעלת, והפוקוס
 * חוזר לתמונה שנפתחה), רקע scrim. חצים: ימינה = הקודם, שמאלה = הבא (RTL), עם חזרה מעגלית.
 */
export default function ScreenshotGallery({ screenshots, className }: ScreenshotGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const screenshotCount = screenshots.length

  const handleLightboxKey = useCallback((e: KeyboardEvent) => {
    if (lightboxIndex === null) return
    if (e.key === 'Escape') setLightboxIndex(null)
    if (e.key === 'ArrowRight') setLightboxIndex(cur => cur !== null && cur > 0 ? cur - 1 : screenshotCount - 1)
    if (e.key === 'ArrowLeft') setLightboxIndex(cur => cur !== null && cur < screenshotCount - 1 ? cur + 1 : 0)
  }, [lightboxIndex, screenshotCount])

  useEffect(() => {
    window.addEventListener('keydown', handleLightboxKey)
    return () => window.removeEventListener('keydown', handleLightboxKey)
  }, [handleLightboxKey])

  if (screenshotCount === 0) return null

  return (
    <>
      <ul
        className={cx(
          // נייד: מסילה ברוחב המסך (מבטלת את ה-gutter של העמוד ומחזירה אותו כריפוד), כך שהתמונה הבאה מציצה
          '-mx-(--page-gutter) flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-(--page-gutter) pb-2 scroll-px-(--page-gutter)',
          'md:mx-0 md:grid md:snap-none md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-4',
          className
        )}
      >
        {screenshots.map((src, i) => (
          <li key={i} className="w-[min(78%,20rem)] shrink-0 snap-start md:w-auto">
            <button
              type="button"
              onClick={() => setLightboxIndex(i)}
              className={cx(
                'group/shot block aspect-video w-full overflow-hidden rounded-(--radius-shape) bg-surface-container ring-1 ring-outline-variant transition-shadow hover:ring-2 hover:ring-primary',
                FOCUS_RING
              )}
            >
              <img
                src={src}
                alt={`צילום מסך ${i + 1}`}
                loading="lazy"
                decoding="async"
                className="size-full object-cover transition-transform duration-300 group-hover/shot:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover/shot:scale-100"
              />
            </button>
          </li>
        ))}
      </ul>

      {lightboxIndex !== null && (
        <Lightbox
          screenshots={screenshots}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex(cur => cur !== null && cur > 0 ? cur - 1 : screenshotCount - 1)}
          onNext={() => setLightboxIndex(cur => cur !== null && cur < screenshotCount - 1 ? cur + 1 : 0)}
        />
      )}
    </>
  )
}

const LIGHTBOX_BUTTON = cx(
  'flex size-12 items-center justify-center rounded-full bg-surface/15 text-white transition-colors hover:bg-surface/30',
  FOCUS_RING
)

function Lightbox({ screenshots, index, onClose, onPrev, onNext }: {
  screenshots: string[]
  index: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  useDialogA11y(panelRef, onClose)
  const multiple = screenshots.length > 1

  if (typeof document === 'undefined') return null
  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="צילומי מסך"
      tabIndex={-1}
      className="fixed inset-0 z-(--dialog-z) flex items-center justify-center bg-scrim/90 p-4 outline-none sm:p-16"
      onClick={onClose}
    >
      <img
        src={screenshots[index]}
        alt={`צילום מסך ${index + 1}`}
        className="max-h-[80dvh] max-w-full rounded-(--radius-shape) object-contain shadow-(--dialog-shadow)"
        onClick={e => e.stopPropagation()}
      />
      {multiple && (
        <>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onPrev() }}
            className={cx(LIGHTBOX_BUTTON, 'absolute start-3 top-1/2 -translate-y-1/2 sm:start-4')}
            aria-label="הקודם"
          >
            <AppIcon name="chevron_right" className="text-2xl" />
          </button>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onNext() }}
            className={cx(LIGHTBOX_BUTTON, 'absolute end-3 top-1/2 -translate-y-1/2 sm:end-4')}
            aria-label="הבא"
          >
            <AppIcon name="chevron_left" className="text-2xl" />
          </button>
        </>
      )}
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onClose() }}
        className={cx(LIGHTBOX_BUTTON, 'absolute end-3 top-3 sm:end-4 sm:top-4')}
        aria-label="סגור"
      >
        <AppIcon name="close" className="text-2xl" />
      </button>
      <div
        aria-live="polite"
        className="absolute inset-x-0 bottom-4 mx-auto w-fit rounded-full bg-surface/15 px-3 py-1 text-label-md text-white tabular-nums"
      >
        <span dir="ltr">{index + 1} / {screenshots.length}</span>
      </div>
    </div>,
    document.body
  )
}
