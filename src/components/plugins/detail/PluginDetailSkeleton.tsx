import Skeleton from '@/components/ui/Skeleton'
import Section from '@/components/ui/Section'

/**
 * שלד עמוד התוסף — באותן מידות כמו PluginHero (פירורי לחם, אייקון 96/120/168, כותרת + קישוט, תג,
 * תיאור, כפתורים, רצועת נתונים), כדי שהחלפתו בעמוד לא תזיז דבר. משמש את loading.jsx של העמוד
 * (בזמן הרינדור בשרת) ואת מצב הטעינה בדפדפן (תוסף מושהה). כולל את main#main-content היחיד.
 * ההכרזה לקורא המסך — role="status" עם טקסט נסתר (הנוסח הקיים "טוען פרטי תוסף…").
 */
export default function PluginDetailSkeleton() {
  return (
    <main id="main-content" className="flex-1" aria-busy="true">
      <Section spacing="none" className="pt-4 pb-12 md:pt-6 md:pb-16">
        <p role="status" className="sr-only">טוען פרטי תוסף…</p>
        <div aria-hidden="true">
          <div className="mb-3 flex min-h-(--touch-target) items-center md:mb-4">
            <Skeleton shape="text" className="w-48 text-body-sm" />
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <Skeleton className="size-(--plugin-icon-size-hero-sm) shrink-0 rounded-(--plugin-icon-radius) sm:size-(--plugin-icon-size-xl) lg:size-(--plugin-icon-size-hero)" />
            <div className="min-w-0 flex-1">
              <Skeleton shape="text" className="w-56 max-w-full text-headline-md md:text-headline-lg" />
              <Skeleton className="mt-4 h-px w-44" />
              <Skeleton shape="pill" className="mt-3 h-(--badge-height-md) w-16" />
            </div>
          </div>
          <div className="mt-4 max-w-measure space-y-2 md:mt-5">
            <Skeleton shape="text" className="w-full text-body-md md:text-body-lg" />
            <Skeleton shape="text" className="w-3/4 text-body-md md:text-body-lg" />
          </div>
          <div className="mt-5 flex gap-2">
            <Skeleton className="h-(--button-height-md) w-32 rounded-(--button-radius)" />
            <Skeleton className="h-(--button-height-md) w-52 rounded-(--button-radius)" />
          </div>
          <Skeleton className="mt-6 h-20 w-full rounded-(--card-radius) md:mt-8" />
        </div>
      </Section>
    </main>
  )
}
