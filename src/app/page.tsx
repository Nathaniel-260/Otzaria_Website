import OtzariaSoftwareHeader from '@/components/layout/OtzariaSoftwareHeader'
import OtzariaSoftwareFooter from '@/components/layout/OtzariaSoftwareFooter'
import HeroSection from '@/components/home/HeroSection'
import FeaturesSection from '@/components/home/FeaturesSection'
import DownloadSection from '@/components/home/DownloadSection'
import StatsSection from '@/components/home/StatsSection'
import OfflineToolCard from '@/components/home/OfflineToolCard'
import DonateCallout from '@/components/home/DonateCallout'

// דף סטטי עם ISR: נבנה מחדש ברקע לכל היותר פעם ב-10 דק' (תואם לחלון המטמון של
// DownloadSection ושל StatsSection — ראו src/lib/homeStats/sources.js). ליטרל
// מספרי בכוונה — ה-segment config של Next נחלץ בניתוח AST סטטי (ראו plugins/page.tsx).
export const revalidate = 600

// עיצוב "האפליקציה עצמה": Material 3 שטוח של אוצריא — רקע panelBackground אחיד,
// כרטיסי AppCard בלי מסגרת ובלי צל, אריחי אייקון טונליים. הערות הביצועים (LCP של
// תמונת הספר, prefetch בכוונה בלבד, עוגן #download כ-<a>) — ברכיבי הגיבור.
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-background text-on-surface">
      <OtzariaSoftwareHeader />

      <main className="flex-1">
        <HeroSection />

        <FeaturesSection />

        <DownloadSection />

        <StatsSection />

        {/* עדכון לא-מקוון ותרומה — שני כרטיסים זה לצד זה מטבלט ומעלה */}
        <section aria-label="עדכון לא-מקוון ותרומה" className="px-4 pt-6 md:px-8 md:pt-10">
          <div className="container mx-auto grid max-w-6xl gap-4 md:grid-cols-2">
            <OfflineToolCard />
            <DonateCallout />
          </div>
        </section>
      </main>

      <OtzariaSoftwareFooter />
    </div>
  );
}
