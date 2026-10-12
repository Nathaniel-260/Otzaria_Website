import Link from 'next/link'
import IntentPrefetchLink from '@/components/ui/IntentPrefetchLink'

// גיבור דף הבית — כיוון "האפליקציה עצמה": שטוח ושקט. הספר המוזהב של אוצריא (הפריים
// האחרון של אנימציית הפתיחה במתקין) כאלמנט עצמאי לצד הכותרת, עם קישוט הכותרת (קו +
// נקודת זהב) וכפתור ראשי מלא + כפתור טונלי.
// נייד: הספר מעל הטקסט, ממורכז. מ-md: שתי עמודות — הספר מימין והטקסט משמאלו; ספר גדל עם הרוחב.
const PLATFORMS = ['Windows', 'macOS', 'Linux', 'Android', 'iOS']

const BUTTON_BASE =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-6 text-base font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

function HeroBook() {
  return (
    <div className="relative flex items-center justify-center">
      {/* הילה זהובה רכה מאחורי הספר (GLOW של המתקין) */}
      <div className="absolute inset-[18%] rounded-full bg-glow/35 blur-3xl" aria-hidden="true" />
      {/* תמונת הספר היא אלמנט ה-LCP של הדף, ולכן בלי אנימציית כניסה: אנימציה מ-opacity:0
          דוחה את ה-LCP עד סופה. fetchPriority גבוה — כדי שלא תמתין מאחורי שאר המשאבים. */}
      <img
        src="/home/book-open.webp"
        alt="לוגו אוצריא"
        width={550}
        height={550}
        fetchPriority="high"
        className="relative h-auto w-36 sm:w-44 md:w-60 lg:w-72 xl:w-80"
      />
    </div>
  )
}

export default function HeroSection() {
  return (
    <section className="px-4 pb-14 pt-8 sm:pt-12 md:px-8 md:pb-20 md:pt-16 lg:pt-20">
      <div className="container mx-auto grid max-w-6xl items-center gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:gap-8 lg:gap-12">
        {/* ראשון ב-DOM: בנייד מעל הטקסט, ומ-md (RTL) בעמודה הימנית — הטקסט משמאלו */}
        <div>
          <HeroBook />
        </div>

        <div className="flex flex-col items-center text-center md:items-start md:text-start">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-secondary-container px-3 py-1.5 text-sm font-medium text-on-secondary-container">
            <span className="material-symbols-outlined text-lg" aria-hidden="true">code</span>
            תוכנה חופשית ובקוד פתוח
          </span>

          <h1 className="mt-5 text-5xl font-bold leading-none text-on-surface sm:text-6xl lg:text-7xl">
            אוצריא
          </h1>
          <span className="title-ornament mt-5 [--ornament-width:88px]" aria-hidden="true" />

          <p className="mt-5 text-balance text-xl font-medium leading-snug text-on-surface sm:text-2xl lg:text-[1.75rem]">
            מאגר תורני רחב עם ממשק מודרני ומהיר
          </p>

          <p className="mt-4 max-w-xl text-base leading-relaxed text-on-surface-variant lg:text-lg">
            אוצריא היא תוכנה חופשית ובקוד פתוח לקריאה וללימוד של ספרי קודש, לשולחן העבודה
            (Windows, macOS, Linux) ולנייד (Android, iOS). התוכנה כוללת ספרייה תורנית רחבה,
            חיפוש בכל הספרים, מפרשים והפניות, הערות אישיות וסימניות, ולוח שנה עברי עם זמני
            היום.
          </p>

          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            {/* עוגן באותו דף — <a> רגיל. כ-Link, Next התייחס אליו כמסלול
                ופתח בקשות RSC ספקולטיביות לדף הנוכחי. */}
            <a href="#download" className={`${BUTTON_BASE} bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-pressed`}>
              <span className="material-symbols-outlined text-[22px]" aria-hidden="true">download</span>
              הורד עכשיו
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
            className="mt-3 inline-flex min-h-12 items-center gap-1 rounded-lg px-2 text-sm font-medium text-primary hover:bg-card-selected"
          >
            לפרוייקט ספריית אוצריא
            <span className="material-symbols-outlined text-lg" aria-hidden="true">chevron_left</span>
          </IntentPrefetchLink>

          {/* רשימה לטינית — כולה LTR, כדי שהסדר והמפרידים לא יתהפכו בתוך שורה עברית */}
          <ul
            dir="ltr"
            className="mt-5 flex flex-wrap justify-center gap-x-2 gap-y-1 text-sm text-on-surface-variant md:justify-end"
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
