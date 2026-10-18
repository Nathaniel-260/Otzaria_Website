import type { ReactNode } from 'react'
import SectionHeading from '@/components/ui/SectionHeading'
import { cx } from '@/components/ui/cx'

/**
 * אזור בגוף עמוד התוסף (מתחת לקפל): <section> בעל שם, שנפתח ב-h2 בשפת האתר (גופן התצוגה + קישוט,
 * מיושר להתחלה — S9), ורווח קבוע בין הכותרת לתוכן (S11: mb-5 md:mb-6). הרווח בין אזורים — אצל
 * ההורה (gap אחד לכל העמוד).
 * action — פעולה שקטה בקצה הסוף של שורת הכותרת (S10), מיושרת לתחתית הכותרת.
 */
export default function DetailSection({ id, title, action, className, children }: {
  id: string
  title: ReactNode
  action?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section aria-labelledby={id} className={cx('min-w-0', className)}>
      <div className="mb-5 flex items-end justify-between gap-4 md:mb-6">
        <SectionHeading id={id} title={title} size="md" align="start" spacing="none" />
        {action}
      </div>
      {children}
    </section>
  )
}
