import type { ReactNode } from 'react'
import AppIcon from '@/components/ui/AppIcon'
import { cx } from '@/components/ui/cx'
import { FIELD_ERROR, FIELD_HINT, FIELD_LABEL, fieldErrorId, fieldHintId } from '@/components/ui/fieldStyles'

/** כוכבית "חובה" — בצבע השגיאה, דקורטיבית (הפקד עצמו נושא aria-required) */
export function RequiredMark() {
  return <span aria-hidden="true" className="ms-1 text-error">*</span>
}

/** הודעת שגיאה של שדה — מתחתיו, עם אייקון (הצבע לא נושא משמעות לבד) */
export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={fieldErrorId(id)} className={FIELD_ERROR}>
      <AppIcon name="error" className="mt-0.5 text-[1.1rem]" />
      <span>{children}</span>
    </p>
  )
}

/** שורת הסבר של שדה */
export function FieldHint({ id, children, className }: { id: string; children: ReactNode; className?: string }) {
  return <p id={fieldHintId(id)} className={cx(FIELD_HINT, className)}>{children}</p>
}

/**
 * שדה בטופס: תווית קבועה מעל (מחוברת ב-htmlFor), סימון חובה, הפקד (children), הסבר ושגיאה מתחתיו.
 * הפקד עצמו מקבל את מאפייני הנגישות מ-fieldA11yProps(id, ...) — כאן רק המעטפת.
 */
export default function FormField({ id, label, required = false, hint, error, className, children }: {
  id: string
  label: ReactNode
  required?: boolean
  hint?: ReactNode
  error?: string | null
  className?: string
  children: ReactNode
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className={FIELD_LABEL}>
        {label}
        {required && <RequiredMark />}
      </label>
      {children}
      {hint && <FieldHint id={id}>{hint}</FieldHint>}
      {error && <FieldError id={id}>{error}</FieldError>}
    </div>
  )
}
