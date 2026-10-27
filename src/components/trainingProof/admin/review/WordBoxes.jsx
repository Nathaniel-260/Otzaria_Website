'use client'

import { SCRIPT_LABELS, WORD_SCRIPTS } from '@/lib/trainingProof/vocab'

// תמונת-שורה מעורבת עם מסגרת לכל מילה. שם-הכתב של המילה **מעל** המסגרת, לא בתוכה (ה-7).
// onCycle(k) — לחיצה על מסגרת מחליפה את הכתב שלה (מרובע ← רש"י ← לועזית ← ניטרלי ← …).
// בלי onCycle — לקריאה בלבד.

const BOX = {
  square: 'border-info-600 bg-info-100/30',
  rashi: 'border-warning-800 bg-warning-100/30',
  latin: 'border-success-700 bg-success-100/30',
  neutral: 'border-on-surface/40 bg-surface-variant/30',
}
const LABEL = {
  square: 'bg-info-100 text-info-800',
  rashi: 'bg-warning-100 text-warning-800',
  latin: 'bg-success-100 text-success-800',
  neutral: 'bg-surface-variant text-on-surface/70',
}

export const nextScript = (s) => WORD_SCRIPTS[(WORD_SCRIPTS.indexOf(s) + 1) % WORD_SCRIPTS.length]

export default function WordBoxes({ src, w, h, words, onCycle = null }) {
  return (
    <div className="pt-6">
      <div className="relative inline-block max-w-full">
        <img src={src} alt="תמונת השורה" width={w} height={h} loading="lazy" className="block h-auto max-w-full rounded border border-surface-variant bg-white" />
        {words.map((wd) => {
          const [x0, y0, x1, y1] = wd.box
          const style = { left: `${(x0 / w) * 100}%`, top: `${(y0 / h) * 100}%`, width: `${((x1 - x0) / w) * 100}%`, height: `${((y1 - y0) / h) * 100}%` }
          const label = SCRIPT_LABELS[wd.label] || '?'
          const inner = (
            <span className={`pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded px-1 text-[11px] font-bold leading-4 ${LABEL[wd.label] || LABEL.neutral}`}>
              {label}
            </span>
          )
          return onCycle ? (
            <button
              key={wd.k}
              type="button"
              data-word={wd.k}
              aria-label={`מילה ${wd.k + 1}: ${label} — לחיצה מחליפה כתב`}
              onClick={() => onCycle(wd.k)}
              className={`absolute rounded-sm border-2 ${BOX[wd.label] || BOX.neutral} hover:ring-2 hover:ring-primary`}
              style={style}
            >
              {inner}
            </button>
          ) : (
            <span key={wd.k} data-word={wd.k} className={`absolute rounded-sm border-2 ${BOX[wd.label] || BOX.neutral}`} style={style}>
              {inner}
            </span>
          )
        })}
      </div>
    </div>
  )
}
