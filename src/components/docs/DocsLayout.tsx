import type { ReactNode } from 'react'
import Section from '@/components/ui/Section'
import { cx } from '@/components/ui/cx'
import DocsToc from './DocsToc'
import type { TocItem } from './docsNav'

// דביק בגובה המסך; גולל בפנים רק כשהוא ארוך מהמסך — בפס דק (scrollbar-thin)
const STICKY = 'scrollbar-thin sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pb-4'

/**
 * מעטפת דף מדריך (בתוך <main>): פירורי לחם, כותרת, ואז רשת:
 *   [ניווט המדריך] [עמודת הקריאה] [תוכן העניינים]
 * - nav (אופציונלי) — ניווט בין דפי המדריך: panel בצד מ-lg, folded מעל התוכן מתחת ל-lg.
 * - toc — "בעמוד זה": דביק בצד הקצה (מ-xl כשיש ניווט, מ-lg כשאין), ומקפל מעל התוכן מתחת לזה.
 * עמודת הקריאה: minmax(0,…) — טבלה או בלוק קוד רחבים נגללים בפנים ולא מרחיבים את העמוד.
 * כשאין ניווט — העמודה מוגבלת ל-48rem (narrow) וממורכזת, לשורה נוחה לקריאה.
 */
export default function DocsLayout({ titleId, breadcrumbs, hero, nav, toc, children, after }: {
  titleId: string
  breadcrumbs: ReactNode
  hero: ReactNode
  nav?: { panel: ReactNode; folded: ReactNode }
  toc?: { title: string; items: TocItem[] }
  children: ReactNode
  after?: ReactNode
}) {
  const hasToc = Boolean(toc && toc.items.length > 0)
  const withNav = Boolean(nav)
  // באיזה רוחב תוכן העניינים עובר לצד
  const tocSide = withNav ? 'xl' : 'lg'

  return (
    <Section labelledBy={titleId} spacing="none" className="pt-2 pb-14 md:pt-4 md:pb-20">
      {breadcrumbs}
      <div className="mt-4 md:mt-6">{hero}</div>

      <div
        className={cx(
          'grid gap-8 xl:gap-10',
          withNav
            ? hasToc
              ? 'lg:grid-cols-[14rem_minmax(0,1fr)] xl:grid-cols-[14rem_minmax(0,1fr)_13rem]'
              : 'lg:grid-cols-[14rem_minmax(0,1fr)]'
            : hasToc
              ? 'lg:grid-cols-[minmax(0,48rem)_14rem] lg:justify-center'
              : 'mx-auto w-full max-w-narrow'
        )}
      >
        {nav && (
          <aside className="hidden lg:block">
            {/* הסרגל בצד ימין: פס הגלילה בקצה החיצוני שלו, לא בינו לבין התוכן */}
            <div className={cx(STICKY, 'scrollbar-end-right')}>{nav.panel}</div>
          </aside>
        )}

        <div className="min-w-0">
          {(nav || hasToc) && (
            <div className="mb-6 space-y-3">
              {nav && <div className="lg:hidden">{nav.folded}</div>}
              {hasToc && toc && (
                <DocsToc title={toc.title} items={toc.items} variant="folded" className={tocSide === 'xl' ? 'xl:hidden' : 'lg:hidden'} />
              )}
            </div>
          )}
          {children}
          {after}
        </div>

        {hasToc && toc && (
          <aside className={tocSide === 'xl' ? 'hidden xl:block' : 'hidden lg:block'}>
            <div className={STICKY}>
              <DocsToc title={toc.title} items={toc.items} variant="panel" />
            </div>
          </aside>
        )}
      </div>
    </Section>
  )
}
