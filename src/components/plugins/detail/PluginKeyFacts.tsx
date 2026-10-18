import type { ReactNode } from 'react'
import RatingStars, { formatRatingValue } from '@/components/plugins/RatingStars'
import Ltr from '@/components/ui/Ltr'
import { cx } from '@/components/ui/cx'
import { formatCount } from './pluginDetailModel'
import type { Plugin } from './types'

/**
 * נתוני המפתח של התוסף — רצועה אחת מעל הקפל (S13): דירוג · הורדות · גרסה · תאימות · מפתח.
 * כל נתון בתא קבוע: תווית שקטה למעלה, הערך בולט מתחתיו (וכוכבים מתחת לדירוג) — העין רצה בקו אחד.
 * <dl> — כל זוג תווית/ערך מוכרז יחד. דירוג מוצג רק כשיש דירוגים (בלי "0 כוכבים").
 *
 * פריסה: בנייד 3 עמודות (התא האחרון מתמתח על מה שנשאר בשורה, כדי שלא יישאר חור); מ-sm — שורה
 * אחת, תא לכל נתון, עם קו הפרדה דק ביניהם.
 */
type Fact = { key: string; label: string; value: ReactNode; sub?: ReactNode; title?: string }

const SM_COLUMNS: Record<number, string> = {
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
  5: 'sm:grid-cols-5'
}

/** כמה עמודות התא האחרון תופס בנייד (רשת של 3) */
function lastSpan(count: number): string {
  const rest = count % 3
  if (rest === 1) return 'col-span-3 sm:col-span-1'
  if (rest === 2) return 'col-span-2 sm:col-span-1'
  return ''
}

export function buildKeyFacts(plugin: Pick<Plugin,
  'ratingAvg' | 'ratingCount' | 'downloadCount' | 'version' | 'compatibleWith' | 'author'
>): Fact[] {
  const facts: Fact[] = []
  const ratingCount = plugin.ratingCount || 0
  if (ratingCount > 0) {
    const value = formatRatingValue(plugin.ratingAvg || 0)
    facts.push({
      key: 'rating',
      label: 'דירוג',
      title: `דירוג ממוצע מתוך ${ratingCount} מדרגים`,
      value: (
        <>
          <span aria-hidden="true">{value}</span>
          <span className="sr-only">{`דירוג ממוצע ${value} מתוך 5, מתוך ${ratingCount} מדרגים`}</span>
        </>
      ),
      sub: (
        <span aria-hidden="true" className="inline-flex items-center gap-1">
          <RatingStars value={plugin.ratingAvg || 0} size="sm" decorative />
          <span className="tabular-nums">({formatCount(ratingCount)})</span>
        </span>
      )
    })
  }
  facts.push({ key: 'downloads', label: 'הורדות', value: formatCount(plugin.downloadCount) })
  facts.push({ key: 'version', label: 'גרסה', value: <Ltr>{plugin.version}</Ltr> })
  if (plugin.compatibleWith) {
    facts.push({ key: 'compat', label: 'תאימות', value: <Ltr>{plugin.compatibleWith}</Ltr> })
  }
  if (plugin.author) {
    facts.push({ key: 'author', label: 'מפתח', value: plugin.author, title: plugin.author })
  }
  return facts
}

export default function PluginKeyFacts({ plugin, className }: {
  plugin: Parameters<typeof buildKeyFacts>[0]
  className?: string
}) {
  const facts = buildKeyFacts(plugin)
  return (
    <dl
      className={cx(
        'grid grid-cols-3 gap-y-3 rounded-(--card-radius) bg-(--card-bg) py-3 sm:gap-y-0 sm:py-4',
        SM_COLUMNS[facts.length],
        className
      )}
    >
      {facts.map((fact, index) => (
        <div
          key={fact.key}
          data-fact={fact.key}
          title={fact.title}
          className={cx(
            'flex min-w-0 flex-col items-center gap-0.5 px-2 text-center sm:px-3',
            // קו הפרדה בין תאים — בתוך שורה (מ-sm כל התאים בשורה אחת)
            index > 0 && 'sm:border-s sm:border-outline-variant',
            index % 3 !== 0 && 'border-s border-outline-variant sm:border-s',
            index === facts.length - 1 && lastSpan(facts.length)
          )}
        >
          <dt className="text-label-sm font-normal text-on-surface-variant">{fact.label}</dt>
          <dd className="flex min-w-0 max-w-full flex-col items-center gap-0.5">
            <span className="max-w-full truncate text-title-md tabular-nums text-on-surface">{fact.value}</span>
            {fact.sub && <span className="text-label-sm font-normal text-on-surface-variant">{fact.sub}</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}
