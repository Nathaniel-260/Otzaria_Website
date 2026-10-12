import IconTile from './IconTile'

// כרטיס יכולת — AppCard של אוצריא: רקע card, רדיוס 8, בלי מסגרת ובלי צל.
// עד xl הכרטיס אופקי (אריח לצד הטקסט, כמו שורות המתקין); ב-xl, ארבעה בשורה — אנכי.
export default function FeatureCard({ icon, title, description, index = 0 }: {
  icon: string
  title: string
  description: string
  index?: number
}) {
  return (
    <div
      style={{ animationDelay: `${index * 0.06}s` }}
      className="flex w-full items-start gap-4 rounded-lg bg-card p-4 transition-colors duration-200 hover:bg-card-selected animate-enter-up sm:p-5 xl:flex-col xl:gap-5 xl:p-6"
    >
      <IconTile icon={icon} size="md" />
      <div className="min-w-0">
        <h3 className="text-lg font-bold text-on-surface">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-on-surface-variant sm:text-base">{description}</p>
      </div>
    </div>
  )
}
