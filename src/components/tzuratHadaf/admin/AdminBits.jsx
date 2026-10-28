'use client'

import { TONE } from './adminLabels'

// רכיבים קטנים משותפים למסך הניהול של צורת הדף: כרטיס, תגית סטטוס, דפדוף, פס התקדמות.

export function Card({ icon, title, children, actions = null, testId }) {
  return (
    <section className="glass-strong rounded-xl p-4" data-testid={testId}>
      {(title || actions) && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {title && (
            <h3 className="flex items-center gap-2 font-bold text-on-surface">
              {icon && (
                <span aria-hidden="true" className="material-symbols-outlined text-primary">
                  {icon}
                </span>
              )}
              {title}
            </h3>
          )}
          <span className="flex-1" />
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}

export function Pill({ status, labels, className = '' }) {
  return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs ${TONE[status] || 'bg-surface-variant/60'} ${className}`}>{labels?.[status] || status}</span>
}

export function Pager({ page, pages, onPage }) {
  if (!pages || pages <= 1) return null
  return (
    <nav aria-label="דפדוף" className="mt-3 flex items-center justify-center gap-2 text-sm">
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded px-2 py-1 hover:bg-surface-variant disabled:opacity-40">
        הקודם
      </button>
      <span className="tabular-nums">
        {page} / {pages}
      </span>
      <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} className="rounded px-2 py-1 hover:bg-surface-variant disabled:opacity-40">
        הבא
      </button>
    </nav>
  )
}

export function Bar({ value, label, tone = 'bg-primary' }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0))
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={v} className="h-2 w-full overflow-hidden rounded-full bg-surface-variant">
      <div className={`h-full ${tone} transition-[width]`} style={{ width: `${v}%` }} />
    </div>
  )
}

export function ErrorLine({ text }) {
  if (!text) return null
  return (
    <p role="alert" className="rounded bg-danger-50 px-2 py-1 text-sm text-danger-700">
      {text}
    </p>
  )
}

export function Select({ label, value, onChange, options, className = '' }) {
  return (
    <label className={`flex items-center gap-1 text-sm ${className}`}>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded border border-surface-variant bg-surface px-2 py-1">
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </label>
  )
}

export const btn = 'inline-flex items-center gap-1 rounded-md px-3 py-1 text-sm font-medium transition-colors disabled:opacity-40'
export const btnPrimary = `${btn} bg-primary text-on-primary hover:opacity-90`
export const btnGhost = `${btn} border border-surface-variant hover:bg-surface-variant`
export const btnDanger = `${btn} bg-danger-600 text-white hover:opacity-90`
export const btnSuccess = `${btn} bg-success-600 text-white hover:bg-success-700`
