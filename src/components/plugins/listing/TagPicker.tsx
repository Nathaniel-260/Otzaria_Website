'use client'

import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'
import AppIcon from '@/components/ui/AppIcon'
import { chipClasses } from '@/components/ui/Chip'
import { cx } from '@/components/ui/cx'
import { FIELD_ICON_GLYPH, fieldAdornmentClasses, fieldClasses } from '@/components/ui/fieldStyles'
import { searchTags } from '@/lib/pluginFilter'
import type { TagCount } from './TagFilterChips'

const ALL = 'all'

/**
 * "כל התגיות": כפתור בצורת שבב שפותח חלונית עם שדה חיפוש ורשימת כל התגיות (לפי שכיחות, עם מונה).
 * החלונית אינה מודאלית: תיבת combobox (aria-activedescendant) מעל listbox.
 * - חצים למעלה ולמטה עוברים בין הפריטים (במעגל). Enter בוחר. Esc סוגר. בכל המקרים הפוקוס חוזר לכפתור.
 * - לחיצה מחוץ לחלונית, או Tab שיוצא ממנה, סוגרים אותה.
 * הפריט הראשון, "כל התגיות", מבטל את הסינון. התגית הפעילה מסומנת ב-✓ וב-aria-selected.
 */
export default function TagPicker({ tags, activeTag, onSelect, label, className }: {
  tags: TagCount[]
  activeTag: string
  onSelect: (tag: string) => void
  /** שם הכפתור והחלונית — "כל התגיות" */
  label: string
  className?: string
}) {
  const baseId = useId()
  const listboxId = `${baseId}-listbox`
  const inputId = `${baseId}-input`
  const optionId = (index: number) => `${baseId}-option-${index}`
  const wrapperRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const filtered = searchTags(tags, query)
  // הפריטים ברשימה: "כל התגיות" (רק בלי שאילתה) ואחריו התגיות שנמצאו
  const options: { tag: string; count?: number }[] = query.trim() ? filtered : [{ tag: ALL }, ...filtered]

  const close = (returnFocus: boolean) => {
    setOpen(false)
    setQuery('')
    if (returnFocus) buttonRef.current?.focus()
  }

  const openPicker = () => {
    const current = [{ tag: ALL }, ...tags].findIndex((t) => t.tag === activeTag)
    setActiveIndex(Math.max(current, 0))
    setOpen(true)
  }

  // פוקוס לשדה החיפוש כשהחלונית נפתחת
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // לחיצה מחוץ לחלונית ולכפתור סוגרת (בלי להחזיר פוקוס — המשתמש לחץ במקום אחר)
  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (wrapperRef.current?.contains(event.target as Node)) return
      setOpen(false)
      setQuery('')
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  // הפריט הפעיל תמיד גלוי ברשימה הנגללת
  useEffect(() => {
    if (!open) return
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
    el?.scrollIntoView?.({ block: 'nearest' })
  }, [open, activeIndex])

  const choose = (index: number) => {
    const option = options[index]
    if (!option) return
    onSelect(option.tag)
    close(true)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (options.length === 0) return
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((i) => (i + step + options.length) % options.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      choose(activeIndex)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      close(true)
    }
  }

  // Tab שיוצא מהחלונית סוגר אותה
  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (open && !wrapperRef.current?.contains(event.relatedTarget as Node | null)) close(false)
  }

  return (
    <div ref={wrapperRef} className={cx('relative', className)} onBlur={handleBlur}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? close(true) : openPicker())}
        className={chipClasses({ selected: open })}
      >
        <AppIcon name="label" className="text-[1.15rem]" />
        <span>{label}</span>
        <AppIcon name={open ? 'expand_less' : 'expand_more'} className="-me-1 text-[1.15rem]" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={label}
          // מעל הכרטיסים (z-raised) ומתחת לכותרת הדביקה. ברוחב שנכנס תמיד למסך הנייד (השבב בקצה ההתחלה)
          className="absolute top-full z-(--z-below-header) mt-2 w-[min(22rem,calc(100vw-4rem))] rounded-(--radius-container) bg-surface p-2 shadow-menu start-0"
        >
          <div className="relative">
            <label htmlFor={inputId} className="sr-only">חיפוש תגית</label>
            <span aria-hidden="true" className={fieldAdornmentClasses('md', 'start')}>
              <AppIcon name="search" className={FIELD_ICON_GLYPH} />
            </span>
            <input
              ref={inputRef}
              id={inputId}
              type="text"
              role="combobox"
              autoComplete="off"
              aria-expanded="true"
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={options.length > 0 ? optionId(activeIndex) : undefined}
              placeholder="חיפוש תגית"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActiveIndex(0)
              }}
              onKeyDown={handleKeyDown}
              className={fieldClasses({ size: 'md', withIcon: true })}
            />
          </div>

          {options.length === 0 && (
            <p role="status" className="px-3 py-4 text-center text-body-sm text-on-surface-variant">לא נמצאו תגיות</p>
          )}
          <ul
              ref={listRef}
              id={listboxId}
              role="listbox"
              aria-label={label}
              className="mt-2 max-h-72 overflow-y-auto overscroll-contain scrollbar-thin"
            >
              {options.map((option, index) => {
                const selected = option.tag === activeTag
                return (
                  <li
                    key={option.tag}
                    id={optionId(index)}
                    data-index={index}
                    role="option"
                    aria-selected={selected}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => choose(index)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cx(
                      'flex min-h-11 cursor-pointer items-center gap-2 rounded-(--radius-control) px-3 text-body-md text-on-surface transition-colors',
                      index === activeIndex && 'bg-surface-selected',
                      option.count === 0 && 'text-on-surface-variant'
                    )}
                  >
                    <span aria-hidden="true" className="w-5 shrink-0 text-primary">
                      {selected && <AppIcon name="check" className="text-[1.15rem]" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{option.tag === ALL ? label : option.tag}</span>
                    {typeof option.count === 'number' && (
                      <>
                        <span className="sr-only"> </span>
                        <span className="shrink-0 text-label-sm font-normal tabular-nums text-on-surface-variant">
                          ({option.count.toLocaleString('he-IL')})
                        </span>
                      </>
                    )}
                  </li>
                )
              })}
            </ul>
        </div>
      )}
    </div>
  )
}
