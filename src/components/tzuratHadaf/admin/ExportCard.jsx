'use client'

import { useState } from 'react'
import { API, NETWORK_ERROR } from './adminApi'
import { Card, ErrorLine, btnPrimary } from './AdminBits'

// "ייצוא": הורדת NDJSON (GET export?since=&types=) — ההכרעות, העוגנים, התיקונים הידניים, "מבט כללי",
// הדיווחים והתורמים, בפורמט של PACKAGE.md §3. צורת הדף קוראת אותו ב-tools/site_pull.py.

export const EXPORT_TYPES = [
  ['decisions', 'הכרעות נוסח (כולל תיקונים ידניים)'],
  ['anchors', 'עוגני שורות'],
  ['checks', 'מבט כללי'],
  ['reports', 'דיווחים'],
  ['contributors', 'תורמים'],
]

/** כתובת הייצוא: since — תאריך (YYYY-MM-DD) או ריק; types — רשימה (כולם = בלי סינון). */
export function exportUrl(since, types) {
  const p = new URLSearchParams()
  if (since) {
    const d = new Date(`${since}T00:00:00`)
    if (!Number.isNaN(d.getTime())) p.set('since', d.toISOString())
  }
  if (types && types.length && types.length < EXPORT_TYPES.length) {
    // החוזה כותב פעם types ופעם parts — נשלחים שניהם (אותו ערך)
    p.set('types', types.join(','))
    p.set('parts', types.join(','))
  }
  const s = p.toString()
  return `${API}/export${s ? `?${s}` : ''}`
}

export default function ExportCard() {
  const [since, setSince] = useState('')
  const [types, setTypes] = useState(() => EXPORT_TYPES.map(([k]) => k))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)

  const toggle = (k) => setTypes((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : EXPORT_TYPES.map(([x]) => x).filter((x) => x === k || cur.includes(x))))

  const download = async (useSince) => {
    setBusy(true)
    setError(null)
    setDone(null)
    try {
      const res = await fetch(exportUrl(useSince ? since : '', types), { cache: 'no-store' })
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        throw new Error(d?.error || `הייצוא נכשל (${res.status})`)
      }
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `tzurat-hadaf-export-${new Date().toISOString().slice(0, 10)}${useSince && since ? `-since-${since}` : ''}.ndjson`
      a.click()
      URL.revokeObjectURL(a.href)
      setDone(`הורד (${Math.round(blob.size / 1024).toLocaleString('he-IL')} KB)`)
    } catch (e) {
      setError(e?.name === 'TypeError' ? NETWORK_ERROR : e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card icon="download" title="ייצוא לצורת הדף" testId="export-card">
      <p className="mb-3 text-sm text-on-surface/60">
        קובץ NDJSON — רשומה לשורה (<code dir="ltr">decision</code>, <code dir="ltr">anchor</code>, <code dir="ltr">check</code>,{' '}
        <code dir="ltr">report</code>, <code dir="ltr">contributor</code>): רק החלטות שהוסכמו או הוכרעו, ועוגנים מהגשות שאושרו. בצורת הדף הוא נקרא ב-
        <code dir="ltr">tools/site_pull.py</code>. אפשר גם בלי האתר: אותו פורמט נבנה ישירות ממסד הנתונים (<code dir="ltr">site_pull.py --mongo</code> או{' '}
        <code dir="ltr">--dump</code> של mongoexport) — PACKAGE.md §3.
      </p>
      <fieldset className="mb-3 flex flex-wrap gap-3 text-sm">
        <legend className="mb-1 font-medium">מה לייצא</legend>
        {EXPORT_TYPES.map(([k, label]) => (
          <label key={k} className="flex items-center gap-1">
            <input type="checkbox" checked={types.includes(k)} onChange={() => toggle(k)} />
            {label}
          </label>
        ))}
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={busy || !types.length} onClick={() => download(false)} className={btnPrimary}>
          <span aria-hidden="true" className="material-symbols-outlined text-base">download</span>
          ייצוא מלא
        </button>
        <label className="flex items-center gap-1 text-sm">
          מאז
          <input type="date" value={since} onChange={(e) => setSince(e.target.value)} aria-label="ייצוא מאז תאריך" className="rounded border border-surface-variant bg-surface px-2 py-1" />
        </label>
        <button type="button" disabled={busy || !since || !types.length} onClick={() => download(true)} className={btnPrimary}>
          ייצוא מאז התאריך
        </button>
        {busy && <span className="text-sm text-on-surface/60">מוריד…</span>}
        {done && <span className="text-sm text-success-800">{done}</span>}
      </div>
      <div className="mt-2">
        <ErrorLine text={error} />
      </div>
    </Card>
  )
}
