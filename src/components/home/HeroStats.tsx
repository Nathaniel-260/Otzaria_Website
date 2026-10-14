import type { CSSProperties } from 'react'
import { formatExactNumber, formatStatParts } from '@/lib/homeStats/homeStats'
import { narrowColumns, startsNarrowRow } from './heroStatsLayout'

// שורת המספרים שבמסך הפתיחה ("אוצריא במספרים") — תצוגה בלבד; השליפה ב-HeroStatsLoader.
//
// שורה נקייה ולא כרטיסים: מספר גדול, תווית קטנה מתחתיו, וקווי הפרדה דקים בין הפריטים.
// מספר הפריטים משתנה (עד ארבעה נתונים ועוד הגרסה; מקור שנכשל מוסתר), ולכן כולם תמיד בשורה אחת ברוחב שווה, והשורה
// כולה ברוחב שנגזר ממספרם (--stat-count × 13rem, לכל היותר רוחב המכל) — שני נתונים לא
// "נמרחים" על כל המסך. גודל המספר נגזר מרוחב הפריט (cqi של ה-@container), כך שגם ארבעה
// פריטים ב-360px נכנסים.
// מספר גדול מקוצר ("5.8 מיליון", ראו formatStatParts); לקוראי מסך — המספר המדויק.
//
// במסך צר (narrow, מתחת ל-400px) — מארבעה פריטים שתי שורות מאוזנות (5 → 3+2, השורה התחתונה
// ממורכזת), כל פריט ברוחב 1/--stat-cols, ובלי קו הפרדה בראש כל שורה (heroStatsLayout.ts).
//
// הגרסה האחרונה (version) — פריט אחרון בשורה, זהה לשאר בצבע, במשקל ובמבנה (ערך גדול,
// "גרסה" מתחת), כך שהיא משתלבת בשורה ולא בולטת ממנה. בסוף השורה — כדי לא לקטוע את רצף
// הנתונים הכמותיים. בלי גרסה (GitHub לא זמין) — הפריט פשוט לא מוצג, כמו כל נתון שנכשל.

export type StatItem = {
  key: string
  label: string
  value: number
}

/** הגובה שהשורה תופסת — משותף לשורה עצמה ולשומר המקום שלה, כדי שלא תהיה קפיצת layout.
 *  במסך צר — שתי שורות (המקרה הרגיל: ארבעה נתונים וגרסה), כל אחת נמוכה יותר (התוויות
 *  בשורה אחת ברוחב שליש), ועוד הרווח ביניהן. */
export const HERO_STATS_MIN_HEIGHT =
  'min-h-[4.25rem] narrow:min-h-[calc(2.75rem*2+var(--stats-row-gap))] sm:min-h-[4.75rem] 2xl:min-h-[5.5rem]'

/** הרווח בין שתי השורות במסך צר. */
const ROW_GAP = '[--stats-row-gap:--spacing(5)]'

const ITEM_CLASS =
  '@container flex min-w-0 flex-1 flex-col-reverse items-center justify-end gap-1 border-s border-outline-variant px-2 text-center first:border-s-0 narrow:flex-none narrow:basis-[calc(100%/var(--stat-cols))] sm:px-4'
/** פריט שפותח שורה במסך צר — בלי קו הפרדה */
const ROW_START_CLASS = 'narrow:border-s-0'
const LABEL_CLASS = 'text-balance text-xs leading-snug text-on-surface-variant sm:text-sm lg:text-base 2xl:text-lg'
const VALUE_CLASS =
  'whitespace-nowrap font-bold leading-none tabular-nums text-on-surface text-[clamp(1.25rem,18cqi,2.375rem)] 2xl:text-[clamp(1.25rem,18cqi,2.875rem)]'

export default function HeroStats({ items, version = null, className = '' }: {
  items: StatItem[]
  version?: string | null
  className?: string
}) {
  const count = items.length + (version ? 1 : 0)
  if (count === 0) return null
  const itemClass = (index: number) => `${ITEM_CLASS} ${startsNarrowRow(index, count) ? ROW_START_CLASS : ''}`

  return (
    <dl
      aria-label="אוצריא במספרים"
      style={{ '--stat-count': count, '--stat-cols': narrowColumns(count) } as CSSProperties}
      className={`animate-enter-fade mx-auto flex w-full max-w-[calc(var(--stat-count)*13rem)] items-start ${ROW_GAP} narrow:flex-wrap narrow:justify-center narrow:gap-y-(--stats-row-gap) ${HERO_STATS_MIN_HEIGHT} ${className}`}
    >
      {items.map((item, index) => {
        const parts = formatStatParts(item.value)
        return (
          <div key={item.key} className={itemClass(index)}>
            <dt className={LABEL_CLASS}>{item.label}</dt>
            <dd className={VALUE_CLASS}>
              <span aria-hidden="true" data-testid="hero-stat-value">
                {parts.number}
                {parts.unit && <span className="ms-1 text-[0.55em] font-semibold">{parts.unit}</span>}
              </span>
              <span className="sr-only">{formatExactNumber(item.value)}</span>
            </dd>
          </div>
        )
      })}
      {version && (
        <div className={itemClass(items.length)}>
          <dt className={LABEL_CLASS}>גרסה</dt>
          <dd className={VALUE_CLASS} data-testid="hero-stat-version">
            <bdi dir="ltr">{version}</bdi>
          </dd>
        </div>
      )}
    </dl>
  )
}

/** שומר מקום בזמן שהנתונים נטענים (Suspense) — באותו גובה, בלי תוכן. */
export function HeroStatsPlaceholder({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`w-full ${ROW_GAP} ${HERO_STATS_MIN_HEIGHT} ${className}`} />
}
