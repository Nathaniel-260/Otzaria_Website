import Skeleton from '@/components/ui/Skeleton'
import Section from '@/components/ui/Section'
import { PluginGridSkeleton } from '@/components/plugins/PluginCardSkeleton'

// fallback מיידי למעבר לחנות התוספים ולדפי התוספים — רק התוכן; הכותרת והפוטר ב-layout.tsx
// נשארים על המסך. שלד באותן מידות כמו StorePageHeader + PluginGrid (פירורי לחם, כותרת עם קישוט,
// שורת משנה, רשת כרטיסים), כדי שהחלפתו בעמוד האמיתי לא תזיז את הדף. ההכרזה לקורא המסך — מ-
// PluginGridSkeleton (role=status, "טוען תוספים..."). עמוד שהמבנה שלו שונה (עמוד תוסף בודד) יכול
// להוסיף loading.jsx משלו בתיקייה שלו — ראו refactor-notes/redesign/plugins-design-spec.md.
export default function PluginsLoading() {
  return (
    <main id="main-content" className="flex-1" aria-busy="true">
      <Section spacing="none" className="pt-4 pb-8 md:pt-6 md:pb-10">
        <div aria-hidden="true">
          <div className="mb-3 flex min-h-(--touch-target) items-center md:mb-4">
            <Skeleton shape="text" className="w-40 text-body-sm" />
          </div>
          <Skeleton shape="text" className="w-64 max-w-full text-headline-md md:text-headline-lg" />
          <Skeleton className="mt-4 h-px w-44" />
          <Skeleton shape="text" className="mt-4 w-full max-w-measure text-body-md md:text-body-lg" />
        </div>
      </Section>
      <Section spacing="none">
        <PluginGridSkeleton count={6} label="טוען תוספים..." />
      </Section>
    </main>
  )
}
