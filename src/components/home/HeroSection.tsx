import { Suspense } from 'react'
import Button from '@/components/ui/Button'
import TitleOrnament from '@/components/ui/TitleOrnament'
import HeroEmblem from './HeroEmblem'
import HeroStatsLoader from './HeroStatsLoader'
import { HeroStatsPlaceholder } from './HeroStats'

// גיבור דף הבית — כיוון "האפליקציה עצמה": שטוח ושקט.
//
// מבנה: שתי עמודות, ומתחתן שורת המספרים לרוחב מלא.
// - ימין (ראשון ב-DOM; בנייד מעל הטקסט): הספר המוזהב שנפתח בתוך הילה חמה, ומתחתיו "חינם ←
//   לנצח!" (HeroEmblem). השורה שמתחת לספר היא גם מה שמרים אותו: העמודה ממורכזת אנכית מול
//   הטקסט, ולכן מרכז הספר עולה בחצי גובה השורה (כ-5% מגובה הגיבור) — אל המרכז האופטי, מעט
//   מעל המרכז הגאומטרי. הספר, ההילה והשורה נגללים עם הדף כרגיל.
// - שמאל: הכותרת עם קישוט (קו + נקודת זהב), כותרת משנה, פסקה, כפתור ראשי מלא + כפתור
//   טונלי. המילה "אוצריא" שבכותרת היא מקור "מעבר שם האתר" לכותרת העליונה (HeaderLogo).
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

// הכפתורים — ui/Button בגודל md; כאן רק ההגדלה היחסית במסך tall
const TALL_BUTTON =
  'tall:min-h-[calc(2.85*var(--hero-tall-rem))] tall:px-[calc(1.425*var(--hero-tall-rem))] tall:text-[calc(1*var(--hero-tall-rem))]'
const TALL_ICON = 'tall:text-[calc(1.375*var(--hero-tall-rem))]'

export default function HeroSection() {
  return (
    <section className="overflow-hidden px-4 pb-12 pt-6 sm:pt-10 md:flex md:min-h-[min(calc(100svh-var(--site-header-height)),56rem)] md:flex-col md:justify-center md:px-8 md:py-10 short:py-5 tall:min-h-[max(56rem,calc(100svh-var(--site-header-height)-var(--hero-peek)))] tall:pt-(--hero-peek)">
      <div className="container mx-auto grid w-full max-w-5xl items-center justify-center gap-6 md:grid-cols-[auto_minmax(0,36rem)] md:gap-10 lg:gap-16 2xl:max-w-7xl 2xl:grid-cols-[auto_minmax(0,44rem)] 2xl:gap-24 tall:max-w-[calc(80*var(--hero-tall-rem))] tall:grid-cols-[auto_minmax(0,calc(44*var(--hero-tall-rem)))] tall:gap-[calc(5.7*var(--hero-tall-rem))]">
        {/* --book-w: רוחב הספר בכל נקודת שבירה — ממנו נגזר גם ההיסט של "חינם לנצח!" (HeroEmblem) */}
        <HeroEmblem className="[--book-w:--spacing(36)] sm:[--book-w:--spacing(44)] md:[--book-w:--spacing(48)] lg:[--book-w:--spacing(56)] xl:[--book-w:--spacing(64)] 2xl:[--book-w:--spacing(80)] short:[--book-w:--spacing(40)] short:lg:[--book-w:--spacing(48)] tall:[--book-w:calc(19*var(--hero-tall-rem))]" />

        <div className="flex flex-col items-center text-center md:items-start md:text-start">
          {/* עטיפה ברוחב הכותרת — הקישוט נמתח לכל רוחב המילה, כמו בבלוק הכותרת של המתקין */}
          <div className="flex w-fit flex-col">
            {/* "אוצריא" — OT Vilna Regular, כשם המותג. המילה (ה-span) היא מקור "מעבר שם האתר":
                היא נגללת עם הדף אל מתחת לכותרת העליונה, ואז שם האתר נכנס שם (HeaderLogo) */}
            <h1 className="font-display text-5xl font-normal leading-none text-on-surface sm:text-6xl lg:text-7xl 2xl:text-8xl short:lg:text-6xl tall:text-[calc(6*var(--hero-tall-rem))]">
              <span data-wordmark-handoff-source="">אוצריא</span>
            </h1>
            <TitleOrnament className="mt-5 [--ornament-ratio:100%] short:mt-3" />
          </div>

          <p className="mt-5 text-balance text-xl font-medium leading-snug text-on-surface sm:text-2xl lg:text-[1.75rem] 2xl:text-[2.125rem] short:mt-3 short:lg:text-2xl tall:text-[calc(2.125*var(--hero-tall-rem))]">
            {/* רווח לא-שביר לפני המקף — "– אצלך." לא נשבר לשורה משלו */}
            ארון הספרים היהודי{'\u00A0'}– אצלך.
          </p>

          <p className="mt-4 max-w-xl text-base leading-relaxed text-on-surface-variant lg:text-lg 2xl:max-w-2xl 2xl:text-xl short:mt-3 short:lg:text-base tall:max-w-[calc(42*var(--hero-tall-rem))] tall:text-[calc(1.25*var(--hero-tall-rem))]">
            הספרים נבחרו בקפידה. פתח גמרא בצורת הדף, עיין במפרשים לצד הטקסט וחפש בכל
            הספרים במהירות ובקלות, במחשב ובנייד.
          </p>

          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row short:mt-5">
            {/* עוגן באותו דף — <a> רגיל. כ-Link, Next התייחס אליו כמסלול
                ופתח בקשות RSC ספקולטיביות לדף הנוכחי. */}
            <Button href="#download" icon="download" iconClassName={TALL_ICON} className={TALL_BUTTON}>
              הורד בחינם
            </Button>
            <Button href="/about" variant="tonal" icon="info" iconClassName={TALL_ICON} className={TALL_BUTTON}>
              אודות הספרייה
            </Button>
          </div>
        </div>
      </div>

      {/* מרווח ברור מהכפתורים — השורה היא אזור נפרד ולא המשך שלהם; במסך נמוך (short) מתון
          יותר, כדי שהכל עדיין ייכנס במסך הראשון */}
      <div className="container mx-auto mt-12 w-full max-w-4xl md:mt-20 2xl:mt-24 2xl:max-w-5xl short:mt-14 tall:mt-[calc(5.7*var(--hero-tall-rem))] tall:max-w-[calc(64*var(--hero-tall-rem))]">
        <Suspense fallback={<HeroStatsPlaceholder />}>
          <HeroStatsLoader />
        </Suspense>
      </div>
    </section>
  )
}
