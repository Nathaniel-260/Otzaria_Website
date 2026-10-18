import Button from '@/components/ui/Button'
import IconTile from '@/components/ui/IconTile'
import SectionHeading from '@/components/ui/SectionHeading'
import PluginSearchBox from '@/components/plugins/PluginSearchBox'
import PluginStoreAppBanner from '@/components/plugins/PluginStoreAppBanner'

/**
 * פתיחת בית החנות. היא קומפקטית ומיושרת לצד ההתחלה, בשפת דפי המדריכים (DocsHero): אריח אייקון,
 * ולצדו h1 בגופן התצוגה עם הקישוט ושורת משנה. בקצה השורה יש שתי פעולות משניות שקטות (כפתורי
 * טקסט): העלאת תוסף והורדת אפליקציית החנות. כשאין להן מקום לצד כותרת ברוחב 28rem לפחות (נייד וטאבלט)
 * הן יורדות לשורה משלהן, כדי שהכותרת לא תישבר.
 * מתחת לכל זה, ברוחב כל עמודת התוכן, תיבת החיפוש הגדולה. זו הפעולה הראשית והפקד הבולט היחיד.
 *
 * היא יושבת בעמודת התוכן, לצד סרגל הקטגוריות (מ-lg) שמתחיל כבר בראש הדף, ולכן הקטגוריות נראות
 * במסך הראשון. מתחת ל-lg שורת השבבים באה מיד אחרי החיפוש (PluginsStoreHomeClient).
 * היא אינה <section> משלה: ה-<section> העוטף את כל החנות מחובר ל-h1 (aria-labelledby).
 */
export default function StoreHomeHero({ titleId, title, subtitle }: {
  titleId: string
  title: string
  subtitle: string
}) {
  return (
    <header className="flex flex-col gap-5 md:gap-6">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div className="flex min-w-[min(100%,28rem)] flex-1 items-start gap-4">
          {/* בנייד האריח קטן יותר (md), כדי שהכותרת לא תישבר מוקדם */}
          <IconTile
            icon="extension"
            size="lg"
            className="mt-0.5 max-sm:size-12 max-sm:text-(length:--icon-size-md)"
          />
          <div className="min-w-0">
            <SectionHeading as="h1" id={titleId} title={title} align="start" spacing="none" />
            <p className="mt-3 max-w-measure text-body-md text-on-surface-variant">{subtitle}</p>
          </div>
        </div>
        {/* פעולות משניות. -ms-3 בנייד מיישר את טקסט הכפתור הראשון לקצה הטקסט שמעליו */}
        <div className="-ms-3 flex flex-wrap items-center gap-1 sm:ms-0">
          <Button href="/plugins/upload" variant="text" size="sm" icon="add">
            העלה תוסף חדש
          </Button>
          <PluginStoreAppBanner variant="text" size="sm" />
        </div>
      </div>
      <PluginSearchBox size="lg" placeholder="חפש תוסף לפי שם, תיאור או נושא..." />
    </header>
  )
}
