'use client'

import { useEffect, useRef, useState } from 'react'
import { formatExactNumber } from '@/lib/homeStats/homeStats'

// כרטיס נתון בודד באזור "אוצריא במספרים".
//
// ה-HTML מהשרת מכיל כבר את המספר הסופי (SEO, ובלי הבהוב של 0 לפני ה-hydration).
// רק אחרי ה-hydration, כשהעיגול נכנס לתצוגה בפעם הראשונה, המספר "נספר" מ-0
// עד הערך — ובסוף מוצג תמיד הערך המדויק עצמו. עם prefers-reduced-motion, או
// בדפדפן בלי IntersectionObserver, אין אנימציה כלל והמספר הסופי נשאר כמו שהוא.

// ספירה איטית ורגועה: 3.5 שניות, עם האטה עדינה (ריבועית) לקראת הסוף. האטה
// קובית "שרפה" את רוב הטווח כבר בחלק הראשון, והמספרים נראו קופצים מהר מדי.
const COUNT_UP_DURATION_MS = 3500

function easeOutQuad(t: number) {
  return 1 - (1 - t) * (1 - t)
}

function prefersReducedMotion() {
  return typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

type StatCircleProps = {
  icon: string
  label: string
  value: number
  index?: number
}

export default function StatCircle({ icon, label, value, index = 0 }: StatCircleProps) {
  const [displayValue, setDisplayValue] = useState(value)
  const circleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = circleRef.current
    if (!element || prefersReducedMotion() || typeof IntersectionObserver === 'undefined') return

    let frameId = 0
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      observer.disconnect()

      let start: number | null = null
      const step = (now: number) => {
        if (start === null) start = now
        const progress = Math.min((now - start) / COUNT_UP_DURATION_MS, 1)
        // בסוף האנימציה — הערך המדויק עצמו, לא תוצאת עיגול של החישוב
        setDisplayValue(progress < 1 ? Math.floor(value * easeOutQuad(progress)) : value)
        if (progress < 1) frameId = requestAnimationFrame(step)
      }
      frameId = requestAnimationFrame(step)
    }, { threshold: 0.4 })

    observer.observe(element)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frameId)
      setDisplayValue(value)
    }
  }, [value])

  const finalText = formatExactNumber(value)

  // כרטיס נתון בשפת האפליקציה (AppCard + אריח אייקון). השם StatCircle נשמר מהעיצוב
  // הקודם (עיגולים) כדי לא לשבור ייבוא וטסטים.
  return (
    <div
      ref={circleRef}
      style={{ animationDelay: `${index * 0.08}s` }}
      className="animate-enter-up flex w-full flex-col items-start gap-3 rounded-lg bg-card p-4 sm:p-5"
    >
      <span
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-tile text-on-tile"
        aria-hidden="true"
      >
        <span className="material-symbols-outlined text-[22px]">{icon}</span>
      </span>
      <div className="w-full min-w-0">
        {/* המספר המונפש מוסתר מקוראי מסך (שהיו מקריאים כל שלב בספירה);
            להם מוגש הטקסט הסופי בנפרד. dir=ltr עם יישור לימין: המספר צמוד לצד הכרטיס שבו מתחיל הטקסט.
            הגודל ביחידות cqi של ה-li (@container ב-StatsGrid): מספר בן 9 תווים (7,080,797) נשאר בשורה אחת
            גם בכרטיס צר, בלי לחרוג ובלי לשבור */}
        <span
          className="block whitespace-nowrap text-[clamp(1.125rem,13cqi,1.75rem)] font-bold leading-tight text-on-surface tabular-nums"
          dir="ltr"
          style={{ textAlign: 'right' }}
          aria-hidden="true"
          data-testid="stat-value"
        >
          {formatExactNumber(displayValue)}
        </span>
        <span className="sr-only">{finalText}</span>
        <span className="mt-1 block text-sm leading-snug text-on-surface-variant">
          {label}
        </span>
      </div>
    </div>
  )
}
