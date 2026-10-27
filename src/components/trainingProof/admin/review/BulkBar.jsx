'use client'

import Pagination from '@/components/ui/Pagination'
import { fmt } from '../api'
import { BTN } from '../bits'

// סרגל הסימון: כמה מסומנות, סמן הכול בתצוגה / נקה, אשר/דחה את המסומנות
export function BulkBar({ items, sel, setSel, busy, onApprove, onReject, total }) {
  const pending = items.filter((x) => x.status === 'submitted')
  return (
    <div className="glass-strong sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-xl px-3 py-2 text-sm">
      <span className="tabular-nums">
        <b>{fmt(sel.size)}</b> מסומנות · {fmt(items.length)} בתצוגה מתוך {fmt(total)}
      </span>
      <button className={BTN.quiet} onClick={() => setSel(new Set(pending.map((x) => x.id)))} disabled={!pending.length}>
        סמן את כל התצוגה
      </button>
      <button className={BTN.quiet} onClick={() => setSel(new Set())} disabled={!sel.size}>
        נקה סימון
      </button>
      <span className="flex-1" />
      <button className={BTN.primary} onClick={onApprove} disabled={busy || !sel.size}>
        <span className="material-symbols-outlined text-sm">done_all</span> אשר את המסומנות
      </button>
      <button className={`${BTN.danger} border border-danger-100`} onClick={onReject} disabled={busy || !sel.size}>
        דחה את המסומנות
      </button>
    </div>
  )
}

export function Pager({ data, setPage }) {
  if (!data || data.pages <= 1) return null
  return (
    <div className="flex justify-center">
      <Pagination currentPage={data.page} totalPages={data.pages} onPageChange={setPage} />
    </div>
  )
}
