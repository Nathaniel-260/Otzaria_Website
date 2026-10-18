import Chip from '@/components/ui/Chip'
import { cx } from '@/components/ui/cx'
import type { CategoryRef } from '@/components/plugins/types'

/**
 * קטגוריות ותגיות של התוסף — שבבים מקושרים (ui/Chip). קטגוריה → /plugins/category/<slug>;
 * תגית → /plugins?tag=<tag> (הפניה קיימת בבית החנות). לא מרנדר דבר כשאין אף אחד מהם.
 * gap-y-2.5 — כדי שמטרות המגע (44px) של שבבים בשורות סמוכות לא יחפפו.
 */
export default function PluginTaxonomy({ categories = [], tags = [], className }: {
  categories?: CategoryRef[]
  tags?: string[]
  className?: string
}) {
  if (categories.length === 0 && tags.length === 0) return null
  return (
    <div className={cx('flex flex-col gap-4', className)}>
      {categories.length > 0 && (
        <div>
          <p className="mb-2 text-body-sm text-on-surface-variant">מופיע בקטגוריות:</p>
          <ul className="flex flex-wrap gap-x-2 gap-y-2.5">
            {categories.map((category) => (
              <li key={category.slug} className="max-w-full">
                <Chip href={`/plugins/category/${category.slug}`} icon="category">{category.name}</Chip>
              </li>
            ))}
          </ul>
        </div>
      )}
      {tags.length > 0 && (
        <div>
          <p className="mb-2 text-body-sm text-on-surface-variant">תגיות</p>
          <ul className="flex flex-wrap gap-x-2 gap-y-2.5">
            {tags.map((tag) => (
              <li key={tag} className="max-w-full">
                <Chip href={`/plugins?tag=${encodeURIComponent(tag)}`}>{tag}</Chip>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
