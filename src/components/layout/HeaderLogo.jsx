'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRef } from 'react'
import useWordmarkHandoff from '@/hooks/useWordmarkHandoff'

const WORDMARK = 'אוצריא'

/**
 * הלוגו ושם האתר שבכותרת העליונה — קישור לדף הבית.
 *
 * הלוגו מוצג תמיד, קבוע, מטעינת הדף. שם האתר — "אוצריא" ב-OT Vilna Bold: בגודל הכותרת
 * העליונה ה-Regular דק מדי לקריאה (ה-Regular שמור למילה הגדולה שבגיבור).
 *
 * handoff (דף הבית בלבד): בראש הדף שם האתר אינו מוצג בכותרת — הוא המילה הגדולה שבגיבור.
 * בגלילה המילה עולה ומתכווצת אל מקומו כאן (useWordmarkHandoff, "מעבר שם האתר" ב-
 * animations.css). שני עותקים:
 * - .wordmark-handoff-target — שם האתר הסטטי: שומר את המקום ב-layout, הוא מקום הנחיתה
 *   שנמדד, והוא המוצג במנוחה ובכל מצב בלי מעבר (reduced-motion, אין גיבור). בגודל גופן
 *   אמיתי ובלי transform — כך הוא תמיד חד;
 * - .wordmark-handoff-flyer — העותק שעובר (Regular, כמו בגיבור): בגודל הגופן של הכותרת
 *   הראשית, ממורכז על הסטטי ומוקטן ב-transform. מחוץ לזרימה, כך שאין קפיצת layout. בקטע
 *   האחרון של המעבר הוא מתחלף בהצלבה בסטטי (CROSSFADE_START ב-src/lib/wordmarkHandoff.js).
 * השם הנגיש של הקישור קבוע (aria-label), בלי קשר למה שמוצג כרגע.
 */
export default function HeaderLogo({ handoff = false }) {
  const targetRef = useRef(null)
  const flyerRef = useRef(null)
  useWordmarkHandoff({ enabled: handoff, targetRef, flyerRef })

  return (
    // קישור הלוגו מופיע בכל דף ואינו מצדיק prefetch
    <Link
      href="/"
      prefetch={false}
      aria-label={handoff ? `${WORDMARK} — דף הבית` : undefined}
      className="flex min-h-12 shrink-0 items-center gap-2 rounded-lg transition-opacity hover:opacity-80"
    >
      <Image src="/logo.webp" alt={handoff ? '' : 'לוגו אוצריא'} width={32} height={32} className="size-[32px] shrink-0" />
      <span className="relative flex items-center">
        <span ref={targetRef} className={`font-display text-2xl font-bold leading-none text-on-surface ${handoff ? 'wordmark-handoff-target' : ''}`}>
          {WORDMARK}
        </span>
        {handoff && (
          // ממורכז על הסטטי גם כשהוא רחב ממנו (justify-center גולש לשני הצדדים באופן שווה).
          // העטיפה נושאת את הסחיפה האופקית (מואצת), והמעופף — את האנכית ואת קנה המידה
          // (לינאריים); ב-CSS אלה שתי אנימציות עם easing שונה (animations.css)
          <span aria-hidden="true" className="wordmark-handoff-drift pointer-events-none absolute inset-0 flex items-center justify-center">
            <span ref={flyerRef} className="wordmark-handoff-flyer font-display font-normal leading-none whitespace-nowrap text-on-surface">
              {WORDMARK}
            </span>
          </span>
        )}
      </span>
    </Link>
  )
}
