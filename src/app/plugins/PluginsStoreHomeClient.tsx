'use client'

// חלק הלקוח של דף הבית של חנות התוספים — מקבל את הנתונים כ-props מה-Server
// Component (src/app/plugins/page.tsx) במקום לשלוף אותם בעצמו ב-fetch, אבל
// שומר על כל האינטראקטיביות: התקנה ישירה (useDirectInstall) + דיאלוגים, וכן
// הפניית תאימות לקישורים ישנים ?tag= אל /plugins/all?tag=.
//
// ביצועים: useSearchParams מבודד ב-LegacyTagRedirect בתוך Suspense משלו.
// הדף עצמו סטטי (ISR), ו-useSearchParams בזמן prerender "מחלץ" את כל גבול
// ה-Suspense הקרוב לרינדור בצד הלקוח — כשהוא ישב ברכיב התוכן, ה-HTML הסטטי
// הכיל רק שלד, והתוכן (שכבר הגיע מהשרת ב-payload) הופיע רק אחרי hydration.
//
// מבנה העמוד (מפרט: refactor-notes/redesign/plugins-design-spec.md, §2 סריקה מהירה ו-§6):
// מ-lg: סרגל קטגוריות דביק מראש הדף, ולצדו עמודת התוכן. בעמודה: פתיחה קומפקטית (אריח + h1 + שורת
// משנה, פעולות משניות שקטות, חיפוש) ← שבבי קטגוריות (רק מתחת ל-lg) ← תוספים נבחרים ← שורות הקטגוריה
// ← פס "כל התוספים". כל אזור באותו מבנה (StoreHomeSection) וברווח אחד קבוע.

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import Section from '@/components/ui/Section'
import { useDirectInstall } from '@/components/plugins/useDirectInstall'
import { useDialog } from '@/components/providers/DialogContext'
import PluginCard from '@/components/plugins/PluginCard'
import PluginGrid from '@/components/plugins/PluginGrid'
import StoreHomeHero from '@/components/plugins/home/StoreHomeHero'
import CategoryChipsNav from '@/components/plugins/home/CategoryChipsNav'
import CategorySidebar from '@/components/plugins/home/CategorySidebar'
import StoreHomeSection from '@/components/plugins/home/StoreHomeSection'
import BrowseAllCta from '@/components/plugins/home/BrowseAllCta'
import StoreHomeSkeleton from '@/components/plugins/home/StoreHomeSkeleton'
import { categoriesShowIcons, categoryIcon } from '@/components/plugins/categoryIcons'
import type { StoreHomeData } from './storeHomeTypes'

const DEFAULT_HOME_TITLE = 'חנות התוספים של אוצריא'
const DEFAULT_HOME_SUBTITLE = 'תוספים שמרחיבים את חוויית הלימוד באוצריא — מצא, הורד והתקן בלחיצה אחת'
const FEATURED_PREVIEW_COUNT = 6
const TITLE_ID = 'store-home-title'

interface PluginsStoreHomeClientProps {
  data: StoreHomeData | null
  loadError: boolean
}

// תאימות לקישורים ישנים: /plugins?tag=X → /plugins/all?tag=X.
// בזמן ההפניה — שכבת שלד מעל הדף (הניווט בפועל קורה ב-effect).
function LegacyTagRedirect() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const legacyTag = searchParams.get('tag')

  useEffect(() => {
    if (legacyTag) {
      router.replace(`/plugins/all?tag=${encodeURIComponent(legacyTag)}`)
    }
  }, [legacyTag, router])

  if (!legacyTag) return null

  return (
    // מתחת לכותרת (שב-plugins/layout.tsx), כדי שהיא תישאר גלויה בזמן ההפניה; div ולא <main>,
    // כי ה-<main id="main-content"> של הדף עדיין ב-DOM מתחת לשכבה
    <div className="fixed inset-x-0 bottom-0 top-(--site-header-height) z-(--z-below-header) overflow-y-auto bg-background">
      <StoreHomeSkeleton />
    </div>
  )
}

