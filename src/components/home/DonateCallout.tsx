import Link from 'next/link'
import SectionHeading from './SectionHeading'
import DonateAnimatedIcon from '@/components/ui/icons/DonateAnimatedIcon'

// אזור הסיום של דף הבית: קריאה מכובדת לתרומה (במקום "הצטרפו לקהילת העורכים" שהוסר — הקהילה
// אינה פעילה). ממורכז ובנוי כמו שאר האזורים (כותרת + קישוט), עם אותו כפתור טונלי בצבע התרומה
// של הכותרת העליונה. בלי ריפוד תחתון — המרווח עד הפוטר הוא ה-mt של הפוטר עצמו.
export default function DonateCallout() {
  return (
    <section aria-labelledby="donate-heading" className="px-4 pt-14 md:px-8 md:pt-20">
      <div className="container mx-auto flex max-w-3xl flex-col items-center text-center">
        <SectionHeading
          id="donate-heading"
          title="אוצריא חינמית — בזכותך"
          subtitle="הפרויקט מתוחזק בהתנדבות, והתוכנה חינמית לחלוטין ותישאר כזו לעד. תרומתך עוזרת לנו לשלם על שרתים ולהמשיך לפתח את התוכנה."
          className="mb-6!"
        />
        <Link
          href="/donate"
          prefetch={false}
          className="donation-button donation-button-lg"
        >
          <DonateAnimatedIcon strokeWidth={1.8} className="donation-button-icon donation-animated-icon" />
          לתרומה לאוצריא
        </Link>
      </div>
    </section>
  )
}
