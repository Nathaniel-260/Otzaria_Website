import { cx } from '@/components/ui/cx'

/**
 * מראה שדה טקסט בטפסי החנות (העלאה, עריכה, דיווח) — component-tokens.css → --field-*.
 * אותה שפה כמו PluginSearchBox: מסגרת outline (שדה חייב גבול מזוהה), ריחוף כהה יותר,
 * ובפוקוס מסגרת primary של 2px (border + outline פנימי של 1px).
 * לוגיקה טהורה (בלי React) — נבדקת ב-fieldStyles.test.ts.
 */
const BASE = cx(
  'block w-full rounded-(--field-radius) border bg-(--field-bg) px-4 text-body-md text-(--field-fg)',
  'placeholder:text-(--field-placeholder) transition-colors',
  'focus:border-(--field-border-focus) focus:outline-1 focus:-outline-offset-2 focus:outline-(--field-border-focus)',
  'disabled:cursor-not-allowed disabled:opacity-(--button-disabled-opacity)'
)

const IDLE = 'border-(--field-border) hover:border-(--field-border-hover)'
/** שדה שגוי: מסגרת בצבע השגיאה (ההודעה עצמה — טקסט ליד השדה; הצבע לא נושא משמעות לבד) */
const INVALID = 'border-error'

export type FieldKind = 'input' | 'textarea' | 'select'

const KIND: Record<FieldKind, string> = {
  input: 'min-h-(--field-height-md)',
  textarea: 'min-h-40 py-3 leading-relaxed',
  select: 'min-h-(--field-height-md) cursor-pointer'
}

export function fieldClasses({ kind = 'input', invalid = false, className }: {
  kind?: FieldKind
  invalid?: boolean
  className?: string
} = {}): string {
  return cx(BASE, KIND[kind], invalid ? INVALID : IDLE, className)
}

/** תווית קבועה מעל השדה */
export const FIELD_LABEL = 'mb-2 block text-label-lg text-on-surface'
/** שורת הסבר מתחת לשדה */
export const FIELD_HINT = 'mt-2 text-body-sm text-on-surface-variant'
/** הודעת שגיאה מתחת לשדה */
export const FIELD_ERROR = 'mt-2 flex items-start gap-1.5 text-body-sm font-semibold text-error'
/** תיבת סימון native בצבע המותג, 20px */
export const CHECKBOX = 'mt-0.5 size-5 shrink-0 cursor-pointer accent-primary'

/** מזהי ההסבר/השגיאה של שדה — ל-aria-describedby */
export function fieldHintId(id: string) { return `${id}-hint` }
export function fieldErrorId(id: string) { return `${id}-error` }

/**
 * מאפייני הנגישות של הפקד עצמו: id (לתווית), aria-required, aria-invalid ו-aria-describedby
 * שמצביע על ההסבר והשגיאה שמתחתיו (רק אלה שמוצגים).
 */
export function fieldA11yProps(id: string, { required = false, hint = false, error }: {
  required?: boolean
  hint?: boolean
  error?: string | null
} = {}) {
  const describedBy = [hint && fieldHintId(id), error && fieldErrorId(id)].filter(Boolean).join(' ')
  return {
    id,
    'aria-required': required || undefined,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy || undefined
  } as const
}
