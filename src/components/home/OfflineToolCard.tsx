import Link from 'next/link'
import IconTile from './IconTile'

// "עדכוני אוצריא" — הכלי הנפרד לעדכון מחשב לא-מקוון (/offline). אזור עצמאי ברוחב מלא:
// פס אופקי (אייקון · טקסט · כפתור) מ-md, וטור בנייד.
export default function OfflineToolCard() {
  return (
    <section aria-labelledby="offline-heading" className="px-4 md:px-8">
      <div className="container mx-auto flex max-w-6xl flex-col gap-5 rounded-lg bg-card p-6 sm:p-8 md:flex-row md:items-center md:gap-8">
        <IconTile icon="cloud_off" size="lg" />
        <div className="min-w-0 flex-1">
          <h2 id="offline-heading" className="text-2xl font-bold text-on-surface">המחשב שלכם לא מחובר לאינטרנט?</h2>
          <p className="mt-2 max-w-3xl leading-relaxed text-on-surface-variant">
            &quot;עדכוני אוצריא&quot; הוא כלי נפרד שמורידים במחשב מקוון על כונן USB, ומעדכנים
            איתו במחשב הלא-מקוון את התוכנה, את ספריית הספרים ואת התוספים, בלי חיבור לרשת.
          </p>
        </div>
        <Link
          href="/offline"
          prefetch={false}
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-secondary-container px-6 font-semibold text-on-secondary-container transition-colors hover:bg-[#f6d4ad]"
        >
          <span className="material-symbols-outlined" aria-hidden="true">usb</span>
          לכלי העדכון הלא-מקוון
        </Link>
      </div>
    </section>
  )
}
