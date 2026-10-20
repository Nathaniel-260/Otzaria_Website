'use client'

import { cx } from '@/components/ui/cx'
import type { TagCount } from '@/components/plugins/listing/TagFilterChips'

/**
 * רשימת ההצעות שמתחת לשדה התגיות (listbox של combobox — הפוקוס נשאר בשדה, והפריט הפעיל מסומן
 * ב-aria-activedescendant שם). כל הצעה: התגית, ומספר התוספים שמשתמשים בה. בחירה בעכבר לא גונבת
 * את הפוקוס מהשדה (preventDefault ב-mousedown).
 */
export default function TagSuggestionList({ id, optionId, label, items, activeIndex, onChoose, onHover }: {
  id: string
  optionId: (index: number) => string
  label: string
  items: TagCount[]
  activeIndex: number
  onChoose: (tag: string) => void
  onHover: (index: number) => void
}) {
  return (
    <ul
      id={id}
      role="listbox"
      aria-label={label}
      // מעל התוכן שמתחת (כרטיסים z-raised) ומתחת לכותרת הדביקה — כמו בהצעות החיפוש (PluginSearchBox)
      className="absolute inset-x-0 top-full z-(--z-below-header) mt-2 max-h-72 overflow-y-auto overscroll-contain rounded-(--radius-container) bg-surface py-1 text-start shadow-menu scrollbar-thin"
    >
      {items.map((item, index) => (
        <li
          key={item.tag}
          id={optionId(index)}
          role="option"
          aria-selected={index === activeIndex}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onChoose(item.tag)}
          onMouseEnter={() => onHover(index)}
          className={cx(
            'flex min-h-11 cursor-pointer items-center gap-2 px-4 text-body-md text-on-surface transition-colors motion-reduce:transition-none',
            index === activeIndex && 'bg-surface-selected'
          )}
        >
          <span className="min-w-0 flex-1 truncate">{item.tag}</span>
          <span className="sr-only"> </span>
          <span className="shrink-0 text-label-sm font-normal tabular-nums text-on-surface-variant">
            ({item.count.toLocaleString('he-IL')})
          </span>
        </li>
      ))}
    </ul>
  )
}
