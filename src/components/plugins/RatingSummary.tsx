import RatingStars, { formatRatingValue } from '@/components/plugins/RatingStars'
import { cx } from '@/components/ui/cx'

/**
 * סיכום דירוג בשורה אחת: כוכבים, הממוצע ומספר המדרגים — "★★★★★ 4.6 (12)".
 * לא מרנדר דבר כשאין דירוגים (count = 0), כדי שלא יוצג "0 כוכבים" (כמו בכרטיס עד היום).
 *
 * נגישות: הכוכבים והמספרים הגלויים aria-hidden, ובמקומם משפט אחד ל-sr-only, שנבנה מהנוסח הקיים
 * ("דירוג ממוצע מתוך N מדרגים") — כך קורא המסך לא מקריא "דירוג 4.6 מתוך 5, 4.6, 12".
 * size — sm בכרטיס ובשורת תוצאה; md בכותרת עמוד התוסף.
 */
export default function RatingSummary({ avg, count, size = 'sm', className }: {
  avg?: number
  count?: number
  size?: 'sm' | 'md'
  className?: string
}) {
  const ratingCount = count || 0
  if (ratingCount <= 0) return null
  const value = formatRatingValue(avg || 0)
  return (
    <span
      title={`דירוג ממוצע מתוך ${ratingCount} מדרגים`}
      className={cx(
        'inline-flex items-center gap-1.5 whitespace-nowrap text-on-surface-variant',
        size === 'sm' ? 'text-label-md' : 'text-label-lg',
        className
      )}
    >
      <RatingStars value={avg || 0} size={size} decorative />
      <span aria-hidden="true" className="tabular-nums">
        <span className="text-on-surface">{value}</span> ({ratingCount.toLocaleString('he-IL')})
      </span>
      <span className="sr-only">{`דירוג ממוצע ${value} מתוך 5, מתוך ${ratingCount} מדרגים`}</span>
    </span>
  )
}