export default function PluginsStoreHomeClient({ data, loadError }: PluginsStoreHomeClientProps) {
  const [showAllFeatured, setShowAllFeatured] = useState(false)
  const { showAlert } = useDialog() as { showAlert: (title: string, message: string) => void }
  const { installState, install } = useDirectInstall(showAlert)

  const featured = data?.featured || []
  const categories = data?.categories || []
  const homeCategories = categories.filter(c => c.showOnHome && c.plugins.length > 0)
  const totalPublicPlugins = data?.totalPublicPlugins || 0
  const homeTitle = data?.settings.homeTitle || DEFAULT_HOME_TITLE
  const homeSubtitle = data?.settings.homeSubtitle || DEFAULT_HOME_SUBTITLE
  const isEmptyHome = featured.length === 0 && homeCategories.length === 0
  const visibleFeatured = showAllFeatured ? featured : featured.slice(0, FEATURED_PREVIEW_COUNT)
  const hasCategoryNav = !loadError && categories.length > 0
  const showCategoryIcons = categoriesShowIcons(categories)

  return (
    <div className="flex flex-1 flex-col">
      <Suspense fallback={null}>
        <LegacyTagRedirect />
      </Suspense>

      <main id="main-content" className="flex-1">
        {/* אזור אחד לכל החנות, מחובר ל-h1. מ-lg: סרגל הקטגוריות לצד עמודת התוכן כבר מראש הדף,
            והפתיחה (כותרת + חיפוש) בראש עמודת התוכן */}
        <Section spacing="none" labelledBy={TITLE_ID} className="pt-6 md:pt-8">
          <div className={hasCategoryNav ? 'lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-8 xl:gap-10' : undefined}>
            {hasCategoryNav && <CategorySidebar categories={categories} totalPlugins={totalPublicPlugins} />}

            <div className="min-w-0">
              <StoreHomeHero titleId={TITLE_ID} title={homeTitle} subtitle={homeSubtitle} />

              {/* מתחת ל-lg: שבבי הקטגוריות מיד אחרי החיפוש (מ-lg: הסרגל) */}
              {hasCategoryNav && <CategoryChipsNav categories={categories} totalPlugins={totalPublicPlugins} className="mt-4" />}

              <div className="mt-10 md:mt-12">
                {loadError ? (
                  // שגיאת טעינה — עדיין מציעים דרך אל כל התוספים
                  <EmptyState
                    icon="error"
                    title="אירעה שגיאה בטעינת החנות"
                    description="נסה לרענן את הדף, או עבור לרשימת כל התוספים."
                    actions={<Button href="/plugins/all" iconEnd="chevron_left">לכל התוספים</Button>}
                  />
                ) : isEmptyHome ? (
                  // מצב ריק כללי: אין נבחרים ואין קטגוריות בית — שער לכל התוספים
                  <EmptyState
                    icon="extension"
                    title="החנות בבנייה — אבל התוספים כבר כאן"
                    description="בקרוב יופיעו כאן תוספים נבחרים וקטגוריות מסודרות. בינתיים אפשר לחפש למעלה או לעיין ברשימה המלאה של כל התוספים."
                    actions={
                      <Button href="/plugins/all" iconEnd="chevron_left">
                        לכל התוספים <span className="tabular-nums">({totalPublicPlugins.toLocaleString('he-IL')})</span>
                      </Button>
                    }
                  />
                ) : (
                  // אזורים ברווח אחד קבוע (S11), בלי קווי הפרדה
                  <div className="flex flex-col gap-12 md:gap-16">
                    {featured.length > 0 && (
                      <StoreHomeSection id="store-home-featured" title="תוספים נבחרים">
                        <PluginGrid columns="sidebar" labelledBy="store-home-featured">
                          {visibleFeatured.map((plugin, pluginIndex) => (
                            <PluginCard
                              key={plugin.id}
                              plugin={plugin}
                              priority={pluginIndex === 0}
                              installState={installState}
                              onInstall={install}
                            />
                          ))}
                        </PluginGrid>
                        {featured.length > FEATURED_PREVIEW_COUNT && !showAllFeatured && (
                          <div className="mt-6 flex justify-center">
                            <Button variant="tonal" icon="expand_more" onClick={() => setShowAllFeatured(true)}>
                              הצג עוד נבחרים
                            </Button>
                          </div>
                        )}
                      </StoreHomeSection>
                    )}

                    {homeCategories.map((category, index) => {
                      const headingId = `store-home-category-${category.slug}`
                      return (
                        <StoreHomeSection
                          key={category.id}
                          id={headingId}
                          title={category.name}
                          description={category.description || undefined}
                          icon={showCategoryIcons ? categoryIcon(category) : undefined}
                          action={{ href: `/plugins/category/${category.slug}`, label: 'לכל הקטגוריה', count: category.pluginCount }}
                        >
                          {/* בנייד — מסילה אופקית; מ-md — רשת */}
                          <PluginGrid columns="sidebar" mobileRail labelledBy={headingId}>
                            {category.plugins.map((plugin, pluginIndex) => (
                              <PluginCard
                                key={plugin.id}
                                plugin={plugin}
                                priority={featured.length === 0 && index === 0 && pluginIndex === 0}
                                installState={installState}
                                onInstall={install}
                              />
                            ))}
                          </PluginGrid>
                        </StoreHomeSection>
                      )
                    })}

                    {/* פס גילוי מלא — כל התוספים */}
                    <BrowseAllCta totalPlugins={totalPublicPlugins} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </Section>
      </main>
    </div>
  )
}
