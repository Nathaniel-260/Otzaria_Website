import type { ReactNode } from 'react'
import SectionHeading from '@/components/ui/SectionHeading'
import { cx } from '@/components/ui/cx'

/**
 * פתיחת אזור התוצאות ברשימה: כותרת האזור (h2) בצד ההתחלה, ובקצה הסוף — באותה שורה ומיושר
 * לתחתית הכותרת (כמו קישור "הכול" בבית החנות, S10) — מונה התוצאות ופעולה אופציונלית ("נקה סינון").
 * בנייד — המונה מתחת לכותרת.
 *
 * count מוכרז לקורא המסך בכל שינוי (aria-live="polite") — הסינון מתבצע בלי טעינת דף.
 * Server-safe (בלי hooks).
 */
export default function ResultsHeading({
  id,
  title,
  count,
  action,
  className
}: {
  id: string
  title: ReactNode
  count: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cx('mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-6 md:mb-6', className)}>
      <SectionHeading as="h2" id={id} title={title} size="md" align="start" spacing="none" />
      <div className="flex min-h-(--touch-target) flex-wrap items-center gap-x-3 gap-y-1 sm:justify-end">
        <p aria-live="polite" className="text-body-sm text-on-surface-variant tabular-nums">
          {count}
        </p>
        {action}
      </div>
    </div>
  )
}
