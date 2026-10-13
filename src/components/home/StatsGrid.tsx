import StatCircle from './StatCircle'
import SectionHeading from './SectionHeading'

// רשת הנתונים (כרטיסי AppCard; הרכיב עדיין נקרא StatCircle מסיבות היסטוריות) של "אוצריא במספרים" — תצוגה בלבד, בלי שליפת נתונים (זו ב-StatsSection),
// כדי שניתן יהיה לבדוק אותה ישירות. אין פריטים → לא מרנדרים את האזור כלל.

export type StatItem = {
  key: string
  icon: string
  label: string
  value: number
}

export default function StatsGrid({ items }: { items: StatItem[] }) {
  if (items.length === 0) return null

  return (
    <section id="stats" aria-labelledby="stats-heading" className="px-4 py-14 md:px-8 md:py-16">
      <div className="container mx-auto max-w-6xl">
        <SectionHeading id="stats-heading" title="אוצריא במספרים" />
        {/* מספר הנתונים משתנה (3–5: מקור שנכשל מוסתר), ולכן flex-wrap עם grow ולא grid:
            נייד — שניים בשורה, טבלט — שלושה, והשורה האחרונה מתמלאת תמיד לרוחב מלא
            (בלי כרטיס יתום בפינה); דסקטופ (lg) — כולם בשורה אחת. כל כרטיס הוא container,
            וגודל המספר נגזר מרוחבו (StatCircle), כך שגם חמישה כרטיסים צרים מכילים מספר בן 7 ספרות */}
        <ul className="flex flex-wrap gap-3 sm:gap-4 lg:flex-nowrap">
          {items.map((item, index) => (
            <li
              key={item.key}
              className="@container flex min-w-0 grow basis-[calc(50%-0.75rem)] md:basis-[calc(33.333%-1rem)] lg:basis-0"
            >
              <StatCircle icon={item.icon} label={item.label} value={item.value} index={index} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
