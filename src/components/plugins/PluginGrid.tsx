import { Children, isValidElement, type ReactNode } from 'react'
import { cx } from '@/components/ui/cx'

/**
 * רשת כרטיסי התוספים — מקור אחד לעמודות ולרווחים בכל דפי החנות. רשימה סמנטית (ul/li): קורא
 * המסך מכריז "רשימה, N פריטים". כל ילד עוטף ב-li (ה-key של הילד עובר ל-li).
 *
 * columns — לפי הרוחב שהרשת מקבלת (לא לפי המסך):
 *   full    — רוחב התוכן המלא (כל התוספים, קטגוריה): 1 → sm:2 → lg:3 → 2xl:4
 *   sidebar — לצד סרגל צד (בית החנות מ-lg): 1 → sm:2 → xl:3
 * mobileRail — מתחת ל-md: שורה אחת בגלילה אופקית עם snap (שורת קטגוריה בבית החנות), בלי גלילה
 *   אופקית של הדף: השורה נמתחת עד קצות המסך (-mx של ה-gutter) ומחזירה את ה-gutter כריפוד.
 *   מ-md — רשת רגילה.
 * label — שם נגיש לרשימה, כשיש כמה רשתות בעמוד (aria-label); אחרת — labelledBy של כותרת.
 */
const COLUMNS = {
  full: 'sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4',
  sidebar: 'sm:grid-cols-2 xl:grid-cols-3'
} as const

const RAIL_COLUMNS = {
  full: 'md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4',
  sidebar: 'md:grid-cols-2 xl:grid-cols-3'
} as const

export type PluginGridColumns = keyof typeof COLUMNS

export default function PluginGrid({
  columns = 'full',
  mobileRail = false,
  label,
  labelledBy,
  className,
  children
}: {
  columns?: PluginGridColumns
  mobileRail?: boolean
  label?: string
  labelledBy?: string
  className?: string
  children: ReactNode
}) {
  const items = Children.toArray(children).filter(isValidElement)
  const list = mobileRail
    ? cx(
        // נייד: מסילה אופקית; md+: רשת
        'flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain scroll-px-(--page-gutter) pb-2',
        '-mx-(--page-gutter) px-(--page-gutter) scrollbar-thin',
        'md:mx-0 md:grid md:snap-none md:gap-5 md:overflow-visible md:px-0 md:pb-0',
        RAIL_COLUMNS[columns]
      )
    : cx('grid grid-cols-1 gap-4 md:gap-5', COLUMNS[columns])

  return (
    <ul aria-label={label} aria-labelledby={labelledBy} className={cx(list, className)}>
      {items.map((child) => (
        <li
          key={child.key}
          className={mobileRail ? 'w-[min(20rem,82%)] shrink-0 snap-start md:w-auto' : undefined}
        >
          {child}
        </li>
      ))}
    </ul>
  )
}
