import { cx } from '@/components/ui/cx'
import { FOCUS_RING_INSET } from '@/components/ui/focusRing'
import DocsDisclosure from './DocsDisclosure'
import type { TocItem } from './docsNav'

function TocLinks({ items }: { items: TocItem[] }) {
  return (
    <ul className="space-y-0.5">
      {items.map((item) => (
        <li key={item.href}>
          <a
            href={item.href}
            className={cx(
              'flex min-h-(--touch-target) items-center rounded-control border-s-2 border-transparent px-3 py-1.5 text-body-sm text-on-surface-variant transition-colors hover:border-primary hover:bg-surface-selected hover:text-on-surface lg:min-h-0',
              FOCUS_RING_INSET
            )}
          >
            {item.label}
          </a>
        </li>
      ))}
    </ul>
  )
}

/**
 * תוכן העניינים של דף מדריך ("בעמוד זה" / "תוכן עניינים" — התווית של כל דף נשמרת).
 * variant:
 *   panel  — במסך רחב: רשימה דביקה בצד (nav בעל שם).
 *   folded — בנייד/טבלט: מקפל סגור מעל התוכן.
 * הדף מרנדר את שניהם ומסתיר כל אחד ברוחב שאינו שלו (hidden xl:block / xl:hidden).
 */
export default function DocsToc({ title, items, variant, className }: {
  title: string
  items: TocItem[]
  variant: 'panel' | 'folded'
  className?: string
}) {
  if (items.length === 0) return null
  if (variant === 'folded') {
    return (
      <nav aria-label={title} className={className}>
        <DocsDisclosure label={title} icon="toc">
          <TocLinks items={items} />
        </DocsDisclosure>
      </nav>
    )
  }
  return (
    <nav aria-label={title} className={className}>
      <p className="mb-2 px-3 text-label-md text-on-surface-variant">{title}</p>
      <TocLinks items={items} />
    </nav>
  )
}
