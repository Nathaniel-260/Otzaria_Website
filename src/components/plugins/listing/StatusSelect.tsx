'use client'

import { useId } from 'react'
import AppIcon from '@/components/ui/AppIcon'
import { FIELD_ICON_GLYPH, FIELD_LABEL_COMPACT, fieldClasses, fieldAdornmentClasses } from '@/components/ui/fieldStyles'

/** אפשרויות סינון הסטטוס — הנוסח הקיים בדף "כל התוספים" */
export const STATUS_OPTIONS = [
  { value: 'all', label: 'הכול' },
  { value: 'stable', label: 'יציב' },
  { value: 'beta', label: 'בטא' },
  { value: 'experimental', label: 'ניסיוני' }
] as const

/**
 * בחירת סטטוס לסינון — select מקורי (נגישות ומקלדת של הדפדפן) במראה שדה (--field-*), עם תווית גלויה
 * מחוברת (htmlFor) וחץ expand_more בצד הסוף במקום החץ של מערכת ההפעלה (appearance-none).
 * גובה md (48px) — זהה ל-PluginSearchBox size="md", כדי שהשדות בשורת המסננים יתיישרו.
 */
export default function StatusSelect({
  value,
  onChange,
  label = 'סטטוס',
  className
}: {
  value: string
  onChange: (value: string) => void
  label?: string
  className?: string
}) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className={FIELD_LABEL_COMPACT}>{label}</label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={fieldClasses({ size: 'md', trailing: true, className: 'cursor-pointer appearance-none' })}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <span className={fieldAdornmentClasses('md', 'end')}>
          <AppIcon name="expand_more" className={FIELD_ICON_GLYPH} />
        </span>
      </div>
    </div>
  )
}
