import type { ReactNode } from 'react'
import AppIcon from '@/components/ui/AppIcon'
import Ltr from '@/components/ui/Ltr'
import { cx } from '@/components/ui/cx'
import { formatPluginStatus } from '@/lib/pluginStatus'
import { formatHebrewDate } from '@/lib/hebrewDate'
import { formatFileSize } from '@/lib/formatFileSize'
import { displayUpdatedDate, formatCount } from './pluginDetailModel'
import type { Plugin } from './types'

/**
 * "מידע כללי" — רשימת הגדרות (<dl>) בשורות: התווית בצד ההתחלה, הערך בצד הסוף, קו דק בין שורות.
 * כך גם בעמודה צרה (לצד התיאור, מ-lg) וגם בנייד — כל ערך באותו מקום, קל להשוות.
 * הנוסח — התוויות שהיו בכרטיסיות "מידע כללי". גודל — רק כשידוע (תוספים ותיקים: 0).
 */
type Row = { key: string; label: string; value: ReactNode }

export function buildInfoRows(plugin: Pick<Plugin,
  'version' | 'status' | 'author' | 'fileUpdatedAt' | 'originalDate' | 'updatedAt' | 'downloadCount' |
  'pluginFileSize' | 'compatibleWith' | 'requiresNetwork'
>): Row[] {
  const rows: Row[] = [
    { key: 'version', label: 'גרסה', value: <Ltr>{plugin.version}</Ltr> },
    { key: 'status', label: 'סטטוס', value: formatPluginStatus(plugin.status) },
    { key: 'author', label: 'מפתח', value: plugin.author },
    { key: 'updated', label: 'עודכן', value: formatHebrewDate(displayUpdatedDate(plugin)) },
    { key: 'downloads', label: 'הורדות', value: <span className="tabular-nums">{formatCount(plugin.downloadCount)}</span> }
  ]
  if ((plugin.pluginFileSize ?? 0) > 0) {
    rows.push({ key: 'size', label: 'גודל', value: <Ltr>{formatFileSize(plugin.pluginFileSize as number)}</Ltr> })
  }
  if (plugin.compatibleWith) {
    rows.push({ key: 'compat', label: 'תאימות', value: <Ltr>{plugin.compatibleWith}</Ltr> })
  }
  rows.push({
    key: 'network',
    label: 'חיבור אינטרנט',
    value: (
      <span className="inline-flex items-center gap-1.5">
        <AppIcon name={plugin.requiresNetwork ? 'wifi' : 'wifi_off'} className="text-[1.15em] text-on-surface-variant" />
        {plugin.requiresNetwork ? 'נדרש' : 'לא נדרש'}
      </span>
    )
  })
  return rows
}

export default function PluginInfoList({ plugin, className }: {
  plugin: Parameters<typeof buildInfoRows>[0]
  className?: string
}) {
  return (
    <dl className={cx('rounded-(--card-radius) bg-(--card-bg) px-4 sm:px-5', className)}>
      {buildInfoRows(plugin).map((row) => (
        <div
          key={row.key}
          data-row={row.key}
          className="flex min-h-12 items-center justify-between gap-4 border-b border-outline-variant py-2.5 last:border-b-0"
        >
          <dt className="shrink-0 text-body-sm text-on-surface-variant">{row.label}</dt>
          <dd className="min-w-0 break-words text-end text-label-lg text-on-surface">{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
