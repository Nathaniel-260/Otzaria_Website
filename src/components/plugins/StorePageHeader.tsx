import type { ReactNode } from 'react'
import IconTile from '@/components/ui/IconTile'
import SectionHeading from '@/components/ui/SectionHeading'
import Section from '@/components/ui/Section'
import { cx } from '@/components/ui/cx'
import Breadcrumbs, { type BreadcrumbItem } from '@/components/plugins/Breadcrumbs'

/**
 * פתיחת עמוד פנימי בחנות (כל התוספים, קטגוריה, חיפוש, העלאה): פירורי לחם, כותרת העמוד (h1 בגופן
 * התצוגה, עם הקישוט, מיושרת לתחילת השורה), שורת משנה, שורת נתונים קטנה, פעולות, ומתחת — אזור
 * כלים (חיפוש / מסננים) ב-children. Server Component; על רקע הדף (בלי פס לבן — השפה שטוחה).
 *
 * titleId  — id של ה-h1 (ל-aria-labelledby של ה-Section, וגם לרשת שמתחתיו אם רוצים).
 * icon     — גליף לאריח ליד הכותרת (אייקון הקטגוריה). בנייד מעל הכותרת, מ-sm לצדה.
 * meta     — שורה שקטה מתחת לשורת המשנה ("20 תוספים בקטגוריה · מסודרים לפי דירוג").
 * actions  — כפתורים; בנייד מתחת לכותרת, מ-md בקצה השורה (מול הכותרת).
 * children — אזור הכלים (PluginSearchBox, מסננים) מתחת לכותרת, לכל הרוחב.
 *
 * הריפוד: pt-6 md:pt-10 מעל, ו-pb-8 מתחת — ה-Section שאחריו (spacing="none" או "top") ממשיך
 * מכאן. רוחב: container (ברירת מחדל content, כמו כל הדפים).
 */
export default function StorePageHeader({
  titleId,
  title,
  subtitle,
  breadcrumbs,
  icon,
  meta,
  actions,
  container = 'content',
  className,
  children
}: {
  titleId: string
  title: ReactNode
  subtitle?: ReactNode
  breadcrumbs?: BreadcrumbItem[]
  icon?: string
  meta?: ReactNode
  actions?: ReactNode
  container?: 'content' | 'narrow'
  className?: string
  children?: ReactNode
}) {
  return (
    <Section
      labelledBy={titleId}
      spacing="none"
      container={container}
      className={cx('pt-4 pb-8 md:pt-6 md:pb-10', className)}
    >
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} className="mb-3 md:mb-4" />}

      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
          {icon && <IconTile icon={icon} size="lg" className="sm:mt-1" />}
          <div className="min-w-0">
            <SectionHeading as="h1" id={titleId} title={title} align="start" spacing="none" />
            {subtitle && (
              <p className="mt-4 max-w-measure text-body-md text-on-surface-variant md:text-body-lg">{subtitle}</p>
            )}
            {meta && (
              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-label-md text-on-surface-variant">
                {meta}
              </div>
            )}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
      </div>

      {children && <div className="mt-6 md:mt-8">{children}</div>}
    </Section>
  )
}
