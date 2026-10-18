'use client'

import Button from '@/components/ui/Button'
import { buttonClasses, type ButtonSize, type ButtonVariant } from '@/components/ui/buttonStyles'
import { cx } from '@/components/ui/cx'
import DirectInstallButton from '@/components/plugins/DirectInstallButton'
import type { DirectInstallState } from '@/components/plugins/useDirectInstall'

/**
 * צמד הפעולות של תוסף — "הורדה" (קישור לקובץ, בלשונית חדשה) ו"התקנה ישירה" (otzaria:// דרך
 * useDirectInstall) — במראה אחד בכרטיס, בשורת תוצאת חיפוש ובעמוד התוסף.
 *
 * שינוי חזותי בלבד: ה-URL של ההורדה (plugin.downloadUrl), target="_blank", והלוגיקה של
 * ההתקנה (DirectInstallButton + ה-hook שבדף) — בדיוק כמו קודם. האפליקציה ושרת ההתקנה צורכים
 * אותם (refactor-notes/audit/external-api-consumers.md) — לא לשנות כאן URL או זרימה.
 *
 * emphasis — איזה כפתור "מוביל" באזור:
 *   card   — שניהם משניים (tonal + outlined): ברשת של כרטיסים אין "פעולה ראשית אחת", ושורה של
 *            20 כפתורים מלאים מכבידה על הדף.
 *   page   — עמוד התוסף: ההורדה filled (הפעולה הראשית של העמוד), ההתקנה outlined.
 * layout — row: זה לצד זה, כל אחד גדל (כרטיס, עמוד); stack: אחד מעל השני (עמודת פעולות בשורת חיפוש
 *   מ-sm).
 */
type Emphasis = 'card' | 'page'

const VARIANTS: Record<Emphasis, { download: ButtonVariant; install: ButtonVariant; size: ButtonSize }> = {
  card: { download: 'tonal', install: 'outlined', size: 'sm' },
  page: { download: 'filled', install: 'outlined', size: 'md' }
}

export interface InstallablePlugin {
  id: string
  downloadUrl: string
  supportsDirectInstall?: boolean
}

export function canDirectInstall(plugin: InstallablePlugin): boolean {
  return Boolean(plugin.supportsDirectInstall && plugin.downloadUrl)
}

export default function PluginInstallActions({
  plugin,
  installState,
  onInstall,
  emphasis = 'card',
  layout = 'row',
  installLabel,
  className
}: {
  plugin: InstallablePlugin
  installState: DirectInstallState
  onInstall: () => void
  emphasis?: Emphasis
  layout?: 'row' | 'stack'
  /** הטקסט של כפתור ההתקנה במצב רגיל (עמוד התוסף: "התקנה ישירה לאוצריא") */
  installLabel?: string
  className?: string
}) {
  const { download, install, size } = VARIANTS[emphasis]
  const grow = layout === 'row' ? 'flex-[1_1_auto] min-w-fit' : 'w-full'

  return (
    <div className={cx('flex gap-2', layout === 'row' ? 'flex-wrap' : 'flex-col', className)}>
      <Button href={plugin.downloadUrl} external variant={download} size={size} icon="download" className={grow}>
        הורדה
      </Button>
      {canDirectInstall(plugin) && (
        <DirectInstallButton
          pluginId={plugin.id}
          installState={installState}
          onInstall={onInstall}
          showIcons
          idleLabel={installLabel}
          // הגליפים ש-DirectInstallButton מרנדר (span של material-symbols) — בגודל אייקון הכפתור;
          // מושבת (בזמן "מתקין…") — בלי ריחוף ובשקיפות של כפתור מושבת
          className={cx(
            buttonClasses({ variant: install, size }),
            size === 'sm'
              ? '[&_.material-symbols-outlined]:text-(length:--button-icon-size-sm)'
              : '[&_.material-symbols-outlined]:text-(length:--button-icon-size-md)',
            'text-center disabled:cursor-default disabled:opacity-(--button-disabled-opacity)',
            grow
          )}
        />
      )}
    </div>
  )
}
