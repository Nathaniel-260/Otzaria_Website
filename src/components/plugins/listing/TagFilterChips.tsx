'use client'

import { useId } from 'react'
import Chip from '@/components/ui/Chip'
import { cx } from '@/components/ui/cx'
import { FIELD_LABEL_COMPACT } from '@/components/ui/fieldStyles'
import { popularTags } from '@/lib/pluginFilter'
import TagPicker from './TagPicker'

/** תגית ומספר התוספים שלה (בסינון הנוכחי של חיפוש וסטטוס) */
export interface TagCount {
  tag: string
  count: number
}

/** כמה תגיות נפוצות מוצגות כשבבים */
const POPULAR_COUNT = 8

/**
 * מסנן התגיות של "כל התוספים". רוב התגיות משויכות לתוסף אחד בלבד (נמדד: 81 מתוך 104), ולכן לא
 * מציגים את כולן כקיר שבבים:
 * - בראש השורה, "כל התגיות" (TagPicker): חלונית עם חיפוש וכל התגיות, לפי שכיחות ועם מונה.
 * - אחריו, התגיות הנפוצות כשבבי בחירה (aria-pressed), עם מונה. לחיצה על שבב פעיל מבטלת אותו.
 * - התגית הפעילה תמיד גלויה. אם היא לא בין הנפוצות, היא נוספת ראשונה (popularTags).
 * בנייד השבבים בשורה אחת שנגללת בתוך עצמה (הכפתור "כל התגיות" נשאר קבוע מחוץ לגלילה, כדי
 * שהחלונית שלו לא תיחתך). מ-md, השבבים נשברים לשורות.
 *
 * tags: כל התגיות לפי סדר השכיחות ברשימה המלאה. הסדר יציב ולא קופץ בזמן הקלדה. המונה הוא
 * מספר התוספים בסינון הנוכחי.
 */
export default function TagFilterChips({
  tags,
  activeTag,
  onSelect,
  label = 'תגיות',
  allLabel = 'כל התגיות',
  className
}: {
  tags: TagCount[]
  activeTag: string
  onSelect: (tag: string) => void
  label?: string
  allLabel?: string
  className?: string
}) {
  const labelId = `${useId()}-label`

  if (tags.length === 0) return null

  const chips = popularTags(tags, activeTag, POPULAR_COUNT) as TagCount[]

  return (
    <div className={className}>
      <p id={labelId} className={FIELD_LABEL_COMPACT}>{label}</p>
      <div role="group" aria-labelledby={labelId} className="flex items-start gap-2">
        <TagPicker tags={tags} activeTag={activeTag} onSelect={onSelect} label={allLabel} className="shrink-0" />
        <ul
          className={cx(
            'flex min-w-0 flex-1 gap-x-2 gap-y-2.5',
            // נייד: מסילה. py-1 ו--my-1 נותנים מקום לטבעת הפוקוס בתוך אזור הגלילה, בלי להזיז את השורה
            '-my-1 overflow-x-auto overscroll-x-contain px-1 py-1 scrollbar-thin',
            'md:my-0 md:flex-wrap md:overflow-visible md:p-0'
          )}
        >
          {chips.map(({ tag, count }) => {
            const selected = activeTag === tag
            return (
              <li key={tag} className="shrink-0">
                <Chip
                  selected={selected}
                  icon={selected ? 'check' : undefined}
                  count={count}
                  onClick={() => onSelect(selected ? 'all' : tag)}
                >
                  {tag}
                </Chip>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
