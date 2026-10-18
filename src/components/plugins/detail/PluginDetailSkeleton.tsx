import Skeleton from '@/components/ui/Skeleton'
import Section from '@/components/ui/Section'

/**
 * שלד עמוד התוסף — באותן מידות כמו PluginHero (פירורי לחם, אייקון 72/120, כותרת + קישוט, תג,
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
          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 sm:gap-x-6 md:gap-x-8">
            <Skeleton className="size-(--plugin-icon-size-lg) rounded-(--plugin-icon-radius) sm:row-span-4 sm:size-(--plugin-icon-size-xl)" />
            <div className="flex flex-col justify-center sm:block">
              <Skeleton shape="text" className="w-56 max-w-full text-headline-md md:text-headline-lg" />
              <Skeleton className="mt-4 h-px w-44" />
            </div>
            <Skeleton shape="pill" className="col-span-2 mt-4 h-(--badge-height-md) w-16 sm:col-span-1 sm:col-start-2" />
            <div className="col-span-2 mt-3 max-w-measure space-y-2 sm:col-span-1 sm:col-start-2">
              <Skeleton shape="text" className="w-full text-body-md md:text-body-lg" />
              <Skeleton shape="text" className="w-3/4 text-body-md md:text-body-lg" />
            </div>
            <div className="col-span-2 mt-5 flex gap-2 sm:col-span-1 sm:col-start-2">
              <Skeleton className="h-(--button-height-md) w-32 rounded-(--button-radius)" />
              <Skeleton className="h-(--button-height-md) w-52 rounded-(--button-radius)" />
            </div>
          </div>
          <Skeleton className="mt-6 h-20 w-full rounded-(--card-radius) md:mt-8" />
        </div>
      </Section>
    </main>
  )
}
