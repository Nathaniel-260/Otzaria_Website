import Section from '@/components/ui/Section'
import SectionHeading from '@/components/ui/SectionHeading'
import OfflineInfoCard from './OfflineInfoCard'

const STEPS = [
  {
    icon: 'download',
    title: 'הורד במחשב מחובר',
    text: 'הפעל את הכלי מהכונן ובחר מה להוריד: התוכנה, הספרייה או תוספים. הכול נשמר בתיקייה OtzariaData שעל הכונן.'
  },
  {
    icon: 'usb',
    title: 'העבר את הכונן',
    text: 'חבר את הכונן למחשב בלי האינטרנט, והפעל ממנו את הכלי. אין צורך להתקין דבר.'
  },
  {
    icon: 'task_alt',
    title: 'בחר ועדכן',
    text: 'הכלי מזהה מה מותקן אצלך ומראה מה ממתין. בחר ואשר. העדכון מותקן מהכונן בלבד, בלי רשת.'
  }
]

// שלושת השלבים — רשימה ממוספרת (ol): הסדר הוא חלק מהמשמעות
export default function HowItWorksSection() {
  return (
    <Section labelledBy="how-heading">
      <SectionHeading id="how-heading" title="איך זה עובד" subtitle="שלושה שלבים וכונן USB אחד" />
      <ol className="grid gap-3 sm:gap-4 md:grid-cols-3">
        {STEPS.map((step, index) => (
          <OfflineInfoCard key={step.title} icon={step.icon} title={step.title} eyebrow={`שלב ${index + 1}`}>
            {step.text}
          </OfflineInfoCard>
        ))}
      </ol>
    </Section>
  )
}
