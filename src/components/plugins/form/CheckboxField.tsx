import type { ReactNode } from 'react'
import { cx } from '@/components/ui/cx'
import { FieldError, RequiredMark } from './FormField'
import { CHECKBOX, fieldA11yProps } from '@/components/ui/fieldStyles'

/**
 * תיבת סימון עם תווית לחיצה לכל הרוחב (מטרת מגע גדולה): [☐] [אייקון] טקסט + הסבר.
 * framed — מסגרת outline-variant ורקע surface (שורה עצמאית בטופס); בלי — שורה ברשימה.
 */
export default function CheckboxField({ id, checked, onChange, label, description, icon, required = false, error, framed = true, disabled, className }: {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  description?: ReactNode
  /** אלמנט מוכן (AppIcon בצבע) — דקורטיבי */
  icon?: ReactNode
  required?: boolean
  error?: string | null
  framed?: boolean
  disabled?: boolean
  className?: string
}) {
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={cx(
          'flex min-h-(--touch-target) cursor-pointer items-start gap-3 transition-colors',
          framed
            ? cx('rounded-(--radius-control) border bg-(--field-bg) p-4 hover:bg-surface-selected', error ? 'border-error' : 'border-outline-variant')
            : 'rounded-(--radius-control) px-2 py-2.5 hover:bg-surface-selected'
        )}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          required={required}
          disabled={disabled}
          className={CHECKBOX}
          {...fieldA11yProps(id, { error })}
          aria-describedby={[description && `${id}-desc`, error && `${id}-error`].filter(Boolean).join(' ') || undefined}
        />
        {icon}
        <span className="min-w-0 flex-1 text-body-md text-on-surface">
          {label}
          {required && <RequiredMark />}
          {description && <span id={`${id}-desc`} className="mt-1 block text-body-sm text-on-surface-variant">{description}</span>}
        </span>
      </label>
      {error && <FieldError id={id}>{error}</FieldError>}
    </div>
  )
}
