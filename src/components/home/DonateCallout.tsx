import Link from 'next/link'
import SectionHeading from './SectionHeading'

// אזור הסיום של דף הבית: קריאה מכובדת לתרומה (במקום "הצטרפו לקהילת העורכים" שהוסר — הקהילה
// אינה פעילה). ממורכז ובנוי כמו שאר האזורים (כותרת + קישוט), עם אותו כפתור מלא בצבע התרומה
// של הכותרת העליונה. בלי ריפוד תחתון — המרווח עד הפוטר הוא ה-mt של הפוטר עצמו.
export default function DonateCallout() {
  return (
    <section aria-labelledby="donate-heading" className="px-4 pt-14 md:px-8 md:pt-20">
      <div className="container mx-auto flex max-w-3xl flex-col items-center text-center">
        <SectionHeading
          id="donate-heading"
          title="אוצריא חינמית — בזכותכם"
          subtitle="הפרויקט מתוחזק בהתנדבות, והתוכנה חינמית לחלוטין ותישאר כזו לעד. תרומתכם עוזרת לנו לשלם על שרתים ולהמשיך לפתח את התוכנה."
          className="mb-6!"
        />
        <Link
          href="/donate"
          prefetch={false}
          className="donation-button donation-button-lg"
        >
          <span className="material-symbols-outlined donation-button-icon" aria-hidden="true">volunteer_activism</span>
          לתרומה לאוצריא
        </Link>
      </div>
    </section>
  )
}
