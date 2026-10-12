import Link from 'next/link'
import IconTile from './IconTile'

// כרטיס "עדכוני אוצריא" — הכלי הנפרד לעדכון מחשב לא-מקוון (/offline).
export default function OfflineToolCard() {
  return (
    <div className="flex h-full flex-col gap-5 rounded-lg bg-card p-6 sm:p-8">
      <IconTile icon="cloud_off" size="lg" />
      <div className="flex-1">
        <h2 className="text-2xl font-bold text-on-surface">המחשב שלכם לא מחובר לאינטרנט?</h2>
        <p className="mt-3 leading-relaxed text-on-surface-variant">
          &quot;עדכוני אוצריא&quot; הוא כלי נפרד שמורידים במחשב מקוון על כונן USB, ומעדכנים
          איתו במחשב הלא-מקוון את התוכנה, את ספריית הספרים ואת התוספים, בלי חיבור לרשת.
        </p>
      </div>
      <Link
        href="/offline"
        prefetch={false}
        className="inline-flex min-h-12 items-center justify-center gap-2 self-stretch rounded-lg bg-secondary-container px-6 font-semibold text-on-secondary-container transition-colors hover:bg-[#f6d4ad] sm:self-start"
      >
        <span className="material-symbols-outlined" aria-hidden="true">usb</span>
        לכלי העדכון הלא-מקוון
      </Link>
    </div>
  )
}
