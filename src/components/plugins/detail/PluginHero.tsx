import type { ReactNode } from 'react'
import PluginImage from '@/components/plugins/PluginImage'
import StatusBadge, { PluginStateBadge } from '@/components/plugins/StatusBadge'
import SectionHeading from '@/components/ui/SectionHeading'
import { cx } from '@/components/ui/cx'
import PluginKeyFacts from './PluginKeyFacts'
import { heroDescription } from './pluginDetailModel'
import type { Plugin } from './types'

/**
 * ראש עמוד התוסף — כל מה שצריך כדי להחליט, מעל הקפל (S13), בסדר קבוע:
 *
 *   [אייקון]  שם התוסף (h1)                       ← בנייד: האייקון (72) לצד השם
 *             ─•─                                   ← מ-sm: אייקון 120, וכל העמודה לצדו
 *             [יציב] [מושהה]
 *             תיאור קצר
 *             [הורדה] [התקנה ישירה לאוצריא]
 *             מקור · ערוך · השהה                    ← פעולות משניות, שקטות
 *   ┌ דירוג │ הורדות │ גרסה │ תאימות │ מפתח ┐       ← רצועת נתוני המפתח, לכל הרוחב
 *
 * האייקון alt="" — שם התוסף כתוב ב-h1 שלצדו (PluginImage). priority — מועמד ל-LCP.
 */
export default function PluginHero({ plugin, titleId, actions, secondaryActions, className }: {
  plugin: Plugin
  titleId: string
  actions: ReactNode
  secondaryActions?: ReactNode
  className?: string
}) {
  const description = heroDescription(plugin)
  return (
    <div className={className}>
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 sm:gap-x-6 md:gap-x-8">
        <PluginImage src={plugin.image} size="lg" responsive="xl" priority className="sm:row-span-4" />

        <div className="flex min-w-0 flex-col justify-center sm:block">
          <SectionHeading
            as="h1"
            id={titleId}
            title={<span className="break-words">{plugin.name}</span>}
            size="lg"
            align="start"
            spacing="none"
          />
        </div>

        <div className="col-span-2 mt-4 flex flex-wrap items-center gap-2 sm:col-span-1 sm:col-start-2">
          <StatusBadge status={plugin.status} size="md" />
          {plugin.isSuspended && <PluginStateBadge state="suspended" size="md" />}
          {plugin.isHistoricalVersion && <PluginStateBadge state="historical" size="md" />}
        </div>

        {description && (
          <p className="col-span-2 mt-3 max-w-measure whitespace-pre-line break-words text-body-md text-on-surface-variant sm:col-span-1 sm:col-start-2 md:text-body-lg">
            {description}
          </p>
        )}

        <div className="col-span-2 mt-5 flex flex-col gap-2 sm:col-span-1 sm:col-start-2">
          {actions}
          {secondaryActions}
        </div>
      </div>

      <PluginKeyFacts plugin={plugin} className={cx('mt-6 md:mt-8')} />
    </div>
  )
}
