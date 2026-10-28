'use client'

import { useCallback, useEffect, useState } from 'react'
import { SECTION_LABELS } from '@/lib/trainingProof/vocab'
import { getJson, fmt } from './api'
import ReviewTab from './review/ReviewTab'
import UploadTab from './upload/UploadTab'
import ExportTab from './export/ExportTab'
import VolunteersTab from './volunteers/VolunteersTab'
import GuideTab from './guide/GuideTab'
import LegacyTab from './legacy/LegacyTab'

// מסך הניהול של "הגהה לאימון המודלים" (docs/75 §2; docs/76 §8.3 סשן ד'): מונים בראש,
// ושש לשוניות — סקירה ואישור · העלאת חומר · הורדה לתחנה · מתנדבים · הוראות ההגהה · הדף הישן.
// הלשונית והחלק נשמרים בכתובת (?tab=…&sec=…), כדי שרענון לא יחזיר להתחלה.

export const TABS = [
  { id: 'review', icon: 'fact_check', label: 'סקירה ואישור' },
  { id: 'upload', icon: 'upload', label: 'העלאת חומר' },
  { id: 'export', icon: 'download', label: 'הורדה לתחנה' },
  { id: 'volunteers', icon: 'group', label: 'מתנדבים' },
  { id: 'guide', icon: 'menu_book', label: 'הוראות ההגהה' },
  { id: 'legacy', icon: 'delete_forever', label: 'הדף הישן' },
]
const SECTIONS = ['ocr', 'router', 'frames']

function Counters({ summary }) {
  if (!summary) return null
  const s = summary.sections
  const approved = SECTIONS.reduce((n, k) => n + s[k].approved, 0)
  const cell = (n, label, tone = '') => (
    <div className="glass-strong flex flex-col rounded-xl px-4 py-3">
      <b className={`text-2xl tabular-nums ${tone}`}>{fmt(n)}</b>
      <span className="text-xs text-on-surface/70">{label}</span>
    </div>
  )
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4" aria-label="מונים">
      {cell(s.ocr.submitted, `${SECTION_LABELS.ocr} — ממתינות לאישור`)}
      {cell(s.router.submitted, `${SECTION_LABELS.router} — ממתינות לאישור`)}
      {cell(s.frames.submitted, `${SECTION_LABELS.frames} — עמודים ממתינים`)}
      {cell(approved, 'אושרו ועוד לא הורדו לתחנה', 'text-success-700')}
    </div>
  )
}

export default function TrainingProofAdmin() {
  const [tab, setTab] = useState('review')
  const [sec, setSec] = useState('ocr')
  const [summary, setSummary] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- הלשונית מהכתובת, אחרי ה-hydration
    if (TABS.some((t) => t.id === q.get('tab'))) setTab(q.get('tab'))
    if (SECTIONS.includes(q.get('sec'))) setSec(q.get('sec'))
    setReady(true)
  }, [])
  // כותבים לכתובת רק אחרי שנקראה — אחרת ההרצה הכפולה של effects במצב-פיתוח דורסת אותה
  useEffect(() => {
    if (!ready) return
    const q = new URLSearchParams(window.location.search)
    q.set('tab', tab)
    if (tab === 'review') q.set('sec', sec)
    else q.delete('sec')
    window.history.replaceState(null, '', `${window.location.pathname}?${q}`)
  }, [ready, tab, sec])

  const loadSummary = useCallback(async () => {
    try {
      setSummary(await getJson('/summary'))
    } catch {
      /* המונים אינם חוסמים את המסך */
    }
  }, [])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- טעינה מהשרת; ה-setState קורה אחרי await
    loadSummary()
  }, [loadSummary])

  return (
    <div className="flex flex-col gap-4">
      <div className="glass-strong rounded-xl p-4">
        <h2 className="flex items-center gap-2 text-2xl font-bold text-on-surface">
          <span className="material-symbols-outlined text-primary">model_training</span>
          ניהול — הגהה לאימון המודלים
        </h2>
        <p className="mt-1 text-sm text-on-surface/60">
          רק מנהלי OCR רואים את הדף הזה. שום דבר שמתנדב שומר לא יוצא לתחנה בלי שאושר כאן. דף המתנדבים: <span dir="ltr">/library/page-proof</span>
        </p>
      </div>
      <Counters summary={summary} />
      <div role="tablist" aria-label="מסכי הניהול" className="flex flex-wrap gap-1 border-b border-surface-variant">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-on-surface/70 hover:text-on-surface'}`}
          >
            <span className="material-symbols-outlined text-base">{t.icon}</span>
            {t.label}
            {t.id === 'volunteers' && summary?.requests > 0 && (
              <span className="rounded-full bg-warning-alt-100 px-1.5 text-xs text-warning-alt-800" title="בקשות גישה ממתינות">
                {summary.requests}
              </span>
            )}
          </button>
        ))}
      </div>
      {ready && (
        <div role="tabpanel">
          {tab === 'review' && <ReviewTab section={sec} setSection={setSec} summary={summary} onChanged={loadSummary} />}
          {tab === 'upload' && <UploadTab onChanged={loadSummary} />}
          {tab === 'export' && <ExportTab onChanged={loadSummary} />}
          {tab === 'volunteers' && <VolunteersTab onChanged={loadSummary} />}
          {tab === 'guide' && <GuideTab />}
          {tab === 'legacy' && <LegacyTab />}
        </div>
      )}
    </div>
  )
}
