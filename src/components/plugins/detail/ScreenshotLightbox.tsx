'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import AppIcon from '@/components/ui/AppIcon'
import { cx } from '@/components/ui/cx'
import { FOCUS_RING } from '@/components/ui/focusRing'
import { useDialogA11y } from '@/components/ui/useDialogA11y'
import { stepIndex } from './carouselModel'

/**
 * התצוגה המוגדלת של צילום מסך — דיאלוג מודאלי על רקע scrim (useDialogA11y: הפוקוס נכנס ונלכד, Esc
 * סוגר, גלילת הדף ננעלת, והפוקוס חוזר למי שפתח). נשלט מבחוץ (index/onIndexChange), כך שהקרוסלה
 * ממשיכה מהתמונה שבה נסגר. חצים: ימינה = הקודמת, שמאלה = הבאה (RTL), עם חזרה מעגלית.
 */
const CONTROL = cx(
  'flex size-12 items-center justify-center rounded-full bg-surface/15 text-on-scrim transition-colors hover:bg-surface/30',
  FOCUS_RING
)

export default function ScreenshotLightbox({ screenshots, index, onIndexChange, onClose }: {
  screenshots: string[]
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  useDialogA11y(panelRef, onClose)
  const count = screenshots.length
  const multiple = count > 1

  // חצים — מאזין על המסמך (Esc מטופל ב-useDialogA11y)
  const indexRef = useRef(index)
  useEffect(() => {
    indexRef.current = index
  })
  useEffect(() => {
    if (!multiple) return undefined
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') onIndexChange(stepIndex(indexRef.current, -1, count))
      else if (event.key === 'ArrowLeft') onIndexChange(stepIndex(indexRef.current, 1, count))
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [multiple, count, onIndexChange])

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
        onClick={(e) => e.stopPropagation()}
      />
      {multiple && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onIndexChange(stepIndex(index, -1, count)) }}
            className={cx(CONTROL, 'absolute start-3 top-1/2 -translate-y-1/2 sm:start-4')}
            aria-label="הקודם"
          >
            <AppIcon name="chevron_right" className="text-2xl" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onIndexChange(stepIndex(index, 1, count)) }}
            className={cx(CONTROL, 'absolute end-3 top-1/2 -translate-y-1/2 sm:end-4')}
            aria-label="הבא"
          >
            <AppIcon name="chevron_left" className="text-2xl" />
          </button>
        </>
      )}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClose() }}
        className={cx(CONTROL, 'absolute end-3 top-3 sm:end-4 sm:top-4')}
        aria-label="סגור"
      >
        <AppIcon name="close" className="text-2xl" />
      </button>
      <div
        aria-live="polite"
        className="absolute inset-x-0 bottom-4 mx-auto w-fit rounded-full bg-surface/15 px-3 py-1 text-label-md text-on-scrim tabular-nums"
      >
        <span dir="ltr">{index + 1} / {count}</span>
      </div>
    </div>,
    document.body
  )
}
