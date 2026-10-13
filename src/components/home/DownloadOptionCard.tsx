import type { ReactNode } from 'react'
import IconTile from './IconTile'

/**
 * כרטיס בחירה בחלון ההורדה — כמו כרטיסי המסייע: אריח אייקון, כותרת ותיאור, ומימין-לשמאל
 * בסוף השורה "כפתור" פעולה. הכרטיס כולו הוא הקישור (מטרת מגע גדולה).
 * emphasis="primary" — הפעולה הראשית בחלון (מלא, primary); "tonal" — חלופה משנית (אריח).
 */
export default function DownloadOptionCard({ href, icon, title, desc, emphasis = 'primary', external = false }: {
  href: string
  icon: string
  title: string
  desc: ReactNode
  emphasis?: 'primary' | 'tonal'
  external?: boolean
}) {
  const actionClass = emphasis === 'primary'
    ? 'bg-primary text-on-primary group-hover:bg-primary-hover'
    : 'bg-tile text-on-tile group-hover:bg-glow/45'

  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className="group flex items-center gap-3 rounded-lg bg-card p-3 text-start transition-colors hover:bg-card-selected focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:gap-4 sm:p-4"
    >
      <IconTile icon={icon} />
      <span className="min-w-0 flex-1">
        <span className="block font-bold leading-snug text-on-surface">{title}</span>
        <span className="mt-0.5 block text-sm leading-snug text-on-surface-variant">{desc}</span>
      </span>
      <span
        aria-hidden="true"
        className={`inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5 min-[420px]:px-3 text-sm font-semibold transition-colors ${actionClass}`}
      >
        <span className="material-symbols-outlined text-xl">{external ? 'open_in_new' : 'download'}</span>
        {/* בנייד צר — אייקון בלבד, כדי שהתיאור לא יידחס; הכרטיס כולו הוא הקישור */}
        <span className="hidden min-[420px]:inline">{external ? 'פתיחה' : 'הורדה'}</span>
      </span>
    </a>
  )
}
