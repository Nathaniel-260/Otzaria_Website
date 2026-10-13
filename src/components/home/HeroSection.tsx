import Link from 'next/link'
import IntentPrefetchLink from '@/components/ui/IntentPrefetchLink'
import GoldenBook from './GoldenBook'

// גיבור דף הבית — כיוון "האפליקציה עצמה": שטוח ושקט. הספר המוזהב של אוצריא נפתח בתוך
// הילה חמה (GoldenBook, כמו מסך הפתיחה של המתקין) כאלמנט עצמאי לצד הכותרת, עם קישוט הכותרת (קו +
// נקודת זהב) וכפתור ראשי מלא + כפתור טונלי.
// נייד: הספר מעל הטקסט, ממורכז. מ-md: שתי עמודות — הספר מימין (עמודה ברוחב הספר בלבד, לא חצי
// מסך) והטקסט משמאלו (עד 36rem); הזוג כולו ממורכז, כך שהספר לא נדחק לקצה המסך. מ-2xl (1536px)
// כל האזור גדל (ספר, כותרת, טקסט עד 44rem), יחד עם הרחבת כל מכלי הדף ל-max-w-7xl.
const PLATFORMS = ['Windows', 'macOS', 'Linux', 'Android', 'iOS']

const BUTTON_BASE =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-6 text-base font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

export default function HeroSection() {
  // מ-md: האזור כולו נכנס במסך הראשון (100svh פחות הכותרת העליונה, --site-header-height; לכל היותר 52rem, כדי שבמסך גבוה לא ייווצר ריק), והתוכן ממורכז
  // בו אנכית. במסך נמוך (short, ראו layout.css) המרווחים והגדלים מתכווצים כדי שגם שורת המערכות
  // תיראה בלי גלילה.
  return (
    <section className="overflow-hidden px-4 pb-14 pt-8 sm:pt-12 md:flex md:min-h-[min(calc(100svh-var(--site-header-height)),52rem)] md:items-center md:px-8 md:py-12 short:py-6">
      <div className="container mx-auto grid w-full max-w-5xl items-center justify-center gap-6 md:grid-cols-[auto_minmax(0,36rem)] md:gap-10 lg:gap-16 2xl:max-w-7xl 2xl:grid-cols-[auto_minmax(0,44rem)] 2xl:gap-24">
        {/* ראשון ב-DOM: בנייד מעל הטקסט, ומ-md (RTL) בעמודה הימנית — הטקסט משמאלו */}
        <div>
          <GoldenBook className="w-36 sm:w-44 md:w-48 lg:w-56 xl:w-64 2xl:w-80 short:w-44 short:lg:w-52" />
        </div>

        <div className="flex flex-col items-center text-center md:items-start md:text-start">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-secondary-container px-3 py-1.5 text-sm font-medium text-on-secondary-container">
            <span className="material-symbols-outlined text-lg" aria-hidden="true">library_books</span>
            מעל 7,000 ספרי קודש
          </span>

          {/* עטיפה ברוחב הכותרת — הקישוט נמתח לכל רוחב המילה, כמו בבלוק הכותרת של המתקין */}
          <div className="mt-5 flex w-fit flex-col short:mt-3">
            <h1 className="text-5xl font-bold leading-none text-on-surface sm:text-6xl lg:text-7xl 2xl:text-8xl short:lg:text-6xl">
              אוצריא
            </h1>
            <span className="title-ornament mt-5 [--ornament-ratio:100%] short:mt-3" aria-hidden="true" />
          </div>

          <p className="mt-5 text-balance text-xl font-medium leading-snug text-on-surface sm:text-2xl lg:text-[1.75rem] 2xl:text-[2.125rem] short:mt-3 short:lg:text-2xl">
            תנ״ך, ש״ס ופוסקים בספרייה אחת
          </p>

          <p className="mt-4 max-w-xl text-base leading-relaxed text-on-surface-variant lg:text-lg 2xl:max-w-2xl 2xl:text-xl short:mt-3 short:lg:text-base">
            הספרים נבחרו בקפידה. פתחו גמרא בצורת הדף, עיינו במפרשים לצד הטקסט וחפשו בכל
            הספרים במהירות ובקלות, במחשב ובנייד.
          </p>

          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row short:mt-5">
            {/* עוגן באותו דף — <a> רגיל. כ-Link, Next התייחס אליו כמסלול
                ופתח בקשות RSC ספקולטיביות לדף הנוכחי. */}
            <a href="#download" className={`${BUTTON_BASE} bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-pressed`}>
              <span className="material-symbols-outlined text-[22px]" aria-hidden="true">download</span>
              הורידו בחינם
            </a>
            <Link
              href="/about"
              prefetch={false}
              className={`${BUTTON_BASE} bg-secondary-container text-on-secondary-container hover:bg-[#f6d4ad]`}
            >
              <span className="material-symbols-outlined text-[22px]" aria-hidden="true">info</span>
              אודות הספרייה
            </Link>
          </div>

          {/* prefetch רק בכוונה (ריחוף/פוקוס/נגיעה): ברירת המחדל הורידה את ה-RSC
              וה-JS של /library בכל טעינה של דף הבית (5 בקשות, כ-27KB) */}
          <IntentPrefetchLink
            href="/library"
            className="mt-3 inline-flex min-h-12 items-center gap-1 rounded-lg px-2 text-sm font-medium text-primary hover:bg-card-selected short:mt-1"
          >
            לפרוייקט ספריית אוצריא
            <span className="material-symbols-outlined text-lg" aria-hidden="true">chevron_left</span>
          </IntentPrefetchLink>

          {/* רשימה לטינית — כולה LTR, כדי שהסדר והמפרידים לא יתהפכו בתוך שורה עברית */}
          <ul
            dir="ltr"
            className="mt-5 flex flex-wrap justify-center gap-x-2 gap-y-1 text-sm text-on-surface-variant md:justify-end short:mt-2"
            aria-label="מערכות נתמכות"
          >
            {PLATFORMS.map((platform, index) => (
              <li key={platform} className="flex items-center gap-2">
                {index > 0 && <span className="text-outline" aria-hidden="true">·</span>}
                {platform}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
