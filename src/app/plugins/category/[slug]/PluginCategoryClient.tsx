'use client'

// חלק הלקוח של דף הקטגוריה — מקבל את נתוני הקטגוריה כ-props מה-Server
// Component (page.tsx) במקום לשלוף אותם בעצמו ב-fetch, אבל שומר על כל
// האינטראקטיביות: התקנה ישירה (useDirectInstall) + דיאלוגים.
//
// מבנה (מפרט החנות, סעיף 6 / סוכן 2): StorePageHeader — פירורי לחם, אריח אייקון הקטגוריה, שם
// (h1), תיאור, ושורת נתונים שקטה (מספר התוספים, סדר המיון); תיבת החיפוש בקצה הכותרת. מתחת —
// PluginGrid ישירות מתחת ל-h1, ולכן שמות התוספים בכרטיסים הם h2.

import { useDirectInstall } from '@/components/plugins/useDirectInstall'
import { useDialog } from '@/components/providers/DialogContext'
import PluginCard from '@/components/plugins/PluginCard'
import PluginGrid from '@/components/plugins/PluginGrid'
import PluginSearchBox from '@/components/plugins/PluginSearchBox'
import StorePageHeader from '@/components/plugins/StorePageHeader'
import AppIcon from '@/components/ui/AppIcon'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import Section from '@/components/ui/Section'
import type { CategoryData } from './types'

interface PluginCategoryClientProps {
  category: CategoryData | null
  notFound: boolean
}

const TITLE_ID = 'plugin-category-title'

export default function PluginCategoryClient({ category, notFound }: PluginCategoryClientProps) {
  const { showAlert } = useDialog() as { showAlert: (title: string, message: string) => void }
  const { installState, install } = useDirectInstall(showAlert)

  if (notFound || !category) {
    return (
      <div className="flex flex-1 flex-col">
        <main id="main-content" className="flex flex-1 flex-col justify-center">
          <Section container="narrow">
            <EmptyState
              as="h1"
              icon="search_off"
              title="הקטגוריה לא נמצאה"
              description="ייתכן שהקטגוריה הוסרה או שהקישור שגוי. אפשר לחזור לחנות התוספים ולעיין משם."
              actions={
                <Button href="/plugins" variant="filled" iconEnd="chevron_left">
                  לחנות התוספים
                </Button>
              }
            />
          </Section>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">

      <main id="main-content" className="flex-1">
        <StorePageHeader
          titleId={TITLE_ID}
          breadcrumbs={[{ label: 'חנות התוספים', href: '/plugins' }, { label: category.name }]}
          // קטגוריה בלי אייקון — האייקון הכללי של תוסף (כמו בבית החנות)
          icon={category.icon || 'extension'}
          title={category.name}
          subtitle={category.description || undefined}
          meta={
            <>
              <span className="tabular-nums">{category.total.toLocaleString('he-IL')} תוספים בקטגוריה</span>
              {category.sortMode === 'rating' && (
                // בלי "·" מפריד: הכוכב עצמו מפריד, ושבירת שורה לא משאירה נקודה יתומה
                <span className="ms-2 inline-flex items-center gap-1">
                  {/* אייקון בודד (קו מתאר) — סימן ל"דירוג", לא דירוג בפועל */}
                  <AppIcon name="star" className="text-[1.15em] text-rating" />
                  <span>מסודרים לפי דירוג המשתמשים</span>
                </span>
              )}
            </>
          }
          actions={
            <div className="w-full md:w-80">
              <PluginSearchBox placeholder="חיפוש בכל החנות..." />
            </div>
          }
        />

        <Section spacing="none" className="pb-14 md:pb-20">
          {category.plugins.length === 0 ? (
            <EmptyState
              icon="extension"
              title="בקרוב יתווספו תוספים לקטגוריה זו"
              description="בינתיים אפשר לעיין ברשימה המלאה של כל התוספים בחנות."
              actions={
                <Button href="/plugins/all" variant="tonal" iconEnd="chevron_left">
                  לכל התוספים
                </Button>
              }
            />
          ) : (
            <PluginGrid columns="full" labelledBy={TITLE_ID}>
              {category.plugins.map((plugin, pluginIndex) => (
                <PluginCard
                  priority={pluginIndex === 0}
                  key={plugin.id}
                  plugin={plugin}
                  installState={installState}
                  onInstall={install}
                  headingLevel="h2"
                />
              ))}
            </PluginGrid>
          )}
        </Section>
      </main>
    </div>
  )
}
