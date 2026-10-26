'use client'

import { useCallback, useEffect, useState } from 'react'
import FormNote from '@/components/plugins/form/FormNote'
import { useDialog } from '@/components/providers/DialogContext'
import Button from '@/components/ui/Button'
import Loader from '@/components/ui/Loader'
import Ltr from '@/components/ui/Ltr'
import { apiErrorMessages } from '@/components/plugins/service/serviceSubmissionLogic'
import { formatDateWithTime } from '@/lib/formatDate'
import EmergencyExceptionDialog from './EmergencyExceptionDialog'
import ServiceReviewAdminCard from './ServiceReviewAdminCard'
import {
  adminActionsFor,
  groupAdminReviews,
  quotaPause,
  rollbackReviewIds,
  type AdminAction,
  type AdminResponse,
  type AdminReview
} from './servicePluginsAdminLogic'

type Load = { phase: 'loading' } | { phase: 'ready'; data: AdminResponse } | { phase: 'error'; message: string }

async function fetchAdmin(): Promise<Load> {
  try {
    const response = await fetch('/api/service-plugins/admin', { cache: 'no-store' })
    if (response.status === 404) return { phase: 'error', message: 'תוספי השירות כבויים באתר (SERVICE_PLUGINS_ENABLED).' }
    if (!response.ok) return { phase: 'error', message: 'לא הצלחנו לטעון את רשימת תוספי השירות' }
    return { phase: 'ready', data: (await response.json()) as AdminResponse }
  } catch {
    return { phase: 'error', message: 'לא הצלחנו לטעון את רשימת תוספי השירות' }
  }
}

const CONFIRMS: Partial<Record<AdminAction, { title: string; message: string; confirmText: string }>> = {
  start: {
    title: 'בחירה והתחלת בדיקה',
    message:
      'הבחירה היא אישור פרסום מותנה: אם כל הבדיקות יעברו, ההגשה הזו תפורסם אוטומטית — בלי לחיצה נוספת ובלי צורך לקרוא קוד. ' +
      'דחייה תשלח דוח למפתח ואינה דורשת החלטה שלך. בדיקת שירות מתחילה את מחזור 21 הימים, גם אם תידחה או תבוטל.',
    confirmText: 'בחר והתחל בדיקה'
  },
  cancel: {
    title: 'ביטול ההגשה',
    message: 'לבטל את ההגשה? המפתח יצטרך להגיש מחדש. ביטול אחרי תחילת בדיקת שירות אינו מאפס את 21 הימים.',
    confirmText: 'בטל הגשה'
  },
  retry: {
    title: 'ניסיון חוזר',
    message: 'להחזיר את ההגשה לתור? יש לוודא קודם שאחראי השרת טיפל בתקלה התפעולית. אין בכך מחזור 21 יום חדש.',
    confirmText: 'החזר לתור'
  },
  rollback: {
    title: 'חזרה לגרסה הקודמת',
    message: 'להחזיר בחנות את השירות ואת התוסף הכלול בו לגרסה הקודמת? אינו משנה התקנות קיימות ואינו מאפס את 21 הימים.',
    confirmText: 'חזור לגרסה הקודמת'
  }
}

function ReviewGroup({ title, description, reviews, rollbackIds, busy, onAction }: {
  title: string
  description?: string
  reviews: AdminReview[]
  rollbackIds: Set<string>
  busy: { id: string; action: AdminAction } | null
  onAction: (review: AdminReview, action: AdminAction) => void
}) {
  if (reviews.length === 0) return null
  return (
    <section className="space-y-3">
      <h2 className="text-title-lg text-on-surface">{title} ({reviews.length})</h2>
      {description && <p className="text-body-sm text-on-surface-variant">{description}</p>}
      <ul className="flex flex-col gap-3">
        {reviews.map((review) => (
          <ServiceReviewAdminCard
            key={review.id}
            review={review}
            actions={adminActionsFor(review, rollbackIds)}
            busyAction={busy?.id === review.id ? busy.action : null}
            onAction={onAction}
          />
        ))}
      </ul>
    </section>
  )
}

