'use client'

// תיבת חיפוש עם הצעות חיות מהשרת (ראו docs/PLUGIN_STORE_REDESIGN_PLAN.md סעיף 8.7):
// debounce 250ms, מינימום 2 תווים, ביטול בקשות ישנות (AbortController),
// עד 6 הצעות + פריט קבוע "כל התוצאות", ניווט מקלדת מלא ונגישות combobox.

import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { tokenizeHebrew } from '@/lib/hebrewSearchNormalize'
import AppIcon from '@/components/ui/AppIcon'
import { cx } from '@/components/ui/cx'
import { FIELD_ICON_GLYPH, fieldClasses, fieldIconClasses } from '@/components/ui/fieldStyles'
import PluginImage from '@/components/plugins/PluginImage'
import type { Plugin } from '@/components/plugins/types'

// --- הדגשת מונחי חיפוש בטקסט ---
// בונה גרסה מנורמלת של הטקסט (אות-אות, עם מיפוי חזרה לאינדקס המקורי) ומחפש
// בה את המונחים המנורמלים של השאילתה — כך ההדגשה סובלת ניקוד, גרשיים,
// אותיות סופיות ואותיות רישיות, ונבנית כ-JSX בלבד (בלי dangerouslySetInnerHTML).

const FINAL_LETTERS: Record<string, string> = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' }
const NIQQUD_OR_QUOTE_RE = /[֑-ׇ׳״'"’”`]/
const ALNUM_RE = /[a-z0-9א-ת]/

function normalizeChar(ch: string): string {
  let out = ''
  for (const x of ch.normalize('NFKC')) {
    if (NIQQUD_OR_QUOTE_RE.test(x)) continue
    const y = (FINAL_LETTERS[x] || x).toLowerCase()
    out += ALNUM_RE.test(y) ? y : ' '
  }
  return out
}

export function highlightMatches(text: string, query: string): ReactNode {
  if (!text || !query) return text
  const terms = tokenizeHebrew(query) as string[]
  if (terms.length === 0) return text

  const chars = Array.from(text)
  let norm = ''
  const map: number[] = [] // אינדקס בטקסט המנורמל → אינדקס התו המקורי
  chars.forEach((ch, i) => {
    for (const n of normalizeChar(ch)) {
      norm += n
      map.push(i)
    }
  })

  const matched = new Array<boolean>(chars.length).fill(false)
  let found = false
  for (const term of terms) {
    if (!term) continue
    let from = 0
    for (;;) {
      const idx = norm.indexOf(term, from)
      if (idx === -1) break
      for (let k = idx; k < idx + term.length; k++) matched[map[k]] = true
      found = true
      from = idx + 1
    }
  }
  if (!found) return text

  // קיבוץ רצפים מודגשים/רגילים לספאנים
  const out: ReactNode[] = []
  let i = 0
  while (i < chars.length) {
    const flag = matched[i]
    let j = i
    while (j < chars.length && matched[j] === flag) j++
    const segment = chars.slice(i, j).join('')
    out.push(
      flag
        ? <mark key={i} className="rounded-sm bg-secondary-container font-bold text-on-secondary-container">{segment}</mark>
        : <span key={i}>{segment}</span>
    )
    i = j
  }
  return out
}

// --- הקומפוננטה ---

const DEBOUNCE_MS = 250
const MIN_QUERY_LENGTH = 2
const SUGGESTIONS_LIMIT = 6

// מראה השדה — ui/fieldStyles (מקור אחד לכל שדות האתר). אייקון החיפוש בעוטף ולא על הגליף: לגליף יש
// direction: ltr (base.css), ו-start-* עליו היה מצייר אותו בשמאל.

interface PluginSearchBoxProps {
  placeholder?: string
  size?: 'lg' | 'md'
  /** שם נגיש לשדה, כשאין <label> גלוי שמחובר אליו (inputId) */
  ariaLabel?: string
  /** id לשדה — לחיבור <label htmlFor> גלוי */
  inputId?: string
  // אם סופק — Enter בלי בחירת הצעה יפעיל אותו (סינון מקומי ב"כל התוספים")
  // במקום ניווט לדף תוצאות החיפוש.
  onSubmit?: (query: string) => void
  defaultValue?: string
}

export default function PluginSearchBox({
  placeholder = 'חפשו תוסף לפי שם, תיאור או נושא...',
  size = 'md',
  onSubmit,
  defaultValue = '',
  ariaLabel = 'חיפוש תוספים',
  inputId
}: PluginSearchBoxProps) {
  const router = useRouter()
  const baseId = useId()
  const [value, setValue] = useState(defaultValue)
  const [suggestions, setSuggestions] = useState<Plugin[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const abortRef = useRef<AbortController | null>(null)
  // הצעות רק אחרי הקלדה: ערך התחלתי (defaultValue, למשל ?q= ב"כל התוספים") לא פותח רשימה מעצמו
  const typedRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const trimmed = value.trim()
  // הפריט האחרון הקבוע ("כל התוצאות") — אחרי ההצעות
  const itemCount = open ? suggestions.length + 1 : 0

  // שינוי ערך: מתחת לאורך המינימלי מנקים את ההצעות מיד (בלי לחכות ל-debounce)
  const handleChange = (next: string) => {
    typedRef.current = true
    setValue(next)
    if (next.trim().length < MIN_QUERY_LENGTH) {
      abortRef.current?.abort()
      setSuggestions([])
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  // הצעות חיות: debounce + ביטול בקשות שעברו
  useEffect(() => {
    if (!typedRef.current || trimmed.length < MIN_QUERY_LENGTH) return
    const timer = setTimeout(async () => {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      try {
        const res = await fetch(
          `/api/plugins/search?q=${encodeURIComponent(trimmed)}&limit=${SUGGESTIONS_LIMIT}`,
          { signal: controller.signal }
        )
        if (!res.ok) return
        const data = await res.json()
        setSuggestions(Array.isArray(data.results) ? data.results : [])
        setOpen(true)
        setActiveIndex(-1)
      } catch {
        // בקשה שבוטלה או שגיאת רשת — מתעלמים
      }
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [trimmed])

  // סגירה בלחיצה מחוץ לתיבה
  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setActiveIndex(-1)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [])

  const goToResults = (query: string) => {
    setOpen(false)
    setActiveIndex(-1)
    router.push(`/plugins/search?q=${encodeURIComponent(query)}`)
  }

  const submit = () => {
    setOpen(false)
    setActiveIndex(-1)
    if (onSubmit) {
      onSubmit(trimmed)
    } else if (trimmed) {
      goToResults(trimmed)
    }
  }

  const selectIndex = (index: number) => {
    if (index >= 0 && index < suggestions.length) {
      setOpen(false)
      setActiveIndex(-1)
      router.push(`/plugins/${suggestions[index].id}`)
    } else if (index === suggestions.length) {
      goToResults(trimmed)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open && trimmed.length >= MIN_QUERY_LENGTH && suggestions.length > 0) {
        setOpen(true)
        setActiveIndex(0)
        return
      }
      if (itemCount > 0) setActiveIndex(prev => (prev + 1) % itemCount)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (itemCount > 0) setActiveIndex(prev => (prev <= 0 ? itemCount - 1 : prev - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (open && activeIndex >= 0) {
        selectIndex(activeIndex)
      } else {
        submit()
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  const listboxId = `${baseId}-listbox`
  const optionId = (index: number) => `${baseId}-option-${index}`

  return (
    <div ref={containerRef} className="relative w-full">
      <span className={fieldIconClasses(size, 'start')} aria-hidden="true">
        <AppIcon name="search" className={FIELD_ICON_GLYPH} />
      </span>
      <input
        id={inputId}
        type="search"
        role="combobox"
        aria-label={inputId ? undefined : ariaLabel}
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
        aria-autocomplete="list"
        placeholder={placeholder}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (trimmed.length >= MIN_QUERY_LENGTH && suggestions.length > 0) setOpen(true)
        }}
        className={fieldClasses({ size, withIcon: true })}
      />

      {open && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label="הצעות"
          // מעל התוכן (גם מעל כפתורי הכרטיסים, שהם z-raised) ומתחת לכותרת הדביקה
          className="absolute inset-x-0 top-full z-(--z-below-header) mt-2 overflow-hidden rounded-(--radius-container) bg-surface py-1 text-start shadow-menu"
        >
          {suggestions.map((plugin, index) => (
            <li
              key={plugin.id}
              id={optionId(index)}
              role="option"
              aria-selected={activeIndex === index}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectIndex(index)}
              onMouseEnter={() => setActiveIndex(index)}
              className={cx(
                'flex min-h-14 cursor-pointer items-center gap-3 px-3 py-2 transition-colors',
                activeIndex === index && 'bg-surface-selected'
              )}
            >
              <PluginImage src={plugin.image} size="sm" />
              <div className="min-w-0">
                <div className="truncate text-label-lg text-on-surface">
                  {highlightMatches(plugin.name, trimmed)}
                </div>
                <div className="truncate text-body-sm text-on-surface-variant">
                  {plugin.shortDescription}
                </div>
              </div>
            </li>
          ))}
          {/* פריט קבוע אחרון: מעבר לדף כל התוצאות */}
          <li
            id={optionId(suggestions.length)}
            role="option"
            aria-selected={activeIndex === suggestions.length}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => selectIndex(suggestions.length)}
            onMouseEnter={() => setActiveIndex(suggestions.length)}
            className={cx(
              'flex min-h-12 cursor-pointer items-center px-4 text-label-lg text-primary transition-colors',
              suggestions.length > 0 && 'mt-1 border-t border-outline-variant',
              activeIndex === suggestions.length && 'bg-surface-selected'
            )}
          >
            כל התוצאות עבור &apos;{trimmed}&apos; ←
          </li>
        </ul>
      )}
    </div>
  )
}
