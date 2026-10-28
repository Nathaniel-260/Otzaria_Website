'use client'

import { Pill } from './AdminBits'
import { UPLOAD_STATUS } from './adminLabels'
import { MAX_ERRORS_SHOWN } from './uploadPlan'

// מצב עבודת הייבוא של העלאה אחת (Upload מ-CONTRACT.md): מונה עמודים/החלטות/תמונות בזמן העיבוד,
// ובסיום — הסיכום והשגיאות (עד 20 שורות).

const SUMMARY_LABEL = {
  slug: 'מסכת',
  masechet: 'מסכת',
  buildId: 'בנייה',
  pages: 'עמודים',
  items: 'החלטות',
  images: 'תמונות',
  created: 'נוספו',
  updated: 'עודכנו',
  skipped: 'דולגו',
  skippedAnswered: 'נענו כבר (לא נדרסו)',
  obsolete: 'סומנו לא רלוונטיים',
  obsoleted: 'סומנו לא רלוונטיים',
  full: 'חבילה מלאה',
  ignored: 'קבצים שלא זוהו',
  reopened: 'נפתחו לסבב נוסף',
  practice: 'תרגול',
}

function summaryParts(summary) {
  if (!summary) return []
  if (typeof summary === 'string') return [summary]
  if (typeof summary !== 'object') return [String(summary)]
  return Object.entries(summary)
    .filter(([k, v]) => v !== null && v !== undefined && v !== '' && k !== 'errors')
    .map(([k, v]) => `${SUMMARY_LABEL[k] || k}: ${summaryValue(v)}`)
}

// ערך בסיכום: מונים מקוננים ({created, updated, …} מהייבוא) — כ"נוספו 3, עודכנו 2"; כן/לא — במילים
function summaryValue(v) {
  if (typeof v === 'boolean') return v ? 'כן' : 'לא'
  if (v && typeof v === 'object') {
    return Object.entries(v)
      .filter(([, x]) => x !== null && x !== undefined && x !== '')
      .map(([k, x]) => `${SUMMARY_LABEL[k] || k} ${typeof x === 'object' ? JSON.stringify(x) : x}`)
      .join(', ')
  }
  return v
}

export default function UploadJobInfo({ upload }) {
  if (!upload) return null
  const p = upload.progress || {}
  const errors = (upload.errors || []).slice(0, MAX_ERRORS_SHOWN)
  const parts = summaryParts(upload.summary)
  return (
    <div className="mt-1 space-y-1 text-xs" data-testid="upload-job">
      <div className="flex flex-wrap items-center gap-2">
        <Pill status={upload.status} labels={UPLOAD_STATUS} />
        {(upload.status === 'processing' || upload.status === 'queued' || upload.status === 'done') && (
          <span className="tabular-nums text-on-surface/70">
            עמודים {p.pages || 0} · החלטות {p.items || 0} · תמונות {p.images || 0}
          </span>
        )}
      </div>
      {parts.length > 0 && (upload.status === 'done' || upload.status === 'failed') && (
        <div className="rounded bg-success-50 px-2 py-1 text-success-800" data-testid="upload-summary">
          {parts.join(' · ')}
        </div>
      )}
      {errors.length > 0 && (
        <ul className="list-disc rounded bg-danger-50 py-1 pr-6 text-danger-700" data-testid="upload-errors">
          {errors.map((e, i) => (
            <li key={`${i}:${e}`}>{typeof e === 'string' ? e : JSON.stringify(e)}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