/** לשונית "תוספי שירות" בניהול התוספים: בחירה והתחלת בדיקה, תקלות תפעוליות, חריגות וחזרה לאחור */
export default function ServicePluginsAdmin() {
  const { showAlert, showConfirm } = useDialog() as {
    showAlert: (title: string, message: string) => void
    showConfirm: (title: string, message: string, confirmText?: string) => Promise<boolean>
  }
  const [load, setLoad] = useState<Load>({ phase: 'loading' })
  const [busy, setBusy] = useState<{ id: string; action: AdminAction } | null>(null)
  const [exceptionFor, setExceptionFor] = useState<AdminReview | null>(null)

  const reload = useCallback(async () => setLoad(await fetchAdmin()), [])

  useEffect(() => {
    let cancelled = false
    fetchAdmin().then((next) => {
      if (!cancelled) setLoad(next)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const post = async (review: AdminReview, action: AdminAction, reason?: string): Promise<boolean> => {
    setBusy({ id: review.id, action })
    try {
      const response = await fetch(`/api/service-plugins/admin/${encodeURIComponent(review.pluginId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, jobId: review.id, ...(reason ? { reason } : {}) })
      })
      if (!response.ok) {
        let body: unknown = null
        try { body = await response.json() } catch { /* גוף לא JSON */ }
        showAlert('הפעולה נכשלה', apiErrorMessages(body, 'הפעולה נכשלה').join('\n'))
        return false
      }
      return true
    } catch {
      showAlert('הפעולה נכשלה', 'שגיאת רשת — נסו שוב')
      return false
    } finally {
      setBusy(null)
      await reload()
    }
  }

  const handleAction = async (review: AdminReview, action: AdminAction) => {
    if (action === 'emergency') {
      setExceptionFor(review)
      return
    }
    const confirm = CONFIRMS[action]
    if (confirm && !(await showConfirm(confirm.title, `${review.pluginName ?? ''}\n\n${confirm.message}`, confirm.confirmText))) return
    await post(review, action)
  }

  if (load.phase === 'loading') return <Loader size="md" label="טוען תוספי שירות…" className="mx-auto my-12" />
  if (load.phase === 'error') {
    return (
      <div className="space-y-3 rounded-(--card-radius) bg-surface-container p-6 text-center">
        <p className="text-body-md text-on-surface">{load.message}</p>
        <Button variant="outlined" size="sm" icon="refresh" onClick={() => void reload()}>נסה שוב</Button>
      </div>
    )
  }

  const { data } = load
  const groups = groupAdminReviews(data.reviews)
  const rollbackIds = rollbackReviewIds(data.reviews)
  const pausedUntil = quotaPause(data.control)

  return (
    <div className="space-y-8">
      <FormNote icon="shield">
        <p>
          ההגנה העיקרית היא זהות הקבצים (התאמה ל-Release ולתוסף שבתוך המתקין), אישור הבנייה של GitHub Actions וסורקי
          {' '}הנוזקות. סקירת המקור בידי AI חלקית מטבעה — היא מכוונת לנקודות סיכון, אך אינה ערובה.
        </p>
        <p className="mt-1.5">
          "בחר בתוסף והתחל בדיקה" הוא אישור הפרסום היחיד: אם הבדיקות עוברות — ההגשה מתפרסמת אוטומטית. אין עקיפה של ממצא אבטחה.
        </p>
      </FormNote>

      {pausedUntil && (
        <div role="status" className="rounded-(--card-radius) bg-warning-container p-4 text-body-sm text-on-warning-container">
          תור הסקירה מושהה עד <Ltr>{formatDateWithTime(pausedUntil)}</Ltr> בגלל מכסת הסקירה. הבדיקות ימשיכו אוטומטית — אין צורך בפעולה.
        </div>
      )}

      {data.reviews.length === 0 && <p className="text-body-md text-on-surface-variant">אין הגשות של תוספי שירות.</p>}

      <ReviewGroup title="ממתינים לבחירה" reviews={groups.pending} rollbackIds={rollbackIds} busy={busy} onAction={handleAction} />
      <ReviewGroup
        title="תקלות תפעוליות"
        description="אלה אינן דחיות: הבדיקה נעצרה בגלל תקלה בשרת הבדיקה. יש להעביר לאחראי השרת, ואחרי הטיפול — ניסיון חוזר."
        reviews={groups.operator}
        rollbackIds={rollbackIds}
        busy={busy}
        onAction={handleAction}
      />
      <ReviewGroup title="בבדיקה" reviews={groups.inProgress} rollbackIds={rollbackIds} busy={busy} onAction={handleAction} />
      <ReviewGroup
        title="טיוטות שטרם הוגשו"
        description="המפתח עדיין מעלה קבצים. טיוטה לא גמורה מתבטלת אוטומטית אחרי 24 שעות."
        reviews={groups.notSubmitted}
        rollbackIds={rollbackIds}
        busy={busy}
        onAction={handleAction}
      />
      <ReviewGroup title="הסתיימו לאחרונה" reviews={groups.finished} rollbackIds={rollbackIds} busy={busy} onAction={handleAction} />

      {exceptionFor && (
        <EmergencyExceptionDialog
          pluginName={exceptionFor.pluginName ?? ''}
          busy={busy?.id === exceptionFor.id && busy.action === 'emergency'}
          onClose={() => setExceptionFor(null)}
          onSubmit={async (reason) => {
            const ok = await post(exceptionFor, 'emergency', reason)
            if (ok) {
              setExceptionFor(null)
              showAlert('החריגה אושרה', 'כעת אפשר ללחוץ "בחר בתוסף והתחל בדיקה". החריגה תיצרך בהתחלת הבדיקה.')
            }
          }}
        />
      )}
    </div>
  )
}
