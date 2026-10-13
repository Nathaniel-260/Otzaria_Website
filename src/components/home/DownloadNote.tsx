import type { ReactNode } from 'react'

/**
 * הערה בחלון ההורדה.
 * - "lead": שורת ההסבר הראשית של החלון (מה מורידים ומה עושים בקובץ) — תיבה טונלית שקטה,
 *   role="note".
 * - "quiet": הערה משנית שאין לה מקום אחר (uname -m, Gatekeeper) — טקסט קטן עם אייקון.
 */
export default function DownloadNote({ icon = 'info', variant = 'quiet', children }: {
  icon?: string
  variant?: 'lead' | 'quiet'
  children: ReactNode
}) {
  if (variant === 'lead') {
    return (
      <div role="note" className="flex gap-3 rounded-lg bg-tile/40 p-3 text-sm leading-relaxed text-on-surface sm:p-4 sm:text-[0.9375rem]">
        <span aria-hidden="true" className="material-symbols-outlined mt-px shrink-0 text-[22px] text-on-tile">{icon}</span>
        <p className="min-w-0">{children}</p>
      </div>
    )
  }

  return (
    <div className="flex gap-2 px-1 text-sm leading-relaxed text-on-surface-variant">
      <span aria-hidden="true" className="material-symbols-outlined mt-0.5 shrink-0 text-lg text-on-tile">{icon}</span>
      <p className="min-w-0">{children}</p>
    </div>
  )
}

// שמות קבצים ופקודות הם LTR; בלי בידוד הסוגריים והנקודה סביבם מתהפכים בפסקה עברית.
export function Ltr({ children }: { children: string }) {
  return <bdi dir="ltr" className="whitespace-nowrap font-mono text-[0.92em]">{children}</bdi>
}

// מצמיד תחילית עברית ("ה-") למילה הלועזית שאחריה, כדי שהשורה לא תישבר באמצע
export function Nowrap({ children }: { children: ReactNode }) {
  return <span className="whitespace-nowrap">{children}</span>
}
