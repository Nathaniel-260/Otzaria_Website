import type { ReactNode } from 'react'
import Button from '@/components/ui/Button'
import IconTile from '@/components/ui/IconTile'
import SectionHeading from '@/components/ui/SectionHeading'

export interface StoreHomeSectionAction {
  href: string
  label: string
  count?: number
}

/**
 * אזור בעמודת התוכן של בית החנות ("תוספים נבחרים", שורת קטגוריה). אותו מבנה בכל אזור, כדי
 * שהעין תמצא כל פריט באותו מקום:
 *
 *   [אריח]  כותרת (h2)                                   לכל הקטגוריה (20) ‹
 *           תיאור קצר (שורה שקטה)
 *   ───── רשת הכרטיסים ─────
 *
 * הקישור "הכול" תמיד בקצה הסוף (שמאל), מיושר לתחתית בלוק הכותרת, ולא נשבר מתחתיה גם בנייד.
 * icon — רק כשלקטגוריות יש אייקונים (ראו categoriesShowIcons); בלעדיו הכותרת צמודה לקצה.
 * הרווח בין בלוק הכותרת לכרטיסים: 24px, ומ-md 32px. הוא חצי מהרווח בין אזורים (48/64px, אצל ההורה —
 * gap אחד לכל העמוד), כדי שהכותרת תיקרא כשייכת לכרטיסים שלה ולא לאזור שמעליה.
 */
export default function StoreHomeSection({ id, title, description, icon, action, className, children }: {
  id: string
  title: string
  description?: string
  icon?: string
  action?: StoreHomeSectionAction
  className?: string
  children: ReactNode
}) {
  return (
    <section aria-labelledby={id} className={className}>
      <div className="mb-6 flex items-end justify-between gap-4 md:mb-8">
        <div className="flex min-w-0 items-start gap-3">
          {icon && <IconTile icon={icon} size="sm" />}
          <div className="min-w-0">
            <SectionHeading as="h2" id={id} title={title} size="md" align="start" spacing="none" />
            {description && (
              <p className="mt-3 max-w-measure text-body-md text-on-surface-variant">{description}</p>
            )}
          </div>
        </div>
        {action && (
          <Button
            href={action.href}
            variant="text"
            size="sm"
            iconEnd="chevron_left"
            className="shrink-0 whitespace-nowrap"
          >
            {action.label}{' '}
            {typeof action.count === 'number' && (
              <span className="tabular-nums">({action.count.toLocaleString('he-IL')})</span>
            )}
          </Button>
        )}
      </div>
      {children}
    </section>
  )
}
