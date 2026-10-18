import Chip from '@/components/ui/Chip'
import { cx } from '@/components/ui/cx'
import type { PluginCategorySummary } from '@/components/plugins/types'
import { categoriesShowIcons, categoryIcon } from './categoryIcons'

/**
 * ניווט הקטגוריות מתחת ל-lg (שם אין סרגל צד): שורת שבבים.
 * בנייד — שורה אחת שנגללת בתוך עצמה בלבד: נמתחת עד קצות המסך (-mx של ה-gutter) ומחזירה את
 * ה-gutter כריפוד, כך שהשבב הראשון מיושר לטקסט שמעליו והאחרון לא נחתך בקצה. מ-md (יש מקום) —
 * השבבים נשברים לשורות, בלי גלילה. "כל התוספים" — אחרון.
 */
export default function CategoryChipsNav({ categories, totalPlugins, className }: {
  categories: PluginCategorySummary[]
  totalPlugins: number
  className?: string
}) {
  const showIcons = categoriesShowIcons(categories)
  return (
    <nav aria-label="קטגוריות" className={cx('lg:hidden', className)}>
      <ul
        className={cx(
          'flex gap-x-2 gap-y-2.5',
          // נייד: מסילה; py-1 — מקום למטרת המגע (44px) של השבב ולטבעת הפוקוס בתוך אזור הגלילה
          '-mx-(--page-gutter) overflow-x-auto overscroll-x-contain px-(--page-gutter) py-1 scrollbar-thin',
          'md:mx-0 md:flex-wrap md:overflow-visible md:px-0'
        )}
      >
        {categories.map((category) => (
          <li key={category.id} className="shrink-0">
            <Chip
              href={`/plugins/category/${category.slug}`}
              icon={showIcons ? categoryIcon(category) : undefined}
              count={category.pluginCount}
            >
              {category.name}
            </Chip>
          </li>
        ))}
        <li className="shrink-0">
          <Chip href="/plugins/all" count={totalPlugins}>כל התוספים</Chip>
        </li>
      </ul>
    </nav>
  )
}
