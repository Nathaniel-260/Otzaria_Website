import { Suspense } from 'react'
import Link from 'next/link'
import IntentPrefetchLink from '@/components/ui/IntentPrefetchLink'
import HeroEmblem from './HeroEmblem'
import HeroStatsLoader from './HeroStatsLoader'
import { HeroStatsPlaceholder } from './HeroStats'

// גיבור דף הבית — כיוון "האפליקציה עצמה": שטוח ושקט.
//
// מבנה: שתי עמודות, ומתחתן שורת המספרים לרוחב מלא.
// - ימין (ראשון ב-DOM; בנייד מעל הטקסט): הספר המוזהב שנפתח בתוך הילה חמה, ומתחתיו "חינם ←
//   לנצח!" (HeroEmblem). השורה שמתחת לספר היא גם מה שמרים אותו: העמודה ממורכזת אנכית מול
//   הטקסט, ולכן מרכז הספר עולה בחצי גובה השורה (כ-5% מגובה הגיבור) — אל המרכז האופטי, מעט
//   מעל המרכז הגאומטרי. הספר הוא גם מקור "מעבר הלוגו" לכותרת העליונה (HeaderLogo).
// - שמאל: הכותרת עם קישוט (קו + נקודת זהב), כותרת משנה, פסקה, כפתור ראשי מלא + כפתור
//   טונלי, וקישור לספריית אוצריא.
// - למטה: "אוצריא במספרים" — שורה נקייה של מספרים גדולים, ובסופה הגרסה האחרונה (HeroStats).
// הנתונים (גרסה, מספרים) נשלפים בשרת בתוך Suspense עם שומר מקום באותו גובה: הגיבור עצמו —
// והתמונה שהיא ה-LCP — לעולם לא מחכים להם. הדף הוא ISR, כך שבפועל הכל נבנה מראש.
//
// מ-md: האזור כולו נכנס במסך הראשון (100svh פחות הכותרת העליונה, לכל היותר 56rem כדי שבמסך
// גבוה לא ייווצר ריק), והתוכן ממורכז בו אנכית. במסך נמוך (short, ראו layout.css) המרווחים
// והגדלים מתכווצים. מ-2xl (1536px) הכל גדל, יחד עם הרחבת כל מכלי הדף ל-max-w-7xl.
// במסך גבוה (tall, ראו layout.css) האזור תופס את המסך הראשון פחות --hero-peek (ולא פחות מ-56rem,
// כדי שבסף לא יתכווץ), וכל מידות
// ה-2xl (ספר, כותרות, פסקה, רוחב העמודות, מרווחים, שורת המספרים) גדלות באותו יחס: ערך ה-2xl
// ב-rem כפול --hero-tall-rem (5.7 = gap-24/mt-24 ב-rem, 19 = --spacing(80), 2.85 = min-h-12).
// הריפוד העליון ב-tall הוא --hero-peek: מתחת לגיבור יש גם את הריפוד העליון של האזור הבא, ובלי
// איזון התוכן נראה צף גבוה מדי ביחס לכותרת האזור הבא שמציצה מלמטה.

const BUTTON_BASE =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-lg px-6 text-base font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary tall:min-h-[calc(2.85*var(--hero-tall-rem))] tall:px-[calc(1.425*var(--hero-tall-rem))] tall:text-[calc(1*var(--hero-tall-rem))]'
const BUTTON_ICON = 'material-symbols-outlined text-[22px] tall:text-[calc(1.375*var(--hero-tall-rem))]'

