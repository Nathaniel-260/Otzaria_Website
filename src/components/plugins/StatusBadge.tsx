import Badge, { type BadgeSize, type BadgeTone } from '@/components/ui/Badge'
import { formatPluginStatus } from '@/lib/pluginStatus'

export type PluginStatus = 'stable' | 'beta' | 'experimental'

/**
 * תג סטטוס השחרור של תוסף (יציב / בטא / ניסיוני) — לפי הבשלות, מהשקט אל הבולט:
 *   stable       → primary (המשטח הטונלי-חולי של האפליקציה)
 *   beta         → neutral
 *   experimental → warning (אזהרה רכה: "עלול להשתנות")
 * סטטוס לא מוכר → neutral, והתווית "לא ידוע" (formatPluginStatus).
 * המשמעות בטקסט; הצבע מחזק בלבד.
 */
export const STATUS_TONES: Record<PluginStatus, BadgeTone> = {
  stable: 'primary',
  beta: 'neutral',
  experimental: 'warning'
}

export function statusTone(status: PluginStatus | string): BadgeTone {
  return STATUS_TONES[status as PluginStatus] ?? 'neutral'
}

export default function StatusBadge({ status, size = 'sm', className }: {
  status: PluginStatus | string
  size?: BadgeSize
  className?: string
}) {
  return (
    <Badge tone={statusTone(status)} size={size} className={className}>
      {formatPluginStatus(status)}
    </Badge>
  )
}

/**
 * מצב מחזור-החיים של תוסף (לא סטטוס השחרור) — מה שמופיע לצד השם בעמוד התוסף ובניהול.
 * התוויות — הנוסח הקיים באתר (ניהול התוספים, באנר "גרסה ישנה" בעמוד התוסף).
 *   suspended     — מושהה (לא בחנות; גלוי רק למעלה ולמנהלים)
 *   historical    — צפייה בגרסה קודמת
 *   pendingNew    — תוסף חדש שממתין לאישור
 *   pendingUpdate — עריכה שממתינה לאישור
 */
export type PluginLifecycleState = 'suspended' | 'historical' | 'pendingNew' | 'pendingUpdate'

export const LIFECYCLE_BADGES: Record<PluginLifecycleState, { label: string; tone: BadgeTone; icon: string }> = {
  suspended: { label: 'מושהה', tone: 'error', icon: 'pause_circle' },
  historical: { label: 'גרסה ישנה', tone: 'warning', icon: 'history' },
  pendingNew: { label: 'תוסף חדש', tone: 'info', icon: 'schedule' },
  pendingUpdate: { label: 'עריכה ממתינה', tone: 'info', icon: 'schedule' }
}

export function PluginStateBadge({ state, size = 'sm', className }: {
  state: PluginLifecycleState
  size?: BadgeSize
  className?: string
}) {
  const badge = LIFECYCLE_BADGES[state]
  return (
    <Badge tone={badge.tone} size={size} icon={badge.icon} className={className}>
      {badge.label}
    </Badge>
  )
}
