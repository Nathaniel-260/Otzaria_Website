import type { ReactNode } from 'react'
import IconTile from '@/components/ui/IconTile'
import PageHeader from '@/components/ui/PageHeader'
import SectionHeading from '@/components/ui/SectionHeading'
import TitleOrnament from '@/components/ui/TitleOrnament'
import { cx } from '@/components/ui/cx'

/**
 * כותרת דף מדריך: אריח אייקון + h1 בגופן התצוגה, הקישוט ושורת משנה.
 * center — דף הבית של המדריכים ודפי דיקטה/פיתוח: אריח מעל PageHeader, הכל ממורכז.
 * start  — דף ויקי (מעל עמודת הקריאה): אריח לצד הכותרת, בגוש ברוחב התוכן (w-fit) שמיושר לימין.
 *          הקישוט ממורכז מתחת לגוש כולו (אריח + כותרת), ולא מוצמד לצד — לכן הוא כאן ולא
 *          ב-SectionHeading. הרווח שמתחת — כמו של PageHeader (mb-8 / md:mb-10).
 */
export default function DocsHero({ id, icon, title, subtitle, align = 'center', className }: {
  id: string
  icon: string
  title: ReactNode
  subtitle?: ReactNode
  align?: 'center' | 'start'
  className?: string
}) {
  if (align === 'center') {
    return (
      <div className={cx('flex flex-col items-center', className)}>
        <IconTile icon={icon} size="lg" className="mb-4" />
        <PageHeader id={id} title={title} subtitle={subtitle} />
      </div>
    )
  }
  return (
    <div className={cx('mb-8 inline-flex w-fit max-w-full flex-col items-center md:mb-10', className)}>
      <div className="flex max-w-full items-start gap-4">
        {/* בנייד בלי האריח (הכותרת לבד, ברוחב מלא); העטיפה מסתירה — IconTile עצמו inline-flex */}
        <span className="mt-1 hidden sm:block">
          <IconTile icon={icon} size="lg" />
        </span>
        <SectionHeading as="h1" id={id} title={title} subtitle={subtitle} align="start" ornament={false} spacing="none" className="min-w-0" />
      </div>
      <TitleOrnament className="mt-4" />
    </div>
  )
}