export default function HeroSection() {
  return (
    <section className="overflow-hidden px-4 pb-12 pt-6 sm:pt-10 md:flex md:min-h-[min(calc(100svh-var(--site-header-height)),56rem)] md:flex-col md:justify-center md:px-8 md:py-10 short:py-5 tall:min-h-[max(56rem,calc(100svh-var(--site-header-height)-var(--hero-peek)))] tall:pt-(--hero-peek)">
      <div className="container mx-auto grid w-full max-w-5xl items-center justify-center gap-6 md:grid-cols-[auto_minmax(0,36rem)] md:gap-10 lg:gap-16 2xl:max-w-7xl 2xl:grid-cols-[auto_minmax(0,44rem)] 2xl:gap-24 tall:max-w-[calc(80*var(--hero-tall-rem))] tall:grid-cols-[auto_minmax(0,calc(44*var(--hero-tall-rem)))] tall:gap-[calc(5.7*var(--hero-tall-rem))]">
        {/* --book-w: רוחב הספר בכל נקודת שבירה — ממנו נגזר גם ההיסט של "חינם לנצח!" (HeroEmblem) */}
        <HeroEmblem className="[--book-w:--spacing(36)] sm:[--book-w:--spacing(44)] md:[--book-w:--spacing(48)] lg:[--book-w:--spacing(56)] xl:[--book-w:--spacing(64)] 2xl:[--book-w:--spacing(80)] short:[--book-w:--spacing(40)] short:lg:[--book-w:--spacing(48)] tall:[--book-w:calc(19*var(--hero-tall-rem))]" />

        <div className="flex flex-col items-center text-center md:items-start md:text-start">
          {/* עטיפה ברוחב הכותרת — הקישוט נמתח לכל רוחב המילה, כמו בבלוק הכותרת של המתקין */}
          <div className="flex w-fit flex-col">
            <h1 className="font-display text-5xl font-bold leading-none text-on-surface sm:text-6xl lg:text-7xl 2xl:text-8xl short:lg:text-6xl tall:text-[calc(6*var(--hero-tall-rem))]">
              אוצריא
            </h1>
            <span className="title-ornament mt-5 [--ornament-ratio:100%] short:mt-3" aria-hidden="true" />
          </div>

          <p className="mt-5 text-balance text-xl font-medium leading-snug text-on-surface sm:text-2xl lg:text-[1.75rem] 2xl:text-[2.125rem] short:mt-3 short:lg:text-2xl tall:text-[calc(2.125*var(--hero-tall-rem))]">
            אוצר הספרים היהודי אצלך
          </p>

          <p className="mt-4 max-w-xl text-base leading-relaxed text-on-surface-variant lg:text-lg 2xl:max-w-2xl 2xl:text-xl short:mt-3 short:lg:text-base tall:max-w-[calc(42*var(--hero-tall-rem))] tall:text-[calc(1.25*var(--hero-tall-rem))]">
            הספרים נבחרו בקפידה. פתחו גמרא בצורת הדף, עיינו במפרשים לצד הטקסט וחפשו בכל
            הספרים במהירות ובקלות, במחשב ובנייד.
          </p>

          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row short:mt-5">
            {/* עוגן באותו דף — <a> רגיל. כ-Link, Next התייחס אליו כמסלול
                ופתח בקשות RSC ספקולטיביות לדף הנוכחי. */}
            <a href="#download" className={`${BUTTON_BASE} bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-pressed`}>
              <span className={BUTTON_ICON} aria-hidden="true">download</span>
              הורידו בחינם
            </a>
            <Link
              href="/about"
              prefetch={false}
              className={`${BUTTON_BASE} bg-secondary-container text-on-secondary-container hover:bg-[#f6d4ad]`}
            >
              <span className={BUTTON_ICON} aria-hidden="true">info</span>
              אודות הספרייה
            </Link>
          </div>

          {/* prefetch רק בכוונה (ריחוף/פוקוס/נגיעה): ברירת המחדל הורידה את ה-RSC
              וה-JS של /library בכל טעינה של דף הבית (5 בקשות, כ-27KB) */}
          <IntentPrefetchLink
            href="/library"
            className="mt-3 inline-flex min-h-12 items-center gap-1 rounded-lg px-2 text-sm font-medium text-primary hover:bg-card-selected short:mt-1 tall:text-[calc(0.875*var(--hero-tall-rem))]"
          >
            לפרוייקט ספריית אוצריא
            <span className="material-symbols-outlined text-lg" aria-hidden="true">chevron_left</span>
          </IntentPrefetchLink>
        </div>
      </div>

      {/* מרווח ברור מהכפתורים — השורה היא אזור נפרד ולא המשך של קישור "לפרוייקט..." שמעליה;
          במסך נמוך (short) מתון יותר, כדי שהכל עדיין ייכנס במסך הראשון */}
      <div className="container mx-auto mt-12 w-full max-w-4xl md:mt-20 2xl:mt-24 2xl:max-w-5xl short:mt-14 tall:mt-[calc(5.7*var(--hero-tall-rem))] tall:max-w-[calc(64*var(--hero-tall-rem))]">
        <Suspense fallback={<HeroStatsPlaceholder />}>
          <HeroStatsLoader />
        </Suspense>
      </div>
    </section>
  )
}
