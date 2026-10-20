'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'summary',
  '[contenteditable]:not([contenteditable="false"])',
  'audio[controls]',
  'video[controls]',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

/** אלמנט מוסתר (hidden / inert / display:none / visibility:hidden) אינו בר-פוקוס, ולכן לא נספר בלכידת Tab */
export function isFocusableVisible(el: HTMLElement): boolean {
  if (el.closest('[hidden],[inert]')) return false
  const style = window.getComputedStyle(el)
  return style.display !== 'none' && style.visibility !== 'hidden' && style.visibility !== 'collapse'
}

/**
 * התנהגות נגישה בסיסית של חלון מודאלי, בלי עיצוב:
 * - פוקוס עובר לחלון בפתיחה (אלא אם ילד כבר ממוקד, למשל autoFocus), ו"נלכד" בתוכו
 *   (Tab / Shift+Tab מסתובבים בין הפקדים הגלויים שבו).
 * - Esc קורא ל-onEscape — רק כש-escapeEnabled, וכש-event.defaultPrevented כוזב (רכיב אחר,
 *   למשל רמז, כבר טיפל במקש). כש-escapeEnabled כבוי המקש לא נבלע.
 * - גלילת הדף ברקע ננעלת. פיצוי על רוחב פס הגלילה רק כשאין scrollbar-gutter: stable ב-html
 *   (אחרת הפס נשאר במקומו והפיצוי יוצר קפיצה כפולה), ובצד הנכון: שמאל ב-RTL, ימין ב-LTR.
 * - בסגירה (unmount) הפוקוס חוזר לאלמנט שהיה ממוקד לפני הפתיחה — בדרך כלל הכפתור שפתח.
 *
 * panelRef צריך להצביע על אלמנט עם tabIndex={-1}, כדי שאפשר יהיה למקד אותו עצמו.
 */
export function useDialogA11y(panelRef: RefObject<HTMLElement | null>, onEscape: () => void, escapeEnabled = true) {
  // הפונקציה מתחלפת בכל רינדור; ref מונע הרשמה מחדש של המאזין בכל פעם
  const onEscapeRef = useRef(onEscape)
  const escapeEnabledRef = useRef(escapeEnabled)
  useEffect(() => {
    onEscapeRef.current = onEscape
    escapeEnabledRef.current = escapeEnabled
  })

  // ה-opener נלכד בזמן הרינדור הראשון — לפני ה-commit, שבו autoFocus של ילד עלול לגנוב את הפוקוס
  const [opener] = useState<HTMLElement | null>(() =>
    typeof document !== 'undefined' && document.activeElement instanceof HTMLElement ? document.activeElement : null
  )

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const { body } = document
    const prevOverflow = body.style.overflow
    const prevPaddingRight = body.style.paddingRight
    const prevPaddingLeft = body.style.paddingLeft
    const root = document.documentElement
    const scrollbarWidth = window.innerWidth - root.clientWidth
    const hasGutter = window.getComputedStyle(root).getPropertyValue('scrollbar-gutter').includes('stable')
    const rtl = window.getComputedStyle(body).direction === 'rtl'
    body.style.overflow = 'hidden'
    if (scrollbarWidth > 0 && !hasGutter) {
      if (rtl) body.style.paddingLeft = `${scrollbarWidth}px`
      else body.style.paddingRight = `${scrollbarWidth}px`
    }

    // ילד שכבר ממוקד (autoFocus) לא נדרס
    if (!panel.contains(document.activeElement)) panel.focus({ preventScroll: true })

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (!escapeEnabledRef.current || event.defaultPrevented) return
        event.preventDefault()
        onEscapeRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(isFocusableVisible)
      if (items.length === 0) {
        event.preventDefault()
        panel.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (!panel.contains(active)) {
        event.preventDefault()
        first.focus()
      } else if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      body.style.overflow = prevOverflow
      body.style.paddingRight = prevPaddingRight
      body.style.paddingLeft = prevPaddingLeft
      opener?.focus({ preventScroll: true })
    }
  }, [panelRef, opener])
}
