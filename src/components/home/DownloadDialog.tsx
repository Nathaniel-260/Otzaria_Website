'use client'

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useDialogA11y } from '@/components/ui/useDialogA11y'

// משך אנימציית היציאה. אנימציית הכניסה (180ms) ארוכה ממנה מעט — כמו במתקין.
const EXIT_MS = 150

const prefersReducedMotion = () =>
  typeof window === 'undefined' || typeof window.matchMedia !== 'function'
    ? true
    : window.matchMedia('(prefers-reduced-motion: reduce)').matches

const ORNAMENT_STYLE = { '--ornament-ratio': '45%', '--ornament-min': '96px' } as CSSProperties

/**
 * חלון ההורדה של מערכת אחת — בשפת מסכי המסייע/המתקין: כותרת ממורכזת עם קישוט זהב,
 * גוף ברקע הדף ועליו כרטיסי בחירה. בנייד (<640px) הוא נפתח כגיליון תחתון (bottom sheet)
 * ברוחב מלא; מ-sm ומעלה — חלון ממורכז ברוחב תוכן (max-w-lg).
 * הכותרת קבועה, והגוף נגלל בתוכה כשהתוכן ארוך. בלי שורת גרסה: הגרסה האחרונה מוצגת
 * במסך הפתיחה (שורת המספרים, HeroStats), וזה מספיק.
 *
 * ההורה מרנדר את הרכיב רק כשהחלון פתוח, ומסיר אותו ב-onClose. היציאה המונפשת
 * מתבצעת כאן: requestClose מריץ את אנימציית היציאה ורק אחריה קורא ל-onClose.
 */
export default function DownloadDialog({ title, onClose, children }: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const [closing, setClosing] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const requestClose = useCallback(() => {
    if (timerRef.current) return
    if (prefersReducedMotion()) {
      onClose()
      return
    }
    setClosing(true)
    timerRef.current = setTimeout(onClose, EXIT_MS)
  }, [onClose])

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  useDialogA11y(panelRef, requestClose)

  // createPortal: החלון יוצא מכל הקשר הערמה (stacking context) של הדף, מעל הכותרת הדביקה
  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6">
      <div
        aria-hidden="true"
        onClick={requestClose}
        className={`absolute inset-0 bg-on-surface/45 motion-reduce:animate-none ${
          closing
            ? 'animate-[enter-fade_150ms_cubic-bezier(0.4,0,1,1)_reverse_forwards]'
            : 'animate-[enter-fade_180ms_cubic-bezier(0,0,0.2,1)_backwards]'
        }`}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-xl bg-background shadow-[0_-8px_32px_rgb(32_27_19/0.18)] outline-none motion-reduce:animate-none sm:max-h-[min(85dvh,46rem)] sm:max-w-lg sm:rounded-lg sm:shadow-[0_16px_48px_rgb(32_27_19/0.24)] ${
          closing
            ? 'animate-[enter-up_150ms_cubic-bezier(0.4,0,1,1)_reverse_forwards]'
            : 'animate-[enter-up_180ms_cubic-bezier(0,0,0.2,1)_backwards]'
        }`}
      >
        <DialogHeader titleId={titleId} title={title} onClose={requestClose} />

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-6">
          <div className="grid gap-3">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  )
}

function DialogHeader({ titleId, title, onClose }: {
  titleId: string
  title: string
  onClose: () => void
}) {
  return (
    <div className="relative shrink-0 px-14 pb-4 pt-3 text-center sm:pt-6">
      {/* ידית הגיליון — רמז חזותי בלבד בנייד */}
      <span aria-hidden="true" className="mx-auto mb-3 block h-1 w-10 rounded-full bg-outline-variant sm:hidden" />
      <h2 id={titleId} className="text-xl font-bold text-on-surface sm:text-2xl">{title}</h2>
      <span aria-hidden="true" className="title-ornament mt-3" style={ORNAMENT_STYLE} />
      <button
        type="button"
        onClick={onClose}
        aria-label="סגירה"
        className="absolute end-2 top-2 flex h-12 w-12 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-card-selected hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary sm:end-3 sm:top-3"
      >
        <span aria-hidden="true" className="material-symbols-outlined text-2xl">close</span>
      </button>
    </div>
  )
}
