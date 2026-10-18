'use client'

import Button from '@/components/ui/Button'
import AppIcon from '@/components/ui/AppIcon'
import { cx } from '@/components/ui/cx'
import { FOCUS_RING } from '@/components/ui/focusRing'
import { FIELD_LABEL, fieldClasses } from '@/components/ui/fieldStyles'

/**
 * שדה תגיות: שדה טקסט + "הוסף", ומתחת התגיות שנוספו כשבבים עם כפתור הסרה.
 * רכיב תצוגה בלבד — הרשימה, הטקסט וההוספה/ההסרה בידי ההורה (הלוגיקה הקיימת של הטופס).
 * Enter בשדה מוסיף תגית (ולא שולח את הטופס).
 */
export default function TagInput({ id, label, tags, value, onValueChange, onAdd, onRemove, placeholder, maxLength }: {
  id: string
  /** תווית גלויה; בלעדיה — aria-label מה-placeholder (כשכותרת האזור כבר אומרת "תגיות") */
  label?: string
  tags: string[]
  value: string
  onValueChange: (value: string) => void
  onAdd: () => void
  onRemove: (tag: string) => void
  placeholder?: string
  maxLength?: number
}) {
  return (
    <div>
      {label && <label htmlFor={id} className={FIELD_LABEL}>{label}</label>}
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onAdd()
            }
          }}
          className={fieldClasses({ className: 'min-w-0 flex-1' })}
          placeholder={placeholder}
          aria-label={label ? undefined : placeholder}
          maxLength={maxLength}
        />
        <Button type="button" variant="tonal" size="lg" icon="add" onClick={onAdd} className="shrink-0">
          הוסף
        </Button>
      </div>

      {tags.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label="תגיות">
          {tags.map((tag) => (
            <li
              key={tag}
              className="inline-flex min-h-(--chip-height) max-w-full items-center gap-0.5 rounded-(--chip-radius) bg-(--chip-selected-bg) ps-3.5 pe-0.5 text-label-md text-(--chip-selected-fg)"
            >
              <span className="truncate">{tag}</span>
              <button
                type="button"
                onClick={() => onRemove(tag)}
                aria-label={`הסרת התגית ${tag}`}
                className={cx(
                  '-my-1 flex size-(--touch-target) shrink-0 items-center justify-center rounded-full transition-colors hover:bg-(--chip-selected-bg-hover)',
                  FOCUS_RING
                )}
              >
                <AppIcon name="close" className="text-[1.1rem]" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
