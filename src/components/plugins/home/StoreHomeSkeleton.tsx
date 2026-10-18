import Section from '@/components/ui/Section'
import Skeleton from '@/components/ui/Skeleton'
import { PluginGridSkeleton } from '@/components/plugins/PluginCardSkeleton'

/**
 * שלד בית החנות — מוצג רק בזמן הפניית התאימות ?tag= (הטעינה הרגילה כבר קרתה בשרת).
 * אותו מבנה כמו העמוד: כותרת ממורכזת, שורת משנה, תיבת חיפוש, ומתחת רשת כרטיסים.
 * ההכרזה לקורא המסך — ב-PluginGridSkeleton (role=status).
 */
export default function StoreHomeSkeleton() {
  return (
    <>
      <Section spacing="none" className="pt-10 pb-8 md:pt-14 md:pb-12">
        <div aria-hidden="true" className="flex flex-col items-center">
          <Skeleton shape="text" className="w-2/3 max-w-md text-headline-md md:text-headline-lg" />
          <Skeleton shape="text" className="mt-6 w-full max-w-measure text-body-lg" />
          <Skeleton className="mt-8 h-(--field-height-lg) w-full max-w-narrow" />
        </div>
      </Section>
      <Section spacing="none">
        <PluginGridSkeleton count={6} columns="full" />
      </Section>
    </>
  )
}
