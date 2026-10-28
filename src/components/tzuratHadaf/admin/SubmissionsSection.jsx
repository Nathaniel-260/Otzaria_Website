'use client'

import { useCallback, useState } from 'react'
import { formatDateShortMonthWithYearAndTime } from '@/lib/formatDate'
import { pageCount, query } from './adminApi'
import { Card, ErrorLine, Pager, btnGhost, btnPrimary } from './AdminBits'
import { SUBMISSION_STATUS } from './adminLabels'
import SubmissionReviewModal from './SubmissionReviewModal'
import useAdminData from './useAdminData'

// "הגשות עמוד": התור לפי מצב (GET submissions?status=&page= → {submissions, total}), ומעבר לסקירה.

const TABS = ['submitted', 'approved', 'rejected']

export default function SubmissionsSection() {
  const [status, setStatus] = useState('submitted')
  const [page, setPage] = useState(1)
  const { data, error, reload: load, setData } = useAdminData(`submissions${query({ status, page })}`)
  const [openId, setOpenId] = useState(null)
  // גודל הדף — לפי הדף הראשון, אם השרת אינו מחזיר pages
  const [firstSize, setFirstSize] = useState(0)
  if (page === 1 && data?.submissions && data.submissions.length !== firstSize) setFirstSize(data.submissions.length)

  const close = useCallback(() => setOpenId(null), [])
  const done = useCallback(
    (id) => {
      setOpenId(null)
      setData((d) => (d ? { ...d, total: Math.max(0, (d.total || 1) - 1), submissions: (d.submissions || []).filter((s) => s.id !== id) } : d))
      load()
    },
    [load, setData]
  )

  const list = data?.submissions || []

  return (
    <Card icon="rate_review" title="הגשות עמוד" testId="submissions">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={status === t}
            onClick={() => {
              setStatus(t)
              setPage(1)
            }}
            className={`rounded-full px-3 py-1 text-sm ${status === t ? 'bg-primary text-on-primary' : 'bg-surface-variant/60 hover:bg-surface-variant'}`}
          >
            {SUBMISSION_STATUS[t]}
          </button>
        ))}
        <span className="flex-1" />
        {data && <span className="text-sm text-on-surface/60">{data.total ?? list.length} הגשות</span>}
        <button type="button" onClick={load} className={btnGhost}>
          <span aria-hidden="true" className="material-symbols-outlined text-base">refresh</span>
          רענון
        </button>
      </div>
      <ErrorLine text={error} />
      {!data ? null : !list.length ? (
        <p className="py-4 text-center text-sm text-on-surface/60">אין הגשות</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-right text-on-surface/60">
              <tr>
                <th className="p-1">מסכת · דף</th>
                <th className="p-1">מתנדב</th>
                <th className="p-1">סבב</th>
                <th className="p-1">עוגנים · החלטות · ידני · דיווחים</th>
                <th className="p-1">הוגש</th>
                <th className="p-1"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id} className="border-t border-surface-variant">
                  <td className="p-1">
                    {s.masechet || s.slug} <b>{s.daf}</b>
                  </td>
                  <td className="p-1">{s.userName}</td>
                  <td className="p-1 tabular-nums">{s.round}</td>
                  <td className="p-1 tabular-nums">
                    {s.counts?.anchors ?? 0} · {s.counts?.items ?? 0} · {s.counts?.manual ?? 0} · {s.counts?.reports ?? 0}
                  </td>
                  <td className="p-1 text-xs">{s.at ? formatDateShortMonthWithYearAndTime(s.at) : ''}</td>
                  <td className="p-1">
                    <button type="button" onClick={() => setOpenId(s.id)} className={btnPrimary} aria-label={`${status === 'submitted' ? 'סקירה' : 'צפייה'}: ${s.masechet || s.slug} ${s.daf}`}>
                      {status === 'submitted' ? 'סקירה' : 'צפייה'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} pages={pageCount(data, firstSize)} onPage={setPage} />
      {openId && <SubmissionReviewModal id={openId} onClose={close} onDone={done} />}
    </Card>
  )
}
