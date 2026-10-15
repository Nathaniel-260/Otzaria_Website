import Card from '@/components/ui/Card'
import IconTile from '@/components/ui/IconTile'

/**
 * כרטיס מידע (לא לחיץ) — בשפת כרטיסי היכולות של דף הבית: אריח אייקון וכותרת באותה שורה,
 * והטקסט מתחתיהם לכל רוחב הכרטיס. eyebrow — שורה קטנה מעל הכותרת ("שלב 1").
 * בלי ריחוף: כרטיס שאינו לחיץ לא רומז על לחיצה.
 */
export default function OfflineInfoCard({ as = 'li', icon, title, eyebrow, children }) {
  return (
    <Card as={as} padding="md" className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-3">
        <IconTile icon={icon} size="md" />
        <div className="min-w-0">
          {eyebrow && <p className="text-label-md text-primary">{eyebrow}</p>}
          <h3 className="text-title-md text-on-surface">{title}</h3>
        </div>
      </div>
      <p className="text-body-sm text-on-surface-variant sm:text-body-md">{children}</p>
    </Card>
  )
}
