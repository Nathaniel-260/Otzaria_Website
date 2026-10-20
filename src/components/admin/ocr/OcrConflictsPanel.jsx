'use client'

import { useCallback, useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import Loader from '@/components/ui/Loader'
import { PENDING_CONFLICT_STATUSES } from '@/lib/ocr/ocrConflictView'
import OcrConflictItem from './OcrConflictItem'

const PAGE_SIZE = 50
const LIST_URL = '/api/admin/books/ocr/conflicts'

/**
 * פאנל ההתנגשויות של עבודת OCR מקומי: עמודים שנערכו אחרי יצירת העבודה, שטקסט ה-OCR שלהם
 * נשמר להחלטת מנהל ולא נדרס. טוען את הרשימה מ-/api/admin/books/ocr/conflicts (בעמודים של 50),
 * ומבצע אימוץ/שמירת הקיים מול /api/admin/books/ocr/conflicts/:id.
 *
 * שני מצבים: jobId — כל ההתנגשויות של עבודה אחת; bookId — ההתנגשויות הפתוחות בספר מכל
 * העבודות (כדי שעבודה חדשה לא תסתיר התנגשויות ישנות), כל אחת עם העבודה שממנה הגיעה.
 *
 * @param {{ jobId?: string, bookId?: string, onChanged?: () => void }} props
 */
export default function OcrConflictsPanel({ jobId, bookId, onChanged }) {
  const bookMode = !!bookId
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [openCount, setOpenCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [listError, setListError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [errors, setErrors] = useState({})

  const load = useCallback(async (offset) => {
    const scope = bookId ? `bookId=${encodeURIComponent(bookId)}&status=open` : `jobId=${encodeURIComponent(jobId)}`
    const res = await fetch(`${LIST_URL}?${scope}&limit=${PAGE_SIZE}&offset=${offset}`)
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.success) throw new Error(data.error || 'טעינת ההתנגשויות נכשלה')
    return data
  }, [jobId, bookId])

  const applyFirstPage = useCallback((data) => {
    setListError('')
    setItems(data.conflicts)
    setTotal(data.total)
    setOpenCount(data.openCount)
    setHasMore(data.hasMore)
  }, [])

  const reload = useCallback(async () => {
    try {
      applyFirstPage(await load(0))
    } catch (e) {
      setListError(e.message || 'טעינת ההתנגשויות נכשלה')
    } finally {
      setLoading(false)
    }
  }, [load, applyFirstPage])

  // טעינה ראשונית (וכשהיקף הרשימה משתנה): ה-state מתעדכן רק בתוך callback אסינכרוני, ותשובה מיושנת נזרקת
  useEffect(() => {
    let ignore = false
    load(0)
      .then((data) => { if (!ignore) applyFirstPage(data) })
      .catch((e) => { if (!ignore) setListError(e.message || 'טעינת ההתנגשויות נכשלה') })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [load, applyFirstPage])

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      // ברמת הספר הרשימה מסוננת ל"ממתינות" (open+applying) בשרת — מה שטופל כאן כבר יצא ממנה,
      // ולכן ההיסט הוא מספר הממתינות שנטענו (וסינון כפילויות למקרה שמישהו אחר טיפל במקביל)
      const offset = bookMode
        ? items.filter((c) => PENDING_CONFLICT_STATUSES.includes(c.status)).length
        : items.length
      const data = await load(offset)
      setItems((prev) => {
        const seen = new Set(prev.map((c) => c.id))
        return [...prev, ...data.conflicts.filter((c) => !seen.has(c.id))]
      })
      setTotal(data.total)
      setOpenCount(data.openCount)
      setHasMore(data.hasMore)
    } catch (e) {
      setListError(e.message || 'טעינת ההתנגשויות נכשלה')
    } finally {
      setLoadingMore(false)
    }
  }

  const act = async (conflict, action) => {
    setBusyId(conflict.id)
    setErrors((prev) => ({ ...prev, [conflict.id]: '' }))
    try {
      const body = action === 'apply'
        ? { action, expectedPageUpdatedAt: conflict.pageUpdatedAt }
        : { action }
      const res = await fetch(`${LIST_URL}/${encodeURIComponent(conflict.id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        // תשובת הפעולה לא כוללת את תאריך העבודה — שומרים את מה שנטען ברשימה
        setItems((prev) => prev.map((c) => (
          c.id === conflict.id ? { ...data.conflict, jobCreatedAt: data.conflict.jobCreatedAt ?? c.jobCreatedAt } : c
        )))
        setOpenCount((n) => Math.max(0, n - 1))
        onChanged?.()
        return
      }
      const message = data.error || 'הפעולה נכשלה'
      // העמוד נערך שוב / ההתנגשות טופלה בידי אחר — טוענים מחדש כדי להציג את המצב העדכני
      if (res.status === 409) await reload()
      setErrors((prev) => ({ ...prev, [conflict.id]: message }))
    } catch {
      setErrors((prev) => ({ ...prev, [conflict.id]: 'תקלה בתקשורת' }))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section aria-label="התנגשויות בקליטה" className="space-y-3 rounded-control border border-outline-variant p-3">
      <div>
        <h4 className="text-sm font-bold text-on-surface">
          {bookMode
            ? `התנגשויות בקליטה בספר${!loading ? ` (${openCount} ממתינות)` : ''}`
            : `התנגשויות בקליטה${!loading && total > 0 ? ` (${openCount} ממתינות מתוך ${total})` : ''}`}
        </h4>
        <p className="mt-1 text-xs text-on-surface-variant">
          {bookMode
            ? 'עמודים שנערכו אחרי שעבודת ה-OCR המקומי נוצרה, מכל העבודות של הספר — טקסט ה-OCR שלהם לא נכתב, כדי לא לדרוס את העריכה.'
            : 'עמודים שנערכו אחרי שהעבודה נוצרה — טקסט ה-OCR שלהם לא נכתב, כדי לא לדרוס את העריכה.'}
          {' '}אפשר לאמץ את טקסט ה-OCR או לשמור את הטקסט הקיים.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-4"><Loader size="sm" /></div>
      ) : (
        <>
          {listError && <p role="alert" className="text-sm text-error">{listError}</p>}
          {items.length === 0 && !listError && (
            <p className="text-sm text-on-surface-variant">{bookMode ? 'אין התנגשויות ממתינות.' : 'אין התנגשויות.'}</p>
          )}
          {items.length > 0 && (
            <ul className="space-y-2">
              {items.map((c) => (
                <OcrConflictItem
                  key={c.id}
                  conflict={c}
                  busy={busyId === c.id}
                  error={errors[c.id] || ''}
                  showJob={bookMode}
                  onApply={(conflict) => act(conflict, 'apply')}
                  onDismiss={(conflict) => act(conflict, 'dismiss')}
                />
              ))}
            </ul>
          )}
          {hasMore && (
            <Button variant="text" size="sm" fullWidth onClick={loadMore} loading={loadingMore}>
              טען עוד
            </Button>
          )}
        </>
      )}
    </section>
  )
}
