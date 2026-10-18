'use client'

import { useEffect, useId, useRef, useState, type FocusEvent } from 'react'
import Button from '@/components/ui/Button'
import Chip from '@/components/ui/Chip'
import { FIELD_LABEL_COMPACT } from '@/components/ui/fieldStyles'

/** גובה התחלתי (לפני המדידה, וב-HTML מהשרת): בערך 3 שורות שבבים — כדי שלא תהיה קפיצה */
const INITIAL_COLLAPSED_HEIGHT = 136
/** כמה שורות מוצגות במצב מקופל */
const COLLAPSED_ROWS = 3

/**
 * מסנן תגיות — "כל התגיות" ואחריו כל תגית, כשבבי בחירה (ui/Chip, aria-pressed). התגית הפעילה
 * מסומנת בצבע ובמצב הנגיש. מוגבל ל-3 שורות, עם "הצג עוד" / "הצג פחות" (המנגנון הקיים של הדף:
 * מדידת גובה שורה ו-max-height מונפש; הרווח האנכי והריפוד נמדדים מה-CSS ולא מוקשים).
 *
 * ריפוד פנימי קטן (p-1 -m-1): ה-overflow-hidden של הקיפול חותך — בלעדיו טבעת הפוקוס של השבבים
 * בשורה העליונה ובקצוות הייתה נחתכת.
 * פוקוס מקלדת על שבב שמוסתר מתחת לקיפול — פותח את הרשימה, כדי שלא יהיה פוקוס בלתי נראה.
 */
export default function TagFilterChips({
  tags,
  activeTag,
  onSelect,
  label = 'תגיות',
  allLabel = 'כל התגיות',
  className
}: {
  tags: string[]
  activeTag: string
  onSelect: (tag: string) => void
  label?: string
  allLabel?: string
  className?: string
}) {
  const baseId = useId()
  const labelId = `${baseId}-label`
  const listId = `${baseId}-list`
  const clipRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [collapsedHeight, setCollapsedHeight] = useState(INITIAL_COLLAPSED_HEIGHT)
  const [fullHeight, setFullHeight] = useState(0)
  const [overflow, setOverflow] = useState(false)

  // מדידת גובה אזור התגיות — הגבלה ל-3 שורות עם כפתור "הצג עוד".
  // המדידה על הרשימה הפנימית (שאינה מוגבלת בגובה), ונשנית בכל שינוי גודל שלה (ResizeObserver —
  // גם כשהגופן נטען אחרי ה-hydration ומשנה את רוחב השבבים, לא רק ב-resize של החלון).
  useEffect(() => {
    const clip = clipRef.current
    const list = listRef.current
    if (!clip || !list || !list.firstElementChild) return
    const measure = () => {
      const rowHeight = (list.firstElementChild as HTMLElement).offsetHeight
      if (!rowHeight) return
      const gap = parseFloat(getComputedStyle(list).rowGap) || 0
      const clipStyle = getComputedStyle(clip)
      const padding = (parseFloat(clipStyle.paddingTop) || 0) + (parseFloat(clipStyle.paddingBottom) || 0)
      const collapsed = rowHeight * COLLAPSED_ROWS + gap * (COLLAPSED_ROWS - 1) + padding
      const full = list.offsetHeight + padding
      setCollapsedHeight(collapsed)
      setFullHeight(full)
      setOverflow(full > collapsed + 4)
    }
    measure()
    window.addEventListener('resize', measure)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(list)
    document.fonts?.ready.then(measure).catch(() => {})
    return () => {
      window.removeEventListener('resize', measure)
      observer?.disconnect()
    }
  }, [tags])

  const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
    if (expanded || !overflow) return
    const target = event.target as HTMLElement
    if (target.offsetTop + target.offsetHeight > collapsedHeight) setExpanded(true)
  }

  if (tags.length === 0) return null

  return (
    <div className={className}>
      <p id={labelId} className={FIELD_LABEL_COMPACT}>{label}</p>
      {/* עוטף הקיפול (max-height + overflow) והרשימה עצמה בתוכו — כדי שאפשר יהיה למדוד את גובהה המלא */}
      <div
        id={listId}
        ref={clipRef}
        onFocus={handleFocus}
        className="-m-1 overflow-hidden p-1 transition-[max-height] duration-300 motion-reduce:transition-none"
        style={{ maxHeight: expanded ? (fullHeight || undefined) : collapsedHeight }}
      >
        <div
          ref={listRef}
          role="group"
          aria-labelledby={labelId}
          className="relative flex flex-wrap gap-x-2 gap-y-2.5"
        >
          <Chip selected={activeTag === 'all'} onClick={() => onSelect('all')}>
            {allLabel}
          </Chip>
          {tags.map((tag) => (
            <Chip key={tag} selected={activeTag === tag} onClick={() => onSelect(tag)}>
              {tag}
            </Chip>
          ))}
        </div>
      </div>
      {overflow && (
        <Button
          variant="text"
          size="sm"
          iconEnd={expanded ? 'expand_less' : 'expand_more'}
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 -ms-3"
        >
          {expanded ? 'הצג פחות' : 'הצג עוד'}
        </Button>
      )}
    </div>
  )
}
