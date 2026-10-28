'use client'

import { useCallback, useState } from 'react'
import { formatDateShortMonthWithYearAndTime } from '@/lib/formatDate'
import { apiCall } from './adminApi'
import { Card, ErrorLine, Pill, btnGhost } from './AdminBits'
import { BATCH_STATUS } from './adminLabels'
import ChunkedUploadCard from './ChunkedUploadCard'
import UploadJobInfo from './UploadJobInfo'
import { formatBytes } from './uploadPlan'
import useAdminData from './useAdminData'

// "העלאת חבילות": כרטיס ההעלאה, ההעלאות האחרונות (GET uploads, עם "נסה שוב" לעיבוד שנכשל),
// וטבלת החבילות (GET batches) — השהיה/חידוש של מסכת (PATCH batches/[slug]): מסכת מושהית אינה מוצעת
// למתנדבים.

const when = (d) => (d ? formatDateShortMonthWithYearAndTime(d) : '')

function RecentUploads({ reloadKey, onChanged }) {
  const { data, error: loadError, reload: load } = useAdminData('uploads', reloadKey)
  const [error, setError] = useState(null)
  const list = data ? data.uploads || [] : null

  const retry = async (u) => {
    const r = await apiCall(`uploads/${encodeURIComponent(u.id)}/retry`, { method: 'POST', body: {} })
    if (!r.ok) setError(r.error)
    else {
      setError(null)
      load()
      onChanged?.()
    }
  }

  return (
    <Card
      icon="history"
      title="העלאות אחרונות"
      testId="recent-uploads"
      actions={
        <button type="button" onClick={load} className={btnGhost}>
          <span aria-hidden="true" className="material-symbols-outlined text-base">refresh</span>
          רענון
        </button>
      }
    >
      <ErrorLine text={error || loadError} />
      {!list ? null : !list.length ? (
        <p className="py-2 text-center text-sm text-on-surface/60">אין העלאות</p>
      ) : (
        <ul className="divide-y divide-surface-variant text-sm">
          {list.map((u) => (
            <li key={u.id} className="py-2">
              <div className="flex flex-wrap items-center gap-2">
                <b className="break-all">{u.name}</b>
                <span className="text-xs text-on-surface/60" dir="ltr">
                  {formatBytes(u.size)}
                </span>
                {u.status === 'uploading' && (
                  <span className="text-xs text-on-surface/60">
                    {(u.received || []).length}/{u.chunks} חלקים
                  </span>
                )}
                <span className="text-xs text-on-surface/60">
                  {when(u.startedAt)}
                  {u.finishedAt ? ` — ${when(u.finishedAt)}` : ''}
                </span>
                <span className="flex-1" />
                {u.status === 'failed' && (
                  <button type="button" onClick={() => retry(u)} className={btnGhost} aria-label={`נסה שוב את ${u.name}`}>
                    <span aria-hidden="true" className="material-symbols-outlined text-base">restart_alt</span>
                    נסה שוב
                  </button>
                )}
              </div>
              <UploadJobInfo upload={u} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function BatchesTable({ reloadKey }) {
  const { data, error: loadError, setData } = useAdminData('batches', reloadKey)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(null)
  const list = data ? data.batches || [] : null

  const toggle = async (b) => {
    const next = b.status === 'paused' ? 'active' : 'paused'
    setBusy(b.slug)
    const r = await apiCall(`batches/${encodeURIComponent(b.slug)}`, { method: 'PATCH', body: { status: next } })
    setBusy(null)
    if (!r.ok) return setError(r.error)
    setError(null)
    const status = r.data?.batch?.status || r.data?.status || next
    setData((cur) => ({ ...cur, batches: (cur?.batches || []).map((x) => (x.slug === b.slug ? { ...x, status } : x)) }))
  }

  const rows = [...(list || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  return (
    <Card icon="menu_book" title="חבילות שיובאו" testId="batches">
      <ErrorLine text={error || loadError} />
      {!list ? null : !rows.length ? (
        <p className="py-2 text-center text-sm text-on-surface/60">אין חבילות</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-right text-on-surface/60">
              <tr>
                <th className="p-1">מסכת</th>
                <th className="p-1">בנייה</th>
                <th className="p-1">עמודים</th>
                <th className="p-1">החלטות</th>
                <th className="p-1">יובאה</th>
                <th className="p-1">מצב</th>
                <th className="p-1"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.slug} className="border-t border-surface-variant">
                  <td className="p-1 font-medium">{b.masechet || b.slug}</td>
                  <td className="p-1">
                    <code dir="ltr" className="text-xs">
                      {b.buildId}
                    </code>
                  </td>
                  <td className="p-1 tabular-nums">{b.pages}</td>
                  <td className="p-1 tabular-nums">{b.items}</td>
                  <td className="p-1 text-xs">{when(b.importedAt)}</td>
                  <td className="p-1">
                    <Pill status={b.status} labels={BATCH_STATUS} />
                  </td>
                  <td className="p-1">
                    <button type="button" disabled={busy === b.slug} onClick={() => toggle(b)} className={btnGhost} aria-label={`${b.status === 'paused' ? 'חידוש' : 'השהיה'} ${b.masechet || b.slug}`}>
                      <span aria-hidden="true" className="material-symbols-outlined text-base">
                        {b.status === 'paused' ? 'play_circle' : 'pause_circle'}
                      </span>
                      {b.status === 'paused' ? 'חידוש' : 'השהיה'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

export default function UploadsSection() {
  const [reloadKey, setReloadKey] = useState(0)
  const changed = useCallback(() => setReloadKey((k) => k + 1), [])
  return (
    <div className="flex flex-col gap-4">
      <ChunkedUploadCard onChanged={changed} />
      <RecentUploads reloadKey={reloadKey} onChanged={changed} />
      <BatchesTable reloadKey={reloadKey} />
    </div>
  )
}
