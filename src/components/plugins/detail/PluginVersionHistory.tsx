'use client'

import { useState } from 'react'
import Link from 'next/link'
import StatusBadge from '@/components/plugins/StatusBadge'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import AppIcon from '@/components/ui/AppIcon'
import Ltr from '@/components/ui/Ltr'
import { cx } from '@/components/ui/cx'
import { FOCUS_RING_INSET } from '@/components/ui/focusRing'
import { formatHebrewDate } from '@/lib/hebrewDate'
import { formatFileSize } from '@/lib/formatFileSize'
import { versionHref } from './pluginDetailModel'
import type { PluginVersionEntry } from './types'

/** כמה גרסאות מוצגות לפני "הצג עוד" — תוספים ותיקים צברו עשרות גרסאות */
export const VERSIONS_PREVIEW = 5

/**
 * היסטוריית הגרסאות — הנתונים כבר הגיעו בתשובת התוסף (versions, מהגבוהה לנמוכה) ולא הוצגו.
 * כל שורה היא קישור לעמוד של אותה גרסה (/plugins/<id>@<version>) — ניווט בלבד; ההורדה נעשית
 * מעמוד הגרסה, באותם כפתורים. הגרסה שבה צופים — מסומנת (aria-current) ואינה קישור.
 * מוצג רק כשיש יותר מגרסה אחת.
 */
export default function PluginVersionHistory({ pluginId, versions, currentVersion, className }: {
  pluginId: string
  versions: PluginVersionEntry[]
  currentVersion: string
  className?: string
}) {
  const [expanded, setExpanded] = useState(false)
  if (versions.length < 2) return null

  // הגרסה הנצפית תמיד בתוך התצוגה המקוצרת
  const currentIndex = versions.findIndex((v) => v.version === currentVersion)
  const visible = expanded
    ? versions
    : versions.filter((_, i) => i < VERSIONS_PREVIEW || i === currentIndex)
  const hidden = versions.length - visible.length

  return (
    <div className={className}>
      <ol className="overflow-hidden rounded-(--card-radius) bg-(--card-bg)">
        {visible.map((entry) => {
          const current = entry.version === currentVersion
          const body = (
            <>
              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-title-sm text-on-surface">
                  <span className="sr-only">גרסה </span>
                  <Ltr>{entry.version}</Ltr>
                </span>
                {entry.isLatest && <Badge tone="primary">עדכנית</Badge>}
                {entry.status && entry.status !== 'stable' && <StatusBadge status={entry.status} />}
              </span>
              <span className="flex shrink-0 items-center gap-3 text-body-sm text-on-surface-variant">
                {(entry.pluginFileSize ?? 0) > 0 && (
                  <span className="hidden sm:inline"><Ltr>{formatFileSize(entry.pluginFileSize as number)}</Ltr></span>
                )}
                {entry.releasedAt && <span>{formatHebrewDate(entry.releasedAt)}</span>}
                {!current && <AppIcon name="chevron_left" className="text-lg text-outline" />}
              </span>
            </>
          )
          const rowClasses = 'flex min-h-14 items-center gap-3 px-4 py-2.5 sm:px-5'
          return (
            <li key={entry.version} className="border-b border-outline-variant last:border-b-0">
              {current ? (
                <div aria-current="page" className={cx(rowClasses, 'bg-surface-selected')}>{body}</div>
              ) : (
                <Link
                  href={versionHref(pluginId, entry)}
                  prefetch={false}
                  className={cx(rowClasses, 'transition-colors hover:bg-(--card-bg-hover)', FOCUS_RING_INSET)}
                >
                  {body}
                </Link>
              )}
            </li>
          )
        })}
      </ol>

      {(hidden > 0 || expanded) && (
        <Button
          variant="text"
          size="sm"
          iconEnd={expanded ? 'expand_less' : 'expand_more'}
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-2"
        >
          {expanded ? 'הצג פחות' : `הצג עוד (${hidden.toLocaleString('he-IL')})`}
        </Button>
      )}
    </div>
  )
}
