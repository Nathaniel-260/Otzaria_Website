'use client'

import { useState } from 'react'
import { FRAME_ROLE_LABELS } from '@/lib/trainingProof/vocab'

// תצוגה לקריאה בלבד של עמוד בגלאי: התמונה, ועליה המסגרות — של המתנדב (קו מלא, עם
// התפקיד, הזרם וסדר-הקריאה) או הצעת המודל (מקווקו). עד שעורך-המסגרות של סשן ג' מחובר
// (framesEditorSlot.js).

const COLORS = {
  body: '#1d4ed8',
  commentary: '#b45309',
  notes: '#7c3aed',
  margin: '#0f766e',
  heading: '#be123c',
  caption: '#4d7c0f',
  box: '#0369a1',
  furniture: '#6b7280',
  object: '#a21caf',
}

export default function FramesPagePreview({ page, streams = [] }) {
  const [show, setShow] = useState(page.result ? 'vol' : 'model')
  const frames = show === 'vol' ? page.result?.frames || [] : page.frames || []
  const streamName = (id) => streams.find((s) => s.id === id)?.name || id
  return (
    <div className="flex flex-col gap-2">
      <div role="radiogroup" className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-1">
          <input type="radio" checked={show === 'vol'} disabled={!page.result} onChange={() => setShow('vol')} /> מה שהמתנדב סימן
        </label>
        <label className="flex items-center gap-1">
          <input type="radio" checked={show === 'model'} onChange={() => setShow('model')} /> הצעת המודל
        </label>
        {page.result?.status === 'skip' && <span className="text-warning-alt-800">המתנדב סימן "דלג" — העמוד לא ייכנס לאימון</span>}
      </div>
      <div className="relative inline-block max-w-full self-start">
        <img src={page.img} alt={`עמוד ${page.page}`} width={page.w} height={page.h} className="block h-auto max-h-[80vh] w-auto max-w-full border border-surface-variant bg-white" />
        <svg viewBox={`0 0 ${page.w} ${page.h}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          {frames.map((f) => {
            const [x0, y0, x1, y1] = f.box
            const c = COLORS[f.role] || '#111'
            const sw = Math.max(2, page.w / 400)
            return (
              <g key={f.fid}>
                <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} fill={`${c}14`} stroke={c} strokeWidth={sw} strokeDasharray={show === 'model' || f.src === 'auto' ? `${sw * 4} ${sw * 3}` : undefined} />
                <text x={x1 - sw * 2} y={y0 - sw * 2} textAnchor="end" fontSize={Math.max(14, page.w / 70)} fill={c} fontWeight="700" direction="rtl">
                  {[f.ord != null ? `${f.ord}.` : '', FRAME_ROLE_LABELS[f.role] || f.role, f.stream ? `· ${streamName(f.stream)}` : '', f.cont ? '· ממשיך ⟵' : ''].filter(Boolean).join(' ')}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
