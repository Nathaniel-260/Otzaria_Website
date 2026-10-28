'use client'

import useAdminData from './useAdminData'
import { Bar, Card, ErrorLine, btnGhost } from './AdminBits'
import { ITEM_STATUS, ITEM_STATUS_ORDER, REPORT_STATUS, SUBMISSION_STATUS, kindLabel } from './adminLabels'
import { percent } from './uploadPlan'

// "סקירה": התקדמות לכל מסכת (עמודים שהושלמו, החלטות פתוחות/מוסכמות/במחלוקת), פילוח ההחלטות לפי
// מצב ולפי סוג גוש, הגשות ודיווחים לפי מצב, ומתנדבים פעילים. GET stats (CONTRACT.md "ניהול").
// בלי ספריית גרפים — טבלאות ופסים פשוטים.

const n = (v) => (Number(v) || 0).toLocaleString('he-IL')

function Counts({ title, counts, labels, order }) {
  const keys = order ? [...order.filter((k) => k in (counts || {})), ...Object.keys(counts || {}).filter((k) => !order.includes(k))] : Object.keys(counts || {})
  const total = keys.reduce((s, k) => s + (Number(counts[k]) || 0), 0)
  return (
    <div className="rounded-lg border border-surface-variant p-3">
      <h4 className="mb-2 text-sm font-bold text-on-surface/80">{title}</h4>
      {!keys.length ? (
        <p className="text-xs text-on-surface/60">אין נתונים</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {keys.map((k) => (
            <li key={k} className="grid grid-cols-[8rem_1fr_3.5rem] items-center gap-2">
              <span className="truncate">{labels ? labels[k] || k : k}</span>
              <Bar value={percent(counts[k], total)} label={labels ? labels[k] || k : k} />
              <span className="text-left tabular-nums">{n(counts[k])}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function OverviewSection() {
  const { data, error, reload: load } = useAdminData('stats')

  const books = [...(data?.books || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  // כמה סוגי גושים חולקים תווית (גיליון ושוליים) — מחברים את המונים
  const byKind = {}
  for (const [k, v] of Object.entries(data?.items?.byKind || {})) byKind[kindLabel(k)] = (byKind[kindLabel(k)] || 0) + (Number(v) || 0)

  return (
    <div className="flex flex-col gap-4">
      <Card
        icon="bar_chart"
        title="התקדמות לפי מסכת"
        testId="overview-books"
        actions={
          <button type="button" onClick={load} className={btnGhost}>
            <span aria-hidden="true" className="material-symbols-outlined text-base">refresh</span>
            רענון
          </button>
        }
      >
        <ErrorLine text={error} />
        {!data && !error ? (
          <p className="text-sm text-on-surface/60">טוען…</p>
        ) : data && !books.length ? (
          <p className="py-2 text-center text-sm text-on-surface/60">עוד לא יובאו חבילות</p>
        ) : data ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-right text-on-surface/60">
                <tr>
                  <th className="p-1">מסכת</th>
                  <th className="p-1">עמודים (הושלמו)</th>
                  <th className="w-40 p-1"></th>
                  <th className="p-1">החלטות</th>
                  <th className="p-1">פתוחות</th>
                  <th className="p-1">מוסכמות</th>
                  <th className="p-1">במחלוקת</th>
                </tr>
              </thead>
              <tbody>
                {books.map((b) => (
                  <tr key={b.slug} className="border-t border-surface-variant">
                    <td className="p-1 font-medium">{b.masechet || b.slug}</td>
                    <td className="p-1 tabular-nums">
                      {n(b.pagesDone)} / {n(b.pages)}
                    </td>
                    <td className="p-1">
                      <Bar value={percent(b.pagesDone, b.pages)} label={`עמודים שהושלמו ב${b.masechet || b.slug}`} />
                    </td>
                    <td className="p-1 tabular-nums">{n(b.items)}</td>
                    <td className="p-1 tabular-nums">{n(b.itemsOpen)}</td>
                    <td className="p-1 tabular-nums text-success-800">{n(b.itemsAgreed)}</td>
                    <td className="p-1 tabular-nums text-warning-800">{n(b.itemsDisputed)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>

      {data && (
        <Card icon="analytics" title="פילוח" testId="overview-counts">
          <div className="grid gap-3 md:grid-cols-2">
            <Counts title="החלטות לפי מצב" counts={data.items?.byStatus} labels={ITEM_STATUS} order={ITEM_STATUS_ORDER} />
            <Counts title="החלטות לפי סוג" counts={byKind} />
            <Counts title="הגשות עמוד" counts={data.submissions?.byStatus} labels={SUBMISSION_STATUS} />
            <Counts title="דיווחים" counts={data.reports?.byStatus} labels={REPORT_STATUS} />
          </div>
          <p className="mt-3 text-sm text-on-surface/80" data-testid="overview-volunteers">
            מתנדבים: {n(data.volunteers?.total)} · פעילים בשבוע האחרון: <b>{n(data.volunteers?.active7d)}</b>
          </p>
        </Card>
      )}
    </div>
  )
}
