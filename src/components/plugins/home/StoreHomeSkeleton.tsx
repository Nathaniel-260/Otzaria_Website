import Section from '@/components/ui/Section'
import Skeleton from '@/components/ui/Skeleton'
import { PluginGridSkeleton } from '@/components/plugins/PluginCardSkeleton'

/**
 * שלד בית החנות — מוצג רק בזמן הפניית התאימות ?tag= (הטעינה הרגילה כבר קרתה בשרת).
 * אותו מבנה כמו הפתיחה (StoreHomeHero): אריח + כותרת ושורת משנה בצד ההתחלה, תיבת חיפוש ברוחב מלא,
 * ומתחת רשת כרטיסים.
 * ההכרזה לקורא המסך — ב-PluginGridSkeleton (role=status).
 */
export default function StoreHomeSkeleton() {
  return (
    <>
      <Section spacing="none" className="pt-6 pb-10 md:pt-8 md:pb-12">
        <div aria-hidden="true">
          <div className="flex items-start gap-4">
            <Skeleton className="size-12 shrink-0 sm:size-14" />
            <div className="min-w-0 flex-1">
              <Skeleton shape="text" className="w-2/3 max-w-md text-headline-md md:text-headline-lg" />
              <Skeleton shape="text" className="mt-5 w-full max-w-measure text-body-md" />
            </div>
          </div>
          <Skeleton className="mt-6 h-(--field-height-lg) w-full" />
        </div>
      </Section>
      <Section spacing="none">
        <PluginGridSkeleton count={6} columns="full" />
      </Section>
    </>
  )
}
