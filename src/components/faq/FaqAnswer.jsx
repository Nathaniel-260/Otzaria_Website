import Link from 'next/link'
import { cx } from '@/components/ui/cx'
import { FOCUS_RING } from '@/components/ui/focusRing'
import FaqText from './FaqText'
import { splitAnswerLink } from './faqContent'

// קישור בתוך פסקה: בצבע הראשי ועם קו תחתון (לא רק צבע — AA בלי להסתמך על צבע בלבד), כמו
// הקישורים בשורת הטקסט ב-/offline וב-404. rounded-control — טבעת הפוקוס עוטפת את המילים בעיגול.
const INLINE_LINK = cx(
  'rounded-control font-semibold text-primary underline underline-offset-4 hover:text-primary-hover',
  FOCUS_RING
)

/**
 * תשובה לשאלה: טקסט, ובמקום הטוקן {link} — קישור פנימי (next/link) לפי faq.link. בלי HTML
 * בנתונים: הקישור נבנה כאן. מונחים לועזיים מבודדים (FaqText) גם בטקסט וגם בנוסח הקישור.
 * prefetch={false} — כמו בתפריט העליון: דף הבית כבד, ונטען רק אם לוחצים.
 */
export default function FaqAnswer({ faq }) {
  return splitAnswerLink(faq.answer, faq.link).map((part, i) =>
    part.type === 'link' ? (
      <Link key={i} href={part.href} prefetch={false} className={INLINE_LINK}>
        <FaqText text={part.label} />
      </Link>
    ) : (
      <FaqText key={i} text={part.text} />
    )
  )
}
