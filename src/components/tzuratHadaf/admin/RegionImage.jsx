'use client'

// תמונת עמוד (סריקה או שלנו) עם מסגרות מעליה — אזורים בשברים 0–1 מהתמונה ({x,y,w,h}).
// משמש בסקירת הגשה: אזורי הדיווחים, והשורות שהשתנו (לפי ours/scan של השורה במודל).

const TONES = {
  report: 'border-danger-600 bg-danger-500/15',
  line: 'border-info-600 bg-info-500/10',
}

export default function RegionImage({ src, alt, boxes = [], className = '' }) {
  if (!src) return <p className="py-10 text-center text-xs text-on-surface/60">אין תמונה</p>
  return (
    <div className={`relative ${className}`}>
      <img src={src} alt={alt} loading="lazy" className="block h-auto w-full select-none" draggable={false} />
      {boxes.map((b, i) => (
        <span
          key={b.key || i}
          title={b.label}
          data-testid="region-box"
          className={`pointer-events-auto absolute border-2 ${TONES[b.tone] || TONES.report}`}
          style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%` }}
        />
      ))}
    </div>
  )
}

/** [x,y,w,h] (מודל העמוד) → {x,y,w,h}, או null. */
export const arrBox = (a) => (Array.isArray(a) && a.length === 4 && a.every((v) => Number.isFinite(Number(v))) ? { x: +a[0], y: +a[1], w: +a[2], h: +a[3] } : null)
