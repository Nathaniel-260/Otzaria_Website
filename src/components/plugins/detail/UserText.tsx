import { cx } from '@/components/ui/cx'
import { splitUserText } from './pluginDetailModel'

/**
 * טקסט חופשי שהמפתח הזין (תיאור קצר / מלא) — <p> לכל פסקה ו-<span class="block"> לכל שורה.
 * כל שורה בלוק נפרד עם dir="auto": כיוון לפי התוכן שלה (שורה אנגלית — הנקודה בסוף), ולחיצה כפולה/
 * משולשת בוחרת רק בתוך השורה. text-right — היישור נשאר לימין כמו שאר העמוד, גם לשורה באנגלית.
 * ירידות השורה של המפתח נשמרות (issue #175) — splitUserText.
 */
export default function UserText({ text, className, paragraphClassName }: {
  text: string
  /** על העוטף — צבע, גודל, רוחב */
  className?: string
  /** רווח בין פסקאות (ברירת מחדל mt-3 מהשנייה) */
  paragraphClassName?: string
}) {
  const paragraphs = splitUserText(text)
  if (paragraphs.length === 0) return null
  return (
    <div className={cx('break-words', className)}>
      {paragraphs.map((lines, p) => (
        <p key={p} className={cx(p > 0 && (paragraphClassName ?? 'mt-3'))}>
          {lines.map((line, l) => (
            <span key={l} dir="auto" className="block text-right">
              {/* שורה ריקה בתוך פסקה (רווחים בלבד) — שומרת גובה */}
              {line || ' '}
            </span>
          ))}
        </p>
      ))}
    </div>
  )
}
