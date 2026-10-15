import Card from '@/components/ui/Card'
import IconTile from '@/components/ui/IconTile'

// כרטיס יכולת — AppCard של אוצריא (ui/Card): משטח card, בלי מסגרת ובלי צל.
// הכותרת בשורת האריח (האריח לצדה, ממורכזים אנכית), והתיאור מתחתיהם לכל רוחב הכרטיס —
// כך הכרטיס נמוך יותר, והכותרת נקראת מיד יחד עם האייקון שלה.
// הריחוף (card-selected) על כרטיס שאינו לחיץ — נשמר כפי שהיה; ראו design-system.md (שאלות פתוחות).
export default function FeatureCard({ icon, title, description, index = 0 }: {
  icon: string
  title: string
  description: string
  index?: number
}) {
  return (
    <Card
      padding="md"
      style={{ animationDelay: `${index * 0.06}s` }}
      className="flex w-full flex-col gap-3 transition-colors duration-200 hover:bg-card-selected animate-enter-up"
    >
      <div className="flex items-center gap-3">
        <IconTile icon={icon} size="md" />
        <h3 className="min-w-0 text-lg font-bold leading-snug text-on-surface">{title}</h3>
      </div>
      <p className="text-sm leading-relaxed text-on-surface-variant sm:text-base">{description}</p>
    </Card>
  )
}
