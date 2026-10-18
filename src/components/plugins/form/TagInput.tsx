'use client'

import { useId, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react'
import Button from '@/components/ui/Button'
import AppIcon from '@/components/ui/AppIcon'
import { cx } from '@/components/ui/cx'
import { FOCUS_RING } from '@/components/ui/focusRing'
import { FIELD_LABEL, fieldClasses, fieldErrorId, fieldHintId } from '@/components/ui/fieldStyles'
import { FieldError, FieldHint } from '@/components/plugins/form/FormField'
import {
  TAG_MAX_LENGTH,
  commitTagDraft,
  hasTagSeparator,
  matchTagSuggestions,
  normalizeTag,
  splitTags
} from '@/lib/pluginTags'
import TagSuggestionList from './TagSuggestionList'
import type { TagSuggestionSource } from './usePluginTagSuggestions'

/**
 * שדה תגיות: שדה טקסט + "הוסף", ומתחת התגיות שנבחרו כשבבים עם כפתור הסרה.
 * - פסיק / נקודה-פסיק / ירידת שורה מפרידים בין תגיות — בהקלדה (מה שלפני המפריד נהפך לתגית) ובהדבקה
 *   (כל הקטעים נהפכים לתגיות). Enter או "הוסף" מוסיפים את מה שבשדה. Enter לא שולח את הטופס.
 * - כל תגית מנורמלת (רווחים, גרשיים) ולא נוספת פעמיים — src/lib/pluginTags.js, אותו נרמול כמו בשרת.
 * - suggestions: תגיות קיימות בחנות מוצעות בזמן ההקלדה (combobox: aria-activedescendant, חצים,
 *   Enter בוחר, Esc סוגר את הרשימה בלי לסגור חלון שהשדה בתוכו). המאגר נטען בפוקוס הראשון.
 * הרשימה עצמה בידי ההורה (tags / onTagsChange); הטקסט שבהקלדה — כאן.
 */
export default function TagInput({ id, label, tags, onTagsChange, suggestions, placeholder, maxLength = TAG_MAX_LENGTH }: {
  id: string
  /** תווית גלויה; בלעדיה — aria-label מה-placeholder (כשכותרת האזור כבר אומרת "תגיות") */
  label?: string
  tags: string[]
  onTagsChange: (tags: string[]) => void
  suggestions?: TagSuggestionSource
  placeholder?: string
  maxLength?: number
}) {
  const baseId = useId()
  const listboxId = `${baseId}-suggestions`
  const optionId = (index: number) => `${baseId}-suggestion-${index}`
  const inputRef = useRef<HTMLInputElement>(null)
  const [draft, setDraft] = useState('')
  const [focused, setFocused] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const items = suggestions ? matchTagSuggestions(suggestions.pool, draft, tags) : []
  const open = focused && !dismissed && items.length > 0
  const active = open && activeIndex >= 0 && activeIndex < items.length ? activeIndex : -1
  // תגית ארוכה מהמגבלה (הודבקה, או חזרה לשדה כי לא נוספה) — הודעה ליד השדה
  const tooLong = splitTags(draft).some((part) => normalizeTag(part).length > maxLength)

  const hintId = fieldHintId(id)
  const errorId = fieldErrorId(id)

  const updateDraft = (value: string) => {
    setDraft(value)
    setDismissed(false)
    setActiveIndex(-1)
  }

  /** החלת תוצאת commitTagDraft: הרשימה (אם השתנתה) והטקסט שנשאר בשדה */
  const apply = (result: { tags: string[]; draft: string }) => {
    if (result.tags.length !== tags.length) onTagsChange(result.tags)
    updateDraft(result.draft)
  }

  const handleChange = (value: string) => {
    if (hasTagSeparator(value)) apply(commitTagDraft(tags, value, { maxLength }))
    else updateDraft(value)
  }

  // הדבקה עם מפרידים: כל הקטעים נהפכים לתגיות (גם האחרון), בלי לחתוך לפי maxLength של השדה
  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData('text')
    if (!hasTagSeparator(pasted)) return
    event.preventDefault()
    const input = event.currentTarget
    const before = draft.slice(0, input.selectionStart ?? draft.length)
    const after = draft.slice(input.selectionEnd ?? draft.length)
    apply(commitTagDraft(tags, `${before}${pasted}${after}`, { final: true, maxLength }))
  }

  const choose = (tag: string) => {
    if (!tags.includes(tag)) onTagsChange([...tags, tag])
    updateDraft('')
    setDismissed(true)
    inputRef.current?.focus()
  }

  const add = () => {
    if (active >= 0) choose(items[active].tag)
    else apply(commitTagDraft(tags, draft, { final: true, maxLength }))
  }

  const remove = (tag: string) => {
    onTagsChange(tags.filter((item) => item !== tag))
    // הכפתור שנלחץ נעלם עם השבב — הפוקוס חוזר לשדה ולא נופל לגוף הדף
    inputRef.current?.focus()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // בזמן הרכבת תו (IME) המקשים שייכים למקלדת הווירטואלית/שיטת הקלט
    if (event.nativeEvent.isComposing) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (items.length === 0 || !focused) return
      event.preventDefault()
      setDismissed(false)
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((current) => {
        const from = open ? current : -1
        if (from < 0) return step === 1 ? 0 : items.length - 1
        return (from + step + items.length) % items.length
      })
    } else if (event.key === 'Enter') {
      event.preventDefault()
      add()
    } else if (event.key === 'Escape' && open) {
      // סוגר רק את רשימת ההצעות — לא את החלון שהשדה בתוכו (המאזין של Dialog על document)
      event.preventDefault()
      event.stopPropagation()
      setDismissed(true)
      setActiveIndex(-1)
    }
  }

  const describedBy = [hintId, tooLong && errorId].filter(Boolean).join(' ')

  return (
    <div>
      {label && <label htmlFor={id} className={FIELD_LABEL}>{label}</label>}
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            ref={inputRef}
            id={id}
            type="text"
            role="combobox"
            autoComplete="off"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? optionId(active) : undefined}
            aria-invalid={tooLong || undefined}
            aria-describedby={describedBy}
            value={draft}
            onChange={(e) => handleChange(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setFocused(true)
              suggestions?.load()
            }}
            onBlur={() => setFocused(false)}
            className={fieldClasses({ invalid: tooLong })}
            placeholder={placeholder}
            aria-label={label ? undefined : placeholder}
            maxLength={maxLength}
          />
          {open && (
            <TagSuggestionList
              id={listboxId}
              optionId={optionId}
              label="תגיות קיימות"
              items={items}
              activeIndex={active}
              onChoose={choose}
              onHover={setActiveIndex}
            />
          )}
        </div>
        <Button type="button" variant="tonal" size="lg" icon="add" onClick={add} className="shrink-0">
          הוסף
        </Button>
      </div>
      <FieldHint id={id}>אפשר להוסיף כמה תגיות בבת אחת, מופרדות בפסיק.</FieldHint>
      {tooLong && <FieldError id={id}>כל תגית יכולה להכיל עד {maxLength} תווים.</FieldError>}

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
                onClick={() => remove(tag)}
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
