import type { ReactNode } from 'react'

// כותרת אזור בשפת המתקין: כותרת, קישוט דק (קו + נקודת זהב) ושורת משנה שקטה.
export default function SectionHeading({ id, title, subtitle, className = '' }: {
  id?: string
  title: ReactNode
  subtitle?: ReactNode
  className?: string
}) {
  return (
    <div className={`mb-8 flex flex-col items-center text-center md:mb-10 ${className}`}>
      {/* עטיפה ברוחב הכותרת — הקישוט נמדד ממנה */}
      <div className="flex w-fit max-w-full flex-col">
        <h2 id={id} className="text-balance text-[1.7rem] font-bold leading-tight text-on-surface md:text-4xl">
          {title}
        </h2>
        <span className="title-ornament mt-4" aria-hidden="true" />
      </div>
      {subtitle && (
        <p className="mt-4 max-w-2xl text-balance text-base text-on-surface-variant md:text-lg">{subtitle}</p>
      )}
    </div>
  )
}
