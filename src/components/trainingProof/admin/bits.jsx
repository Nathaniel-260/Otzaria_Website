'use client'

// חלקים קטנים שחוזרים בכל לשוניות הניהול: כרטיס, תגית, תגית-כתב, שורת-בחירה בין החלקים.
import { SECTION_LABELS, SCRIPT_LABELS } from '@/lib/trainingProof/vocab'

export const SECTION_ICONS = { ocr: 'text_fields', router: 'fork_right', frames: 'dashboard' }

const TONES = {
  ok: 'bg-success-100 text-success-800',
  err: 'bg-danger-100 text-danger-700',
  warn: 'bg-warning-alt-100 text-warning-alt-800',
  info: 'bg-info-100 text-info-800',
  muted: 'bg-surface-variant text-on-surface/70',
}

export function Tag({ tone = 'muted', children, title }) {
  return (
    <span title={title} className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${TONES[tone] || TONES.muted}`}>
      {children}
    </span>
  )
}

// צבע לכל כתב — זהה בכל המסכים
const SCRIPT_TONES = {
  square: 'bg-info-100 text-info-800',
  rashi: 'bg-warning-100 text-warning-800',
  latin: 'bg-success-100 text-success-800',
  mixed: 'bg-danger-100 text-danger-700',
  neutral: 'bg-surface-variant text-on-surface/70',
}

export function ScriptTag({ script }) {
  if (!script) return null
  return <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${SCRIPT_TONES[script] || SCRIPT_TONES.neutral}`}>{SCRIPT_LABELS[script] || script}</span>
}

export function Card({ title, icon, actions, children, className = '' }) {
  return (
    <section className={`glass-strong flex flex-col gap-3 rounded-xl p-4 ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {title && (
            <h2 className="flex items-center gap-2 text-lg font-bold text-on-surface">
              {icon && <span className="material-symbols-outlined text-primary">{icon}</span>}
              {title}
            </h2>
          )}
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}

// בורר בין שלושת החלקים (או חלק מהם)
export function SectionSwitch({ value, onChange, sections = ['ocr', 'router', 'frames'], counts = null }) {
  return (
    <div role="tablist" aria-label="חלק" className="inline-flex self-start overflow-hidden rounded-full border border-surface-variant">
      {sections.map((s) => (
        <button
          key={s}
          role="tab"
          aria-selected={value === s}
          onClick={() => onChange(s)}
          className={`flex items-center gap-1 px-4 py-1.5 text-sm font-semibold transition-colors ${value === s ? 'bg-primary text-on-primary' : 'hover:bg-surface-variant'}`}
        >
          <span className="material-symbols-outlined text-base">{SECTION_ICONS[s]}</span>
          {SECTION_LABELS[s]}
          {counts?.[s] ? <span className="rounded-full bg-black/10 px-1.5 text-xs tabular-nums">{counts[s].toLocaleString('he-IL')}</span> : null}
        </button>
      ))}
    </div>
  )
}

export const Muted = ({ children, className = '' }) => <p className={`text-sm text-on-surface/60 ${className}`}>{children}</p>

export function Empty({ children }) {
  return <div className="p-6 text-center text-on-surface/60">{children}</div>
}

// כפתור קטן ושקט (בתוך שורות וטבלאות)
export const smallBtn =
  'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40'
export const BTN = {
  primary: `${smallBtn} bg-primary text-on-primary hover:opacity-90`,
  outline: `${smallBtn} border border-surface-variant hover:bg-surface-variant`,
  quiet: `${smallBtn} hover:bg-surface-variant`,
  danger: `${smallBtn} text-danger-700 hover:bg-danger-100`,
  tonal: `${smallBtn} bg-info-100 text-info-800 hover:opacity-90`,
}
