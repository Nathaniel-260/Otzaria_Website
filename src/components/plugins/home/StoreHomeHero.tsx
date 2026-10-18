import Button from '@/components/ui/Button'
import Section from '@/components/ui/Section'
import SectionHeading from '@/components/ui/SectionHeading'
import PluginSearchBox from '@/components/plugins/PluginSearchBox'
import PluginStoreAppBanner from '@/components/plugins/PluginStoreAppBanner'

/**
 * פתיחת בית החנות: h1 (גופן התצוגה + קישוט) ושורת משנה ממורכזים, מתחתם תיבת החיפוש הגדולה
 * (הפעולה הראשית של העמוד) ומתחתה שתי פעולות משניות — העלאת תוסף והורדת אפליקציית החנות.
 * על רקע הדף, בלי פס לבן ובלי קו תחתון: האזור נפרד מהתוכן ברווח בלבד.
 */
export default function StoreHomeHero({ titleId, title, subtitle }: {
  titleId: string
  title: string
  subtitle: string
}) {
  return (
    <Section labelledBy={titleId} spacing="none" className="pt-10 pb-8 md:pt-14 md:pb-12">
      <SectionHeading as="h1" id={titleId} title={title} subtitle={subtitle} spacing="none" />
      <div className="mx-auto mt-8 max-w-narrow">
        <PluginSearchBox size="lg" placeholder="חפש תוסף לפי שם, תיאור או נושא..." />
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <Button href="/plugins/upload" variant="outlined" icon="add">
          העלה תוסף חדש
        </Button>
        <PluginStoreAppBanner />
      </div>
    </Section>
  )
}
