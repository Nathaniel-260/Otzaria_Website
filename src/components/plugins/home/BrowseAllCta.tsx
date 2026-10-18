import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { cx } from '@/components/ui/cx'

/**
 * פס הסיום של בית החנות: מי שלא מצא בנבחרים ובשורות הקטגוריה — מוצא אל "כל התוספים".
 * כרטיס טונלי ממורכז: שאלה + כפתור (בנייד זה מתחת לזה, מ-sm באותה שורה).
 */
export default function BrowseAllCta({ totalPlugins, className }: { totalPlugins: number; className?: string }) {
  return (
    <Card
      tone="tonal"
      padding="md"
      className={cx('flex flex-col items-center justify-center gap-x-6 gap-y-4 text-center sm:flex-row', className)}
    >
      <p className="text-body-lg text-on-surface">לא מצאת את מה שחיפשת?</p>
      <Button href="/plugins/all" variant="filled" iconEnd="chevron_left">
        עיין בכל התוספים{' '}
        <span className="tabular-nums">({totalPlugins.toLocaleString('he-IL')})</span>
      </Button>
    </Card>
  )
}
