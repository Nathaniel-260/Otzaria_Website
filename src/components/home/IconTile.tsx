// אריח אייקון טונלי — כמו באפליקציה ובמסכי המתקין: רקע secondaryContainer (#FBDEBC),
// גליף onSecondaryContainer (#56442A), רדיוס 8. דקורטיבי בלבד (aria-hidden).
const SIZES = {
  sm: 'h-10 w-10 text-[22px]',
  md: 'h-12 w-12 text-[26px]',
  lg: 'h-14 w-14 text-[30px]'
} as const

export default function IconTile({ icon, size = 'sm', className = '' }: {
  icon: string
  size?: keyof typeof SIZES
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-lg bg-tile text-on-tile ${SIZES[size]} ${className}`}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 'inherit' }}>{icon}</span>
    </span>
  )
}
