import Link from 'next/link'
import AppIcon from '@/components/ui/AppIcon'
import { cx } from '@/components/ui/cx'
import { FOCUS_RING } from '@/components/ui/focusRing'

export interface BreadcrumbItem {
  label: string
  // כשאין href — הפריט מוצג כעמוד הנוכחי (ללא קישור)
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  // פריסה בלבד (רווח מתחת וכו'); המראה — ברכיב
  className?: string
}

/**
 * פירורי הלחם של חנות התוספים — באותה שפה כמו פירורי המדריכים (components/docs/DocsBreadcrumbs):
 * רשימה סדורה בתוך nav בעל שם; הפריט האחרון הוא העמוד הנוכחי (aria-current, בלי קישור); המפריד —
 * chevron_left דקורטיבי (גופן האייקונים אינו מראה חיצים ב-RTL — השם הוא הכיוון הפיזי).
 * כל קישור — מטרת מגע של 44px. שם ארוך (שם תוסף) נחתך בשורה אחת עם "…", והשם המלא ב-title.
 */
export default function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="פירורי לחם" className={className}>
      <ol className="flex flex-wrap items-center gap-x-1 text-body-sm text-on-surface-variant">
        {items.map((item, index) => {
          const last = index === items.length - 1
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 max-w-full items-center gap-1">
              {item.href && !last ? (
                <Link
                  href={item.href}
                  prefetch={false}
                  className={cx(
                    'inline-flex min-h-(--touch-target) items-center rounded-sm underline-offset-4 transition-colors hover:text-primary hover:underline',
                    FOCUS_RING
                  )}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={last ? 'page' : undefined}
                  title={item.label}
                  className={cx('inline-flex min-h-(--touch-target) min-w-0 items-center', last && 'text-on-surface')}
                >
                  {/* השם האחרון הוא שם התוסף (טקסט המפתח, אולי באנגלית) — כיוון לפי התוכן, יישור לפי העמוד */}
                  <span dir="auto" className="truncate text-right">{item.label}</span>
                </span>
              )}
              {!last && <AppIcon name="chevron_left" className="shrink-0 text-base text-outline" />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
