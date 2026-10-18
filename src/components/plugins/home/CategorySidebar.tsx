import Link from 'next/link'
import AppIcon from '@/components/ui/AppIcon'
import Card from '@/components/ui/Card'
import { cx } from '@/components/ui/cx'
import { FOCUS_RING_INSET } from '@/components/ui/focusRing'
import type { PluginCategorySummary } from '@/components/plugins/types'
import { categoriesShowIcons, categoryIcon } from './categoryIcons'

const ITEM = cx(
  'flex min-h-(--touch-target) items-center gap-3 rounded-(--radius-control) px-3 py-2',
  'text-body-md text-on-surface transition-colors hover:bg-surface-selected hover:text-primary',
  FOCUS_RING_INSET
)
const COUNT = 'shrink-0 text-label-md font-normal tabular-nums text-on-surface-variant'

/**
 * סרגל הקטגוריות של בית החנות (מ-lg): כרטיס דביק לצד התוכן. דביק מתחת לכותרת האתר הדביקה
 * (top = גובה הכותרת + רווח), ובגובה המסך הפנוי לכל היותר — רשימה ארוכה נגללת בתוכו.
 * כל שורה: [אייקון] שם ........ מונה — המונים מיושרים לקצה, לסריקה אנכית מהירה.
 * "כל התוספים" — בתחתית, מופרד בקו דק.
 */
export default function CategorySidebar({ categories, totalPlugins, className }: {
  categories: PluginCategorySummary[]
  totalPlugins: number
  className?: string
}) {
  const showIcons = categoriesShowIcons(categories)
  const headingId = 'store-home-categories-heading'
  return (
    <aside
      className={cx(
        'hidden lg:sticky lg:top-[calc(var(--site-header-height)+1rem)] lg:block lg:self-start',
        'lg:max-h-[calc(100dvh-var(--site-header-height)-2rem)] lg:overflow-y-auto scrollbar-thin',
        className
      )}
    >
      <Card as="div" padding="sm">
        <nav aria-labelledby={headingId}>
          <h2 id={headingId} className="px-3 pt-1 pb-2 text-label-lg text-on-surface-variant">
            קטגוריות
          </h2>
          <ul className="flex flex-col gap-0.5">
            {categories.map((category) => (
              <li key={category.id}>
                <Link href={`/plugins/category/${category.slug}`} prefetch={false} className={ITEM}>
                  {showIcons && (
                    <AppIcon name={categoryIcon(category)} className="shrink-0 text-xl text-primary" />
                  )}
                  <span className="min-w-0 flex-1 truncate" title={category.name}>{category.name}</span>{' '}
                  <span className={COUNT}>{category.pluginCount.toLocaleString('he-IL')}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-2 border-t border-outline-variant pt-2">
            <Link href="/plugins/all" prefetch={false} className={ITEM}>
              {showIcons && <AppIcon name="apps" className="shrink-0 text-xl text-primary" />}
              <span className="min-w-0 flex-1 truncate">כל התוספים</span>{' '}
              <span className={COUNT}>{totalPlugins.toLocaleString('he-IL')}</span>
            </Link>
          </div>
        </nav>
      </Card>
    </aside>
  )
}
