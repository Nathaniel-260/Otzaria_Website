import type { ReactNode } from 'react'
import Card from '@/components/ui/Card'

/**
 * שלב בטופס ההעלאה: Card (ריפוד 16→24→32px — בנייד צר יותר, כי בתוכו עוד אזורי העלאה) עם מספר השלב באריח עגול, כותרת h2 (text-title-lg)
 * ותוכן. המספר דקורטיבי — הסדר עצמו מובע בסדר הכותרות במסמך.
 */
export default function UploadStep({ id, step, title, children }: {
  id: string
  step: number
  title: ReactNode
  children: ReactNode
}) {
  return (
    <Card as="section" aria-labelledby={id} className="p-4 sm:p-6 md:p-8">
      <div className="mb-5 flex items-center gap-3 sm:mb-6">
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary-container text-label-lg tabular-nums text-on-secondary-container"
        >
          {step.toLocaleString('he-IL')}
        </span>
        <h2 id={id} className="text-title-lg text-on-surface">{title}</h2>
      </div>
      <div className="space-y-6">{children}</div>
    </Card>
  )
}
