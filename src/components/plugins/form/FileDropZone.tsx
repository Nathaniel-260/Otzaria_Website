'use client'

import { useState, type ChangeEvent, type DragEvent, type ReactNode } from 'react'
import IconTile from '@/components/ui/IconTile'
import { cx } from '@/components/ui/cx'
import { FieldError, RequiredMark } from './FormField'
import { FIELD_HINT, fieldA11yProps, fieldHintId } from '@/components/ui/fieldStyles'

/** כפתור "בחירת קובץ" של הדפדפן — בצורת כפתור tonal קטן (ui/Button) */
const FILE_INPUT = cx(
  'block w-full max-w-full cursor-pointer text-body-sm text-on-surface-variant',
  'file:me-3 file:min-h-(--button-height-sm) file:cursor-pointer file:rounded-(--button-radius) file:border-0',
  'file:bg-(--button-tonal-bg) file:px-4 file:text-sm file:font-semibold file:text-(--button-tonal-fg)',
  'hover:file:bg-(--button-tonal-bg-hover) file:transition-colors',
  'rounded-(--radius-control) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring'
)

/** האם הגרירה נושאת קבצים (ולא טקסט/קישור) */
export function dragHasFiles(event: Pick<DragEvent, 'dataTransfer'>): boolean {
  return Boolean(event.dataTransfer?.types?.includes('Files'))
}

/**
 * אזור העלאת קובץ: מסגרת מקווקוות (outline-variant), ובגרירה — primary על surface-selected.
 * בתוכו: אריח אייקון, תווית (מחוברת לשדה הקובץ), הסבר, שדה הקובץ, ומתחת children
 * (הקובץ שנבחר, תצוגה מקדימה, הערה) והודעת שגיאה.
 *
 * onDropFiles — אופציונלי: בלעדיו האזור אינו מקבל גרירה (רק בחירה דרך השדה).
 * שדה הקובץ עצמו native (נגיש מהמקלדת, הודעת "לא נבחר קובץ" של הדפדפן) — רק מעוצב.
 */
export default function FileDropZone({
  id,
  label,
  icon,
  required = false,
  inputRequired,
  accept,
  multiple = false,
  onChange,
  onDropFiles,
  hint,
  error,
  children
}: {
  id: string
  label: ReactNode
  icon: string
  /** סימון חובה (כוכבית + aria-required) */
  required?: boolean
  /** required של הדפדפן (ברירת מחדל = required) — למשל רק כשעדיין לא נבחרו קבצים */
  inputRequired?: boolean
  accept?: string
  multiple?: boolean
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  onDropFiles?: (files: FileList) => void
  hint?: ReactNode
  error?: string | null
  children?: ReactNode
}) {
  const [dragging, setDragging] = useState(false)

  const dropHandlers = onDropFiles
    ? {
        onDragEnter: (e: DragEvent<HTMLDivElement>) => {
          e.preventDefault(); e.stopPropagation()
          if (dragHasFiles(e)) setDragging(true)
        },
        onDragOver: (e: DragEvent<HTMLDivElement>) => {
          e.preventDefault(); e.stopPropagation()
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
        },
        onDragLeave: (e: DragEvent<HTMLDivElement>) => {
          e.preventDefault(); e.stopPropagation()
          const related = e.relatedTarget as Node | null
          if (related && e.currentTarget.contains(related)) return
          setDragging(false)
        },
        onDrop: (e: DragEvent<HTMLDivElement>) => {
          e.preventDefault(); e.stopPropagation()
          setDragging(false)
          if (e.dataTransfer?.files?.length) onDropFiles(e.dataTransfer.files)
        }
      }
    : null

  return (
    <div
      {...dropHandlers}
      data-dragging={dragging ? '' : undefined}
      className={cx(
        'rounded-(--card-radius) border-2 border-dashed p-3.5 transition-colors motion-reduce:transition-none sm:p-5',
        dragging ? 'border-primary bg-surface-selected' : error ? 'border-error' : 'border-outline-variant'
      )}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <IconTile icon={icon} size="md" className="hidden sm:inline-flex" />
        <div className="min-w-0 flex-1">
          <label htmlFor={id} className="block text-label-lg text-on-surface">
            {label}
            {required && <RequiredMark />}
          </label>
          {hint && <div id={fieldHintId(id)} className={cx(FIELD_HINT, 'mt-1 space-y-1')}>{hint}</div>}
          <input
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={onChange}
            required={inputRequired ?? required}
            className={cx(FILE_INPUT, 'mt-3')}
            {...fieldA11yProps(id, { required, hint: Boolean(hint), error })}
          />
          {error && <FieldError id={id}>{error}</FieldError>}
        </div>
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}
