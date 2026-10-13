'use client'

import { useEffect, useState } from 'react'
import { preload } from 'react-dom'

// הספר המוזהב של אוצריא נפתח בתוך הילה חמה — גיבור דף הבית (מהמתקין: GLOW #E9B96A
// ו-24 פריימי הפתיחה של download-assistant).
//
// רצף התצוגה:
// 1. ה-HTML מהשרת מכיל את הפריים הראשון — הספר הסגור (golden-book-closed.webp, ~20KB) —
//    כך שהפתיחה מתחילה ממנו ואין "פתוח → נסגר → נפתח".
// 2. רצועת 24 הפריימים (~300KB) נטענת כבר עם ה-HTML (preload ב-<head>), במקביל לשאר
//    הדף, ולא רק אחרי ה-hydration.
// 3. אחרי ה-hydration, כשהרצועה מפוענחת: אם עדיין מוקדם (OPEN_DEADLINE_MS מתחילת הניווט)
//    — מנגנים פעם אחת (1 שנייה, 24fps) ונעצרים על הפריים האחרון. אם מאוחר מזה (רשת או
//    מכשיר איטיים), או שהטעינה נכשלה — מציגים מיד את הספר הפתוח בלי אנימציה, כדי שאף אחד
//    לא יעמוד מול ספר סגור.
// עם prefers-reduced-motion — הספר הפתוח מיד, והרצועה לא מנוגנת.

const SPRITE_SRC = '/home/golden-book-sprite.webp'
const CLOSED_SRC = '/home/golden-book-closed.webp'
const OPEN_SRC = '/home/golden-book.webp'
const OPEN_DEADLINE_MS = 1500

function prefersReducedMotion() {
  return typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

type Phase = 'closed' | 'opening' | 'open'

export default function GoldenBook({ className = '' }: { className?: string }) {
  preload(SPRITE_SRC, { as: 'image' })
  // לגיבוי (רשת איטית / reduced-motion): ~36KB, כדי שההחלפה לספר הפתוח לא תהבהב
  preload(OPEN_SRC, { as: 'image', fetchPriority: 'low' })
  const [phase, setPhase] = useState<Phase>('closed')

  useEffect(() => {
    let cancelled = false
    const showOpen = () => { if (!cancelled) setPhase('open') }
    // reduced-motion — הספר הפתוח מיד (בטיימר ולא ב-setState ישיר בגוף ה-effect)
    if (prefersReducedMotion()) {
      const now = window.setTimeout(showOpen, 0)
      return () => { cancelled = true; window.clearTimeout(now) }
    }
    // אם הרצועה לא מוכנה עד המועד — לא מחכים לה
    const deadline = window.setTimeout(showOpen, Math.max(0, OPEN_DEADLINE_MS - performance.now()))
    const sprite = new Image()
    sprite.src = SPRITE_SRC
    // decode() מבטיח שאין הבהוב של אלמנט ריק בזמן ההחלפה
    sprite.decode()
      .then(() => {
        if (cancelled || performance.now() > OPEN_DEADLINE_MS) return
        window.clearTimeout(deadline)
        setPhase('opening')
      })
      .catch(showOpen)
    return () => {
      cancelled = true
      window.clearTimeout(deadline)
    }
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
        src={phase === 'open' ? OPEN_SRC : CLOSED_SRC}
        alt="לוגו אוצריא"
        width={560}
        height={560}
        fetchPriority="high"
        className={`relative size-full ${phase === 'opening' ? 'invisible' : ''}`}
      />
      {phase === 'opening' && (
        <span aria-hidden="true" className="golden-book-sprite absolute inset-0" />
      )}
    </div>
  )
}
