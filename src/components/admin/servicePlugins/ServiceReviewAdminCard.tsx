'use client'

import Link from 'next/link'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Ltr from '@/components/ui/Ltr'
import ServiceStatusBadge from '@/components/plugins/service/ServiceStatusBadge'
import { KIND_LABELS } from '@/components/plugins/service/serviceSubmissionLogic'
import { formatDateWithTime } from '@/lib/formatDate'
import { ERROR_CLASS_LABELS, type AdminAction, type AdminReview } from './servicePluginsAdminLogic'

const ACTION_LABELS: Record<AdminAction, string> = {
  start: 'בחר בתוסף והתחל בדיקה',
  emergency: 'חריגת חירום (21 יום)',
  retry: 'ניסיון חוזר',
  cancel: 'ביטול',
  rollback: 'חזרה לגרסה הקודמת'
}

const ACTION_ICONS: Record<AdminAction, string> = {
  start: 'play_arrow',
  emergency: 'lock_open',
  retry: 'restart_alt',
  cancel: 'cancel',
  rollback: 'undo'
}

const ACTION_VARIANTS = { start: 'filled', emergency: 'tonal', retry: 'tonal', cancel: 'outlined', rollback: 'outlined' } as const

/** כרטיס הגשה בניהול: מי, מה, מתי, המצב, תקלה אחרונה — והפעולות המותרות */
export default function ServiceReviewAdminCard({ review, actions, busyAction, onAction }: {
  review: AdminReview
  actions: AdminAction[]
  /** הפעולה שרצה כעת על ההגשה הזו */
  busyAction: AdminAction | null
  onAction: (review: AdminReview, action: AdminAction) => void
}) {
  const operatorError = review.status === 'needs_operator' || review.lastError?.class === 'operator'
  return (
    <Card as="li" tone="raised" padding="md" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={`/plugins/${review.pluginId}/service`} prefetch={false} className="text-title-md text-primary hover:underline" dir="auto">
            {review.pluginName ?? 'תוסף שנמחק'}
          </Link>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            {KIND_LABELS[review.kind] ?? review.kind} · תוסף <Ltr>{review.pluginVersion}</Ltr>
            {review.serviceVersion ? <> · שירות <Ltr>{review.serviceVersion}</Ltr></> : null}
            {review.ownerName ? <> · מפתח: <bdi>{review.ownerName}</bdi></> : null}
          </p>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            הוגש <Ltr>{formatDateWithTime(review.createdAt)}</Ltr>
            {review.selectedAt ? <> · נבחר <Ltr>{formatDateWithTime(review.selectedAt)}</Ltr></> : null}
            {review.attempts > 0 ? <> · ניסיונות: <Ltr>{String(review.attempts)}</Ltr></> : null}
            {review.nextAttemptAt ? <> · ניסיון הבא <Ltr>{formatDateWithTime(review.nextAttemptAt)}</Ltr></> : null}
          </p>
        </div>
        <ServiceStatusBadge status={review.status} size="md" />
      </div>

      {review.kind === 'service' && review.cooldown?.blocked && review.status === 'pending_admin' && (
        <p className="text-body-sm text-on-surface-variant">
          תקופת 21 הימים פעילה
          {review.cooldown.nextAllowedAt ? <> עד <Ltr>{formatDateWithTime(review.cooldown.nextAllowedAt)}</Ltr></> : null}.
          {review.adminException
            ? ' אושרה חריגה חד-פעמית — היא תיצרך בהתחלת הבדיקה.'
            : ' התחלה לפני המועד דורשת חריגת חירום עם סיבה (החריגה אינה עוקפת שום בדיקה).'}
        </p>
      )}

      {operatorError && (
        <div role="note" className="rounded-(--radius-control) bg-warning-container p-3 text-body-sm text-on-warning-container">
          <p className="font-semibold">תקלה תפעולית — יש להעביר לאחראי השרת</p>
          {review.lastError && (
            <p className="mt-1 break-words" dir="auto">
              <Ltr className="font-mono">{review.lastError.code}</Ltr>
              {review.lastError.message ? <> — {review.lastError.message}</> : null}
            </p>
          )}
        </div>
      )}

      {!operatorError && review.lastError && !['approved', 'rejected', 'cancelled'].includes(review.status) && (
        <p className="text-body-sm text-on-surface-variant" dir="auto">
          תקלה אחרונה ({ERROR_CLASS_LABELS[review.lastError.class] ?? review.lastError.class}): <Ltr className="font-mono">{review.lastError.code}</Ltr>
        </p>
      )}

      {review.decision !== null && review.status !== 'cancelled' && (
        <p className="text-body-sm text-on-surface-variant">החלטת הבדיקה: {review.decision === 1 ? 'אושר' : 'נדחה (הדוח נשלח למפתח)'}</p>
      )}

      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <Button
              key={action}
              variant={ACTION_VARIANTS[action]}
              size="sm"
              icon={ACTION_ICONS[action]}
              loading={busyAction === action}
              disabled={busyAction !== null && busyAction !== action}
              onClick={() => onAction(review, action)}
            >
              {ACTION_LABELS[action]}
            </Button>
          ))}
        </div>
      )}
    </Card>
  )
}
