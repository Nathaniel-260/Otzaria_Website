import { formatPluginStatus } from '@/lib/pluginStatus'
import type { UploadFormFields } from './uploadLogic'

/** סדר השדות והתוויות (אותן תוויות כמו בחלון העריכה — PluginEditModal) */
const ROWS: Array<{ key: keyof UploadFormFields; label: string; ltr?: boolean; wide?: boolean }> = [
  { key: 'name', label: 'שם התוסף' },
  { key: 'author', label: 'מפתח' },
  { key: 'version', label: 'גרסה', ltr: true },
  { key: 'status', label: 'סטטוס' },
  { key: 'compatibleWith', label: 'גרסת מינימום', ltr: true },
  { key: 'homepage', label: 'אתר בית', ltr: true },
  { key: 'shortDescription', label: 'תיאור קצר', wide: true }
]

export function manifestSummaryRows(formData: UploadFormFields) {
  return ROWS
    .map(({ key, label, ltr, wide }) => {
      const raw = formData[key]
      const value = typeof raw !== 'string' || !raw ? '' : key === 'status' ? formatPluginStatus(raw) : raw
      return { key, label, value, ltr: Boolean(ltr), wide: Boolean(wide) }
    })
    .filter((row) => row.value)
}

/**
 * מה זוהה מ-manifest.json אחרי בחירת קובץ התוסף — רשימת הגדרות שקטה, כדי שהמפתח יראה במבט
 * אחד מה יישלח (השדות האלה לא נערכים בטופס; מקורם בקובץ).
 */
export default function ManifestSummary({ formData }: { formData: UploadFormFields }) {
  const rows = manifestSummaryRows(formData)
  if (rows.length === 0) return null
  return (
    <dl className="grid gap-x-6 gap-y-3 rounded-(--radius-control) bg-surface-container-low p-4 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.key} className={row.wide ? 'min-w-0 sm:col-span-2' : 'min-w-0'}>
          <dt className="text-label-sm text-on-surface-variant">{row.label}</dt>
          <dd className="mt-0.5 break-words text-body-md text-on-surface">
            {row.ltr ? <bdi dir="ltr">{row.value}</bdi> : row.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
