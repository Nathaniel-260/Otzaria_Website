import type { ReactNode } from 'react'
import Card from '@/components/ui/Card'
import AppIcon from '@/components/ui/AppIcon'
import { cx } from '@/components/ui/cx'

/**
 * הערה בטופס (הסבר, המלצה, "שים לב") — Card טונלי עם role="note" ואייקון בצד ההתחלה.
 * במקום התיבות הצבעוניות (primary/5, warning-50) — צבע אחד שקט; האייקון והטקסט נושאים את המשמעות.
 */
export default function FormNote({ icon = 'info', children, className }: {
  icon?: string
  children: ReactNode
  className?: string
}) {
  return (
    <Card tone="tonal" role="note" className={cx('flex items-start gap-3 px-4 py-3 text-body-sm text-on-surface-variant', className)}>
      <AppIcon name={icon} className="mt-0.5 text-[1.25rem] text-primary" />
      <div className="min-w-0 flex-1">{children}</div>
    </Card>
  )
}
