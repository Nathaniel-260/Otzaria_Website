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
<<<<<<< HEAD
 * - פוקוס עובר לחלון בפתיחה (אלא אם ילד כבר ממוקד, למשל autoFocus), ו"נלכד" בתוכו
 *   (Tab / Shift+Tab מסתובבים בין הפקדים הגלויים שבו).
 * - Esc קורא ל-onEscape — רק בחלון העליון, אם escapeEnabled, וכש-event.defaultPrevented כוזב.
 * - גלילת הדף ברקע ננעלת. פיצוי על רוחב פס הגלילה רק כשאין scrollbar-gutter: stable ב-html
 *   (אחרת הפס נשאר במקומו והפיצוי יוצר קפיצה כפולה), ובצד הנכון: שמאל ב-RTL, ימין ב-LTR.
 * - חלונות מקוננים מנוהלים במחסנית; בסגירה הפוקוס חוזר ל-opener או ל-returnFocus.
 *
 * panelRef צריך להצביע על אלמנט עם tabIndex={-1}, כדי שאפשר יהיה למקד אותו עצמו.
 */
export type DialogReturnFocus = HTMLElement | null | (() => HTMLElement | null | undefined)
type DialogA11yOptions = { escapeEnabled?: boolean; returnFocus?: DialogReturnFocus }

export function useDialogA11y(
  panelRef: RefObject<HTMLElement | null>,
  onEscape: () => void,
  options: boolean | DialogA11yOptions = true
) {
  const escapeEnabled = typeof options === 'boolean' ? options : options.escapeEnabled ?? true
  const returnFocus = typeof options === 'boolean' ? undefined : options.returnFocus
  // הפונקציה מתחלפת בכל רינדור; ref מונע הרשמה מחדש של המאזין בכל פעם
  const onEscapeRef = useRef(onEscape)
  const escapeEnabledRef = useRef(escapeEnabled)
  const returnFocusRef = useRef(returnFocus)
  useEffect(() => {
    onEscapeRef.current = onEscape
    escapeEnabledRef.current = escapeEnabled
    returnFocusRef.current = returnFocus
=======
 * - פוקוס עובר לחלון בפתיחה, ו"נלכד" בתוכו (Tab / Shift+Tab מסתובבים בין הפקדים שבו).
 * - Esc קורא ל-onEscape — אלא אם רכיב פנימי כבר "בלע" אותו (event.preventDefault()), למשל רשימת
 *   הצעות של combobox או תפריט שנסגרים ב-Esc. preventDefault ולא stopPropagation הוא החוזה: ב-Next
 *   ה-root של React הוא document עצמו (hydrateRoot(document)), כך שמאזין React ומאזין זה יכולים
 *   לשבת על אותו צומת, ואז stopPropagation מתוך handler של React לא מונע מהמאזין הזה לרוץ.
 * - גלילת הדף ברקע ננעלת (עם פיצוי על רוחב פס הגלילה, כדי שהדף לא "יקפוץ").
 * - חלונות מקוננים: רק העליון במחסנית מגיב למקלדת (ראו openPanels).
 * - בסגירה (unmount) הפוקוס חוזר לאלמנט שהיה ממוקד לפני הפתיחה — בדרך כלל הכפתור שפתח. returnFocus
 *   מחליף את היעד הזה (אלמנט, או פונקציה שנקראת ברגע הסגירה); null/undefined — חזרה למי שפתח.
 *
 * panelRef צריך להצביע על אלמנט עם tabIndex={-1}, כדי שאפשר יהיה למקד אותו עצמו.
 */
export type DialogReturnFocus = HTMLElement | null | (() => HTMLElement | null | undefined)

export function useDialogA11y(
  panelRef: RefObject<HTMLElement | null>,
  onEscape: () => void,
  { returnFocus }: { returnFocus?: DialogReturnFocus } = {}
) {
  // הפונקציות מתחלפות בכל רינדור; ref מונע הרשמה מחדש של המאזין בכל פעם
  const onEscapeRef = useRef(onEscape)
  const returnFocusRef = useRef(returnFocus)
  useEffect(() => {
    onEscapeRef.current = onEscape
    returnFocusRef.current = returnFocus
>>>>>>> ca250cf2 (חלונות נגישים (DialogContext, ‏useDialogA11y, ‏useDisclosureMenu): לכידת פוקוס, Esc ומחסנית חלונות)
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

<<<<<<< HEAD
    openPanels.push(panel)
    // ילד שכבר ממוקד (autoFocus) לא נדרס
    if (!panel.contains(document.activeElement)) panel.focus({ preventScroll: true })
=======
    openPanels.push(panel)
    panel.focus({ preventScroll: true })
>>>>>>> ca250cf2 (חלונות נגישים (DialogContext, ‏useDialogA11y, ‏useDisclosureMenu): לכידת פוקוס, Esc ומחסנית חלונות)

    const onKeyDown = (event: KeyboardEvent) => {
      // חלון אחר נפתח מעליי — הוא מטפל במקלדת
      if (!isTopDialog(panel)) return
      if (event.key === 'Escape') {
<<<<<<< HEAD
        if (!escapeEnabledRef.current || event.defaultPrevented) return
=======
        // רכיב פנימי כבר טיפל ב-Esc (סגר את הרשימה/התפריט שלו) — החלון נשאר פתוח
        if (event.defaultPrevented) return
>>>>>>> ca250cf2 (חלונות נגישים (DialogContext, ‏useDialogA11y, ‏useDisclosureMenu): לכידת פוקוס, Esc ומחסנית חלונות)
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
      const index = openPanels.lastIndexOf(panel)
      if (index !== -1) openPanels.splice(index, 1)
      const index = openPanels.lastIndexOf(panel)
      if (index !== -1) openPanels.splice(index, 1)
      body.style.overflow = prevOverflow
      body.style.paddingRight = prevPaddingRight
<<<<<<< HEAD
      body.style.paddingLeft = prevPaddingLeft
      const target = typeof returnFocusRef.current === 'function' ? returnFocusRef.current() : returnFocusRef.current
      ;(target ?? opener)?.focus({ preventScroll: true })
=======
      const target = typeof returnFocusRef.current === 'function' ? returnFocusRef.current() : returnFocusRef.current
      ;(target ?? opener)?.focus({ preventScroll: true })
>>>>>>> ca250cf2 (חלונות נגישים (DialogContext, ‏useDialogA11y, ‏useDisclosureMenu): לכידת פוקוס, Esc ומחסנית חלונות)
    }
  }, [panelRef, opener])
}
