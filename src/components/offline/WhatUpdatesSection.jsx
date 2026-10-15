import AppIcon from '@/components/ui/AppIcon'
import Card from '@/components/ui/Card'
import Section from '@/components/ui/Section'
import SectionHeading from '@/components/ui/SectionHeading'
import OfflineInfoCard from './OfflineInfoCard'

const MODULES = [
  {
    icon: 'system_update_alt',
    title: 'תוכנת אוצריא',
    text: 'הכלי מזהה את הגרסה שמותקנת אצלך, ומתקין או מעדכן את אוצריא מתוך הכונן.'
  },
  {
    icon: 'library_books',
    title: 'ספריית הספרים',
    text: 'לא צריך להוריד שוב את כל הספרייה, שגודלה כמה GB. מספיקים קובצי עדכון קטנים, בדרך כלל עשרות MB.'
  },
  {
    icon: 'extension',
    title: 'תוספים',
    text: 'חנות תוספים שעובדת בלי אינטרנט. הקטלוג מועתק מהאתר אל הכונן, ומשם תתקין תוספים ישר לתוך אוצריא.'
  }
]

const EXTRAS = [
  {
    icon: 'apps',
    title: 'תוכנות נוספות',
    text: 'רוצה להעביר גם תוכנות אחרות משלך? הוסף אותן לכונן, והן יעברו יחד עם העדכונים.'
  },
  {
    icon: 'flag',
    title: 'דיווחי טעויות',
    text: 'דיווחים על טעויות בספרים, בתוכנה ובתוספים, שלא נשלחו מהמחשב בלי האינטרנט, נאספים באישורך ונשלחים אחר כך מהמחשב המחובר.'
  }
]

// שלושת הרכיבים המרכזיים ככרטיסים, ו"ועוד" — שתי יכולות משניות בתיבה טונלית שקטה אחת
export default function WhatUpdatesSection() {
  return (
    <Section labelledBy="updates-heading">
      <SectionHeading id="updates-heading" title="מה אפשר לעדכן" />
      <ul className="grid gap-3 sm:gap-4 md:grid-cols-3">
        {MODULES.map((item) => (
          <OfflineInfoCard key={item.title} icon={item.icon} title={item.title}>{item.text}</OfflineInfoCard>
        ))}
      </ul>

      <Card tone="tonal" padding="md" className="mt-3 sm:mt-4">
        <h3 className="mb-3 text-title-sm text-on-surface">ועוד</h3>
        <ul className="grid gap-4 md:grid-cols-2 md:gap-8">
          {EXTRAS.map((item) => (
            <li key={item.title} className="flex items-start gap-3">
              <AppIcon name={item.icon} className="mt-0.5 shrink-0 text-2xl text-on-tile" />
              <div className="min-w-0">
                <h4 className="text-title-sm text-on-surface">{item.title}</h4>
                <p className="mt-0.5 text-body-sm text-on-surface-variant">{item.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </Section>
  )
}
