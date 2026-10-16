import Card from '@/components/ui/Card'
import AppIcon from '@/components/ui/AppIcon'
import type { GuideNavItem } from './docsNav'

function AdjacentCard({ item, label, direction }: { item: GuideNavItem; label: string; direction: 'prev' | 'next' }) {
  const next = direction === 'next'
  return (
    <Card
      href={`/docs/${item.slug}`}
      padding="md"
      rel={direction}
      className={`flex h-full items-center gap-3 ${next ? 'flex-row-reverse' : ''}`}
    >
      {/* גופן האייקונים מראה את החיצים ב-RTL: chevron_right מוצג שמאלה ("הבא"), chevron_left ימינה ("הקודם") */}
      <AppIcon name={next ? 'chevron_right' : 'chevron_left'} className="text-2xl text-primary" />
      <span className={`min-w-0 flex-1 ${next ? 'text-end' : ''}`}>
        <span className="block text-label-md text-on-surface-variant">{label}</span>
        <span className="block text-title-md text-on-surface">{item.title}</span>
      </span>
    </Card>
  )
}

/** "הקודם" / "הבא" בסדר המדריך למשתמש (סדר סרגל הוויקי). בלי שניהם — לא מרונדר. */
export default function DocsPrevNext({ prev, next, className }: {
  prev: GuideNavItem | null
  next: GuideNavItem | null
  className?: string
}) {
  if (!prev && !next) return null
  return (
    <nav aria-label="דפי המדריך" className={className}>
      <ul className="grid gap-3 sm:grid-cols-2">
        {prev && <li><AdjacentCard item={prev} label="הקודם" direction="prev" /></li>}
        {next && <li className="sm:col-start-2"><AdjacentCard item={next} label="הבא" direction="next" /></li>}
      </ul>
    </nav>
  )
}
