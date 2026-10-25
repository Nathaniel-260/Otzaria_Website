'use client'

import { useState } from 'react'
import { query } from './adminApi'
import { Card, ErrorLine, Pager, Select, btnGhost } from './AdminBits'
import { ITEM_STATUS, ITEM_STATUS_ORDER, KIND_LABEL } from './adminLabels'
import ItemCard from './ItemCard'
import useAdminData from './useAdminData'

// "מחלוקות": החלטות הנוסח לפי מצב (ברירת מחדל: במחלוקת), מסכת וסוג גוש, עם דפדוף.
// GET items?status=&slug=&kind=&page= → {items, total, page, pages}. ההכרעה עצמה — ItemCard.

const STATUS_OPTIONS = ITEM_STATUS_ORDER.map((s) => [s, ITEM_STATUS[s]])
const KIND_OPTIONS = [['all', 'כל הסוגים'], ...Object.entries(KIND_LABEL)]

export default function DisputesSection() {
  const [status, setStatus] = useState('disputed')
  const [slug, setSlug] = useState('all')
  const [kind, setKind] = useState('all')
  const [page, setPage] = useState(1)
  const { data, error, reload: load, setData } = useAdminData(`items${query({ status, slug, kind, page })}`)
  // רשימת המסכתות למסנן (מהחבילות שיובאו)
  const batches = useAdminData('batches').data
  const books = [...(batches?.batches || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

  const filter = (setter) => (v) => {
    setter(v)
    setPage(1)
  }

  const replace = (item) => setData((d) => ({ ...d, items: d.items.map((x) => (x.id === item.id ? item : x)) }))

  return (
    <Card
      icon="gavel"
      title="החלטות נוסח"
      testId="disputes"
      actions={
        <button type="button" onClick={load} className={btnGhost}>
          <span aria-hidden="true" className="material-symbols-outlined text-base">refresh</span>
          רענון
        </button>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Select label="מצב" value={status} onChange={filter(setStatus)} options={STATUS_OPTIONS} />
        <Select label="מסכת" value={slug} onChange={filter(setSlug)} options={[['all', 'כל המסכתות'], ...books.map((b) => [b.slug, b.masechet || b.slug])]} />
        <Select label="סוג" value={kind} onChange={filter(setKind)} options={KIND_OPTIONS} />
        {data && <span className="text-sm text-on-surface/60">{data.total ?? 0} החלטות</span>}
      </div>
      <ErrorLine text={error} />
      {!data ? null : !(data.items || []).length ? (
        <p className="py-4 text-center text-sm text-on-surface/60">אין החלטות במצב הזה</p>
      ) : (
        <div className="space-y-3">
          {data.items.map((item) => (
            <ItemCard key={item.id} item={item} onChange={replace} />
          ))}
        </div>
      )}
      <Pager page={data?.page || page} pages={data?.pages || 1} onPage={setPage} />
    </Card>
  )
}
