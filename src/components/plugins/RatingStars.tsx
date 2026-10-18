import { cx } from '@/components/ui/cx'

// תצוגת כוכבים לקריאה בלבד (הדירוג האינטראקטיבי — PluginRatingPanel).
//
// SVG ולא גליף: גופן האייקונים המוקטן הוא מופע סטטי FILL=0 (scripts/build-icon-font.mjs), כך
// שהגליף 'star' הוא תמיד קו מתאר — "כוכב מלא" נראה כמו ריק בצבע אחר. כאן כל כוכב הוא אותו
// מסלול: שכבה ריקה (outline-variant) ומעליה שכבה מלאה (--color-rating) בתוך <svg> מקונן שרוחבו
// לפי האחוז (חיתוך בלי clipPath ובלי id — אין hooks, ולכן גם ב-Server Component). כך גם 4.6
// מוצג במדויק. החיתוך מתחיל בצד הקריאה (ימין ב-RTL).

interface RatingStarsProps {
  /** הממוצע להצגה (0–5) */
  value: number
  size?: 'sm' | 'md' | 'lg'
  /** דקורטיבי — כשהדירוג כבר מוכרז בטקסט לצדו (RatingSummary) */
  decorative?: boolean
  className?: string
}

/** גודל כוכב אחד — הכוכבים ב-em של הגודל הזה */
const SIZE_CLASSES = {
  sm: 'text-[0.875rem]',
  md: 'text-[1.125rem]',
  lg: 'text-[1.75rem]'
} as const

const STAR_PATH =
  'M12 2.6l2.83 5.73 6.32.92-4.58 4.46 1.08 6.3L12 17.03l-5.65 2.98 1.08-6.3-4.58-4.46 6.32-.92z'
const STAR_COUNT = 5
const STAR_PITCH = 24 // רוחב תא של כוכב ב-viewBox (המסלול צר ממנו, וכך יש רווח בין הכוכבים)

export function clampRating(value: number): number {
  return Math.min(Math.max(Number(value) || 0, 0), 5)
}

export function formatRatingValue(value: number): string {
  return clampRating(value).toLocaleString('he-IL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

export default function RatingStars({ value, size = 'md', decorative = false, className }: RatingStarsProps) {
  const clamped = clampRating(value)
  const width = STAR_PITCH * STAR_COUNT
  const filled = (clamped / 5) * width
  const a11y = decorative
    ? { 'aria-hidden': true as const }
    : { role: 'img', 'aria-label': `דירוג ${clamped.toLocaleString('he-IL', { maximumFractionDigits: 1 })} מתוך 5` }

  const stars = Array.from({ length: STAR_COUNT }, (_, index) => (
    <path key={index} d={STAR_PATH} transform={`translate(${index * STAR_PITCH} 0)`} />
  ))

  return (
    <span {...a11y} className={cx('inline-flex shrink-0 leading-none', SIZE_CLASSES[size], className)}>
      <svg
        viewBox={`0 0 ${width} 24`}
        width={`${STAR_COUNT}em`}
        height="1em"
        aria-hidden="true"
        focusable="false"
        // הכוכבים בסדר הפיזי (משמאל לימין) — המילוי נחתך מימין, צד תחילת הקריאה ב-RTL
        className="block"
      >
        <g className="fill-outline-variant">{stars}</g>
        {filled > 0 && (
          <svg
            x={width - filled}
            width={filled}
            height="24"
            viewBox={`${width - filled} 0 ${filled} 24`}
            className="fill-rating"
            data-filled-ratio={clamped / 5}
          >
            {stars}
          </svg>
        )}
      </svg>
    </span>
  )
}
