import Link from 'next/link'

// קריאה מכובדת לתרומה — במקום אזור "הצטרפו לקהילת העורכים" שהוסר (הקהילה אינה פעילה).
// כרטיס AppCard עם אריח בגוון התרומה, ואותו כפתור מלא בצבע התרומה של הכותרת.
export default function DonateCallout() {
  return (
    <div className="relative flex h-full flex-col gap-5 overflow-hidden rounded-lg bg-card p-6 sm:p-8">
      <span
        aria-hidden="true"
        className="inline-flex h-14 w-14 items-center justify-center rounded-lg bg-donation/10 text-donation"
      >
        <span className="material-symbols-outlined text-[30px]">handshake</span>
      </span>
      <div className="flex-1">
        <h2 className="text-2xl font-bold text-on-surface">אוצריא חינמית — בזכותכם</h2>
        <p className="mt-3 leading-relaxed text-on-surface-variant">
          הפרויקט מתוחזק בהתנדבות, והתוכנה חינמית לחלוטין ותישאר כזו לעד. תרומתכם עוזרת
          לנו לשלם על שרתים ולהמשיך לפתח את התוכנה.
        </p>
      </div>
      <Link
        href="/donate"
        prefetch={false}
        className="inline-flex min-h-12 items-center justify-center gap-2 self-stretch rounded-lg bg-donation px-6 font-semibold text-white transition-colors hover:bg-donation-strong sm:self-start"
      >
        <span className="material-symbols-outlined" aria-hidden="true">volunteer_activism</span>
        לתרומה לאוצריא
      </Link>
    </div>
  )
}
