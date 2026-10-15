'use client'

import { FOCUS_RING } from '@/components/ui/focusRing'

/** המזהה של התוכן הראשי — על ה-<main> של כל עמוד (פעם אחת בעמוד) */
export const MAIN_CONTENT_ID = 'main-content'

/** אלמנט שמוצג בפועל (לא display:none, גם לא דרך אב) — getClientRects ריק כשהוא מוסתר */
const isRendered = (el) => el.getClientRects().length > 0

/**
 * יעד הדילוג: האלמנט עם MAIN_CONTENT_ID — כשהוא מוצג (ב-/plugins/all הוא מוסתר עד שהסינון
 * מה-URL נטען). בעמוד שאין בו (עורכים במסך מלא, עמודי התחברות) או כשהוא מוסתר —
 * ה-<main> הפנימי ביותר; ואם הכותרת העליונה יושבת בתוכו (ה-<main> של layout הספרייה עוטף
 * עמודים שמציירים Header בעצמם) — האלמנט שאחרי הכותרת, כדי שהדילוג באמת יעבור אותה.
 */
export function findSkipTarget(doc = document) {
  const byId = doc.getElementById(MAIN_CONTENT_ID)
  if (byId && isRendered(byId)) return byId
  const mains = [...doc.querySelectorAll('main')].filter(isRendered)
  const main = mains[mains.length - 1]
  if (!main) return null
  const header = main.querySelector('header')
  return header?.nextElementSibling ?? main
}

/**
 * "דלג לתוכן" — הקישור הראשון בכל עמוד (app/layout.tsx). מוסתר עד שהוא מקבל פוקוס (Tab ראשון),
 * ואז מופיע בפינה מעל הכותרת. בלחיצה הפוקוס עובר ליעד (findSkipTarget) — Tab הבא ממשיך משם.
 * בלי JS זה קישור עוגן רגיל ל-#main-content.
 */
export default function SkipLink() {
  const onClick = (event) => {
    const target = findSkipTarget()
    if (!target) return
    event.preventDefault()
    // יעד שאינו פוקוסבילי מקבל tabindex=-1 זמני (פוקוס מקוד בלבד), ובלי טבעת — ראו
    // [data-skip-target] ב-styles/base.css. ביציאת הפוקוס הוא מוסר, כדי שלחיצת עכבר בתוך
    // התוכן לא תמקד אחר כך את כל האזור
    if (!target.hasAttribute('tabindex')) {
      target.setAttribute('tabindex', '-1')
      target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true })
    }
    target.setAttribute('data-skip-target', '')
    target.focus()
  }

  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      onClick={onClick}
      className={`sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-(--z-skip) focus:rounded-lg focus:bg-primary focus:px-4 focus:py-3 focus:text-body-md focus:font-medium focus:text-on-primary focus:shadow-lg ${FOCUS_RING}`}
    >
      דלג לתוכן
    </a>
  )
}
