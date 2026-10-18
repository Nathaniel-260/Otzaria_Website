'use client'

import { useEffect, useRef, type RefObject } from 'react'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

/**
 * מחסנית החלונות המודאליים הפתוחים (משותפת לכל המופעים בדף). רק החלון העליון מגיב ל-Tab ול-Esc —
 * כך חלון אישור (DialogContext) שנפתח מעל Dialog לוכד את הפוקוס בעצמו, ו-Tab לא "בורח" לחלון שמתחתיו,
 * ו-Esc סוגר רק את העליון.
 */
const openPanels: HTMLElement[] = []

/** האם panel הוא החלון המודאלי העליון כרגע (לבדיקות ולרכיבים שמאזינים למקלדת בעצמם) */
export function isTopDialog(panel: HTMLElement | null): boolean {
  return panel !== null && openPanels[openPanels.length - 1] === panel
}

/**
 * התנהגות נגישה בסיסית של חלון מודאלי, בלי עיצוב:
 * - פוקוס עובר לחלון בפתיחה, ו"נלכד" בתוכו (Tab / Shift+Tab מסתובבים בין הפקדים שבו).
 * - Esc קורא ל-onEscape.
 * - גלילת הדף ברקע ננעלת (עם פיצוי על רוחב פס הגלילה, כדי שהדף לא "יקפוץ").
 * - חלונות מקוננים: רק העליון במחסנית מגיב למקלדת (ראו openPanels).
 * - בסגירה (unmount) הפוקוס חוזר לאלמנט שהיה ממוקד לפני הפתיחה — בדרך כלל הכפתור שפתח.
 *
 * panelRef צריך להצביע על אלמנט עם tabIndex={-1}, כדי שאפשר יהיה למקד אותו עצמו.
 */
export function useDialogA11y(panelRef: RefObject<HTMLElement | null>, onEscape: () => void) {
  // הפונקציה מתחלפת בכל רינדור; ref מונע הרשמה מחדש של המאזין בכל פעם
  const onEscapeRef = useRef(onEscape)
  useEffect(() => {
    onEscapeRef.current = onEscape
  })

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const { body } = document
    const prevOverflow = body.style.overflow
    const prevPaddingRight = body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`

    openPanels.push(panel)
    panel.focus({ preventScroll: true })

    const onKeyDown = (event: KeyboardEvent) => {
      // חלון אחר נפתח מעליי — הוא מטפל במקלדת
      if (!isTopDialog(panel)) return
      if (event.key === 'Escape') {
        event.preventDefault()
        onEscapeRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
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
      const index = openPanels.lastIndexOf(panel)
      if (index !== -1) openPanels.splice(index, 1)
      body.style.overflow = prevOverflow
      body.style.paddingRight = prevPaddingRight
      opener?.focus({ preventScroll: true })
    }
  }, [panelRef])
}
