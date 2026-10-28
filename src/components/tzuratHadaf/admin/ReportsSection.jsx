'use client'

import { useState } from 'react'
import { formatDateShortMonthWithYearAndTime } from '@/lib/formatDate'
import { apiCall, pageCount, pageImageUrl, query, withRegion } from './adminApi'
import { Card, ErrorLine, Pager, Pill, Select, btnGhost, btnPrimary } from './AdminBits'
import { REPORT_CATEGORY, REPORT_STATUS } from './adminLabels'
import useAdminData from './useAdminData'

// "דיווחים": דיווחים חופשיים של מתנדבים (בהגשה או מחוצה לה) לפי מצב, קטגוריה ומסכת; לכל דיווח —
// חיתוכי האזורים שסומנו בסריקה ובעמוד שלנו, הטקסט, המדווח וקישור לעמוד; שינוי מצב עם הערה:
// PATCH reports/[id] {status, note} → {report}. ("תוקן" מזכה את המדווח ב-2 נקודות — בשרת.)

const STATUS_OPTIONS = [['all', 'כל המצבים'], ...Object.entries(REPORT_STATUS)]
const CATEGORY_OPTIONS = [['all', 'כל הקטגוריות'], ...Object.entries(REPORT_CATEGORY)]

const regionSrc = (r, g) => {
  const base = g.side === 'ours' ? r.oursUrl : r.scanUrl
  return base ? withRegion(base, g) : pageImageUrl(r.page, g.side, g)
}

function ReportCard({ report, onChange }) {
  const [status, setStatus] = useState(report.status)
  const [note, setNote] = useState(report.resolution?.note || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const title = `${report.masechet || report.slug} ${report.daf || ''}`

  const save = async () => {
    setBusy(true)
    setError(null)
    const r = await apiCall(`reports/${encodeURIComponent(report.id)}`, { method: 'PATCH', body: { status, note } })
    setBusy(false)
    if (!r.ok) return setError(r.error)
    onChange?.({ ...report, ...(r.data?.report || { status, resolution: { ...report.resolution, note } }) })
  }

  const dirty = status !== report.status || note !== (report.resolution?.note || '')

  return (
    <article className="rounded-xl border border-surface-variant bg-surface p-3 text-sm" data-testid="admin-report" aria-label={`דיווח ${title}`}>
      <header className="mb-2 flex flex-wrap items-center gap-2">
        <b>{title}</b>
        <span className="rounded bg-surface-variant/70 px-1.5 text-xs">{REPORT_CATEGORY[report.category] || report.category}</span>
        <span className="text-xs text-on-surface/60">
          {report.userName}
          {report.createdAt || report.at ? ` · ${formatDateShortMonthWithYearAndTime(report.createdAt || report.at)}` : ''}
          {report.submission ? ' · בהגשה' : ''}
        </span>
        <span className="flex-1" />
        {report.page && (
          <a href={`/library/tzurat-hadaf/review?page=${encodeURIComponent(report.page)}`} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
            <span aria-hidden="true" className="material-symbols-outlined text-sm">open_in_new</span>
            פתח את העמוד
          </a>
        )}
        <Pill status={report.status} labels={REPORT_STATUS} />
      </header>
      <p className="mb-2 whitespace-pre-wrap">{report.text}</p>
      {(report.regions || []).length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {report.regions.map((g, i) => (
            <figure key={i} className="rounded border bg-white p-1">
              <img src={regionSrc(report, g)} alt={`${g.side === 'ours' ? 'העמוד שלנו' : 'הסריקה'} — אזור ${i + 1}`} loading="lazy" className="max-h-48 w-auto" />
              <figcaption className="text-center text-[11px] text-on-surface/60">{g.side === 'ours' ? 'שלנו' : 'סריקה'}</figcaption>
            </figure>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Select label="מצב" value={status} onChange={setStatus} options={Object.entries(REPORT_STATUS)} />
        <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="הערה (למדווח ולצורת הדף)" aria-label="הערה לדיווח" className="min-w-0 flex-1 rounded border border-surface-variant bg-surface px-2 py-1" />
        <button type="button" disabled={busy || !dirty} onClick={save} className={btnPrimary}>
          שמירה
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-1 text-danger-700">
          {error}
        </p>
      )}
    </article>
  )
}

export default function ReportsSection() {
  const [status, setStatus] = useState('new')
  const [category, setCategory] = useState('all')
  const [slug, setSlug] = useState('all')
  const [page, setPage] = useState(1)
  const { data, error, reload: load, setData } = useAdminData(`reports${query({ status, category, slug, page })}`)
  const batches = useAdminData('batches').data
  const books = [...(batches?.batches || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  // גודל הדף — לפי הדף הראשון, אם השרת אינו מחזיר pages
  const [firstSize, setFirstSize] = useState(0)
  if (page === 1 && data?.reports && data.reports.length !== firstSize) setFirstSize(data.reports.length)

  const filter = (setter) => (v) => {
    setter(v)
    setPage(1)
  }
  const replace = (rep) => setData((d) => ({ ...d, reports: d.reports.map((x) => (x.id === rep.id ? rep : x)) }))
  const list = data?.reports || []

  return (
    <Card
      icon="flag"
      title="דיווחים"
      testId="reports"
      actions={
        <button type="button" onClick={load} className={btnGhost}>
          <span aria-hidden="true" className="material-symbols-outlined text-base">refresh</span>
          רענון
        </button>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Select label="מצב" value={status} onChange={filter(setStatus)} options={STATUS_OPTIONS} />
        <Select label="קטגוריה" value={category} onChange={filter(setCategory)} options={CATEGORY_OPTIONS} />
        <Select label="מסכת" value={slug} onChange={filter(setSlug)} options={[['all', 'כל המסכתות'], ...books.map((b) => [b.slug, b.masechet || b.slug])]} />
        {data && <span className="text-sm text-on-surface/60">{data.total ?? list.length} דיווחים</span>}
      </div>
      <ErrorLine text={error} />
      {!data ? null : !list.length ? (
        <p className="py-4 text-center text-sm text-on-surface/60">אין דיווחים</p>
      ) : (
        <div className="space-y-3">
          {list.map((r) => (
            <ReportCard key={r.id} report={r} onChange={replace} />
          ))}
        </div>
      )}
      <Pager page={page} pages={pageCount(data, firstSize)} onPage={setPage} />
    </Card>
  )
}
