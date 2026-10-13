'use client'

import { useEffect, useState } from 'react'

// הספר המוזהב של אוצריא, נפתח, בתוך הילה חמה — גיבור דף הבית (מהמתקין: GLOW #E9B96A
// ו-24 פריימי הפתיחה של download-assistant).
//
// ביצועים (LCP): ה-HTML מהשרת מכיל כבר את הפריים הסופי (הספר הפתוח) כ-<img> רגיל
// עם fetchPriority גבוה ובלי אנימציית כניסה — זה אלמנט ה-LCP, והוא מצויר מיד.
// האנימציה היא שיפור בלבד: אחרי ה-hydration טוענים ברקע את רצועת 24 הפריימים
// (public/home/golden-book-sprite.webp, ~300KB), ורק כשהיא מפוענחת במלואה מחליפים את
// התמונה בה ומנגנים פעם אחת (1 שנייה, 24fps). הרצועה נעצרת על הפריים האחרון (forwards),
// הזהה לתמונה הסטטית. עם prefers-reduced-motion — לא טוענים את הרצועה כלל.

const SPRITE_SRC = '/home/golden-book-sprite.webp'

function prefersReducedMotion() {
  return typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function GoldenBook({ className = '' }: { className?: string }) {
  const [phase, setPhase] = useState<'static' | 'opening'>('static')

  useEffect(() => {
    if (prefersReducedMotion()) return
    let cancelled = false
    const sprite = new Image()
    sprite.src = SPRITE_SRC
    // decode() מבטיח שאין הבהוב של אלמנט ריק בזמן ההחלפה
    sprite.decode()
      .then(() => { if (!cancelled) setPhase('opening') })
      .catch(() => { /* בלי אנימציה — התמונה הסטטית נשארת */ })
    return () => { cancelled = true }
  }, [])

  return (
    <div className={`relative mx-auto aspect-square ${className}`}>
      {/* ההילה החמה — גרדיאנט CSS, לא תמונה. רחבה מהספר, ולכן הגיבור חותך אותה
          (overflow-hidden) כדי שלא תיצור גלילה אופקית בנייד */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 size-[190%] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            'radial-gradient(closest-side, rgb(233 185 106 / 0.68), rgb(233 185 106 / 0.26) 45%, rgb(233 185 106 / 0.06) 75%, transparent)'
        }}
      />
      <img
        src="/home/golden-book.webp"
        alt="לוגו אוצריא"
        width={560}
        height={560}
        fetchPriority="high"
        decoding="async"
        className={`relative size-full transition-opacity duration-150 ${phase === 'opening' ? 'opacity-0' : ''}`}
      />
      {phase === 'opening' && (
        <span aria-hidden="true" className="golden-book-sprite absolute inset-0" />
      )}
    </div>
  )
}
