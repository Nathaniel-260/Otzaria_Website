'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRef } from 'react'
import useLogoHandoff from '@/hooks/useLogoHandoff'

// תמונת הספר המוזהב בגודל מלא — אותה תמונה שהגיבור מציג בסוף אנימציית הפתיחה
// (GoldenBook.tsx טוען אותה מראש), כך שההחלפה ביניהן בתחילת הגלילה בלתי נראית.
const FLYER_SRC = '/home/golden-book.webp'

/**
 * הלוגו ושם האתר שבכותרת העליונה — קישור לדף הבית.
 *
 * handoff (דף הבית בלבד): בפתיחת הדף אין לוגו בכותרת — הוא "הספר הגדול" שבמסך הפתיחה.
 * בגלילה הספר מתכווץ ונע אל המשבצת כאן, ושם האתר מופיע לצדו (ראו useLogoHandoff ו-
 * "מעבר הלוגו" ב-animations.css). הקישור עצמו נשאר תמיד ב-DOM, עם שם נגיש וזמין
 * למקלדת: בפוקוס הוא מוצג גם כשהלוגו עוד "בדרך" (ראו .logo-handoff-link:focus-visible).
 */
export default function HeaderLogo({ handoff = false }) {
  const slotRef = useRef(null)
  const flyerRef = useRef(null)
  const wordmarkRef = useRef(null)
  useLogoHandoff({ enabled: handoff, slotRef, flyerRef, wordmarkRef })

  return (
    // קישור הלוגו מופיע בכל דף ואינו מצדיק prefetch
    <Link
      href="/"
      prefetch={false}
      aria-label={handoff ? 'אוצריא — דף הבית' : undefined}
      className={`flex min-h-12 shrink-0 items-center gap-2.5 rounded-lg transition-opacity hover:opacity-80 ${handoff ? 'logo-handoff-link' : ''}`}
    >
      <span ref={slotRef} className="relative size-[32px] shrink-0">
        {handoff ? (
          // גודל ה-layout הוא גודל הספר הגדול (--logo-handoff-size), ממורכז במשבצת ומוקטן
          // ב-transform — כך התמונה רק מוקטנת ונשארת חדה בכל שלב. alt ריק: השם הנגיש בקישור.
          <img
            ref={flyerRef}
            src={FLYER_SRC}
            alt=""
            width={560}
            height={560}
            decoding="async"
            className="logo-handoff-flyer pointer-events-none absolute left-1/2 top-1/2 max-w-none"
          />
        ) : (
          <Image src="/logo.webp" alt="לוגו אוצריא" width={32} height={32} />
        )}
      </span>
      <span ref={wordmarkRef} className={`font-display text-xl font-bold text-on-surface ${handoff ? 'logo-handoff-wordmark' : ''}`}>
        אוצריא
      </span>
    </Link>
  )
}
