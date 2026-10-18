import type { ReactNode } from 'react'
import Card from './Card'
import IconTile from './IconTile'
import { cx } from './cx'

/**
 * מצב ריק / שגיאה / "לא נמצא" — כרטיס ממורכז: אריח אייקון, כותרת, הסבר ופעולות.
 *
 * as — רמת הכותרת (h2 ברירת מחדל; h1 כשזה כל העמוד — "הקטגוריה לא נמצאה").
 * tone — default: כרטיס (surface); plain: בלי משטח (בתוך אזור שכבר על כרטיס).
 * role — 'status' כשהמצב נוצר בעקבות פעולה (סינון שהחזיר אפס תוצאות), כדי שקורא המסך יכריז.
 * children — תוכן נוסף מתחת לפעולות (למשל שבבי קטגוריות מוצעות).
 */
export default function EmptyState({
  icon = 'extension',
  title,
  description,
  actions,
  as: Heading = 'h2',
  tone = 'default',
  role,
  id,
  className,
  children
}: {
  icon?: string
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  as?: 'h1' | 'h2' | 'h3'
  tone?: 'default' | 'plain'
  role?: 'status' | 'alert'
  id?: string
  className?: string
  children?: ReactNode
}) {
  const body = (
    <>
      <IconTile icon={icon} size="lg" />
      {/* h1 (העמוד כולו הוא המצב — "הקטגוריה לא נמצאה") — כמו כל כותרת עמוד באתר: גופן התצוגה, 400.
          h2/h3 — כותרת כרטיס (Assistant). */}
      <Heading
        id={id}
        className={cx(
          'mt-5 text-balance text-on-surface',
          Heading === 'h1' ? 'font-display text-headline-md md:text-headline-lg' : 'text-title-lg'
        )}
      >
        {title}
      </Heading>
      {description && (
        <p className="mt-2 max-w-measure text-balance text-body-md text-on-surface-variant">{description}</p>
      )}
      {actions && <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{actions}</div>}
      {children && <div className="mt-6 w-full">{children}</div>}
    </>
  )
  const layout = 'flex flex-col items-center px-6 py-12 text-center md:py-16'
  if (tone === 'plain') {
    return <div role={role} className={cx(layout, className)}>{body}</div>
  }
  return (
    <Card role={role} className={cx(layout, className)}>
      {body}
    </Card>
  )
}
