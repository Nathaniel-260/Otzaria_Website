'use client'

import { useState } from 'react'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Ltr from '@/components/ui/Ltr'
import { formatBytes, formatDateTime, rejectionReasonLabel } from './ocrJobView'

const shortSha = (sha) => (typeof sha === 'string' ? sha.slice(0, 12) : '')

/**
 * תוצאות של עבודת OCR מקומי שלא הוחלו:
 * - resultConflicts — תוצאה נוספת עם hash שונה שהגיעה אחרי שכבר ננעלה תוצאה. הקובץ נשמר בשרת
 *   עד שמנהל מסמן "נבדק" (reviewedAt); רק אז הניקוי השעתי רשאי למחוק אותו.
 * - resultRejections — קבצי תוצאה שנדחו בקליטה (פגומים / לא תקינים / אחרי סגירה). לבירור בלבד;
 *   נמחקים אוטומטית אחרי 30 יום.
 *
 * @param {{ job: any, onChanged?: () => void }} props
 */
export default function LocalResultIssues({ job, onChanged }) {
  const conflicts = Array.isArray(job.resultConflicts) ? job.resultConflicts : []
  const rejections = Array.isArray(job.resultRejections) ? job.resultRejections : []
  if (conflicts.length === 0 && rejections.length === 0) return null

  return (
    <section aria-label="תוצאות שלא הוחלו" className="space-y-3 rounded-control border border-outline-variant p-3">
      {conflicts.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-on-surface">תוצאות מתנגשות ({conflicts.length})</h4>
          <p className="text-xs text-on-surface-variant">
            המחשב המקומי שלח תוצאה נוספת ושונה אחרי שהתוצאה הראשונה כבר התקבלה. היא לא הוחלה, והקובץ
            נשמר בשרת לבדיקה. אחרי סימון &quot;נבדק&quot; הקובץ יימחק בניקוי האוטומטי.
          </p>
          <ul className="space-y-2">
            {conflicts.map((c) => (
              <ResultConflictRow key={c.sha256} jobId={job.id} conflict={c} onChanged={onChanged} />
            ))}
          </ul>
        </div>
      )}

      {rejections.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-on-surface">תוצאות שנדחו ({rejections.length})</h4>
          <ul className="space-y-2">
            {rejections.map((r, i) => (
              <li key={`${r.sha256}-${i}`} className="rounded-control bg-surface-container p-2 text-sm">
                <p className="text-on-surface">{rejectionReasonLabel(r.reason)}</p>
                <p className="text-xs text-on-surface-variant">
                  התקבלה {formatDateTime(r.receivedAt)}
                  {r.bytes != null && <> · <Ltr>{formatBytes(r.bytes)}</Ltr></>}
                  {' · '}
                  <Ltr className="font-mono">{shortSha(r.sha256)}</Ltr>
                </p>
                {r.details && (
                  <p dir="ltr" className="mt-1 whitespace-pre-wrap break-words text-start font-mono text-xs text-on-surface-variant">
                    {r.details}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function ResultConflictRow({ jobId, conflict, onChanged }) {
  const [reviewedAt, setReviewedAt] = useState(conflict.reviewedAt || null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const markReviewed = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/admin/books/ocr/result-conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, sha256: conflict.sha256 }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        setReviewedAt(data.reviewedAt || new Date().toISOString())
        onChanged?.()
      } else {
        setError(data.error || 'הסימון נכשל')
      }
    } catch {
      setError('תקלה בתקשורת')
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-control bg-surface-container p-2 text-sm">
      <div>
        <p className="text-on-surface">
          התקבלה {formatDateTime(conflict.receivedAt)}
          {conflict.bytes != null && <> · <Ltr>{formatBytes(conflict.bytes)}</Ltr></>}
        </p>
        <p className="text-xs text-on-surface-variant">
          <Ltr className="font-mono">{shortSha(conflict.sha256)}</Ltr>
        </p>
        {error && <p role="alert" className="text-xs text-error">{error}</p>}
      </div>
      {reviewedAt ? (
        <Badge tone="success" icon="check">נבדק</Badge>
      ) : (
        <Button variant="tonal" size="sm" icon="fact_check" onClick={markReviewed} loading={busy}>
          סמן כנבדק
        </Button>
      )}
    </li>
  )
}
