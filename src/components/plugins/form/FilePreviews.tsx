import type { ReactNode } from 'react'
import AppIcon from '@/components/ui/AppIcon'
import { cx } from '@/components/ui/cx'

/** "✓ נבחר: name.otzplugin" — הקובץ שנבחר, בצבע ההצלחה ועם אייקון */
export function SelectedFile({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cx('flex min-w-0 items-center gap-1.5 text-body-sm font-semibold text-success', className)}>
      <AppIcon name="check_circle" className="text-[1.15rem]" />
      <span className="min-w-0 break-all">{children}</span>
    </p>
  )
}

/**
 * תמונת התוסף — אייקון ריבועי (512–1200px, זהב על לבן; ראו PluginImage), ולכן בתצוגה
 * המקדימה ריבוע עם object-contain, לא באנר חתוך.
 */
export function IconPreview({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      className="size-28 rounded-(--plugin-icon-radius) bg-(--plugin-icon-bg) object-contain ring-1 ring-(--plugin-icon-ring)"
    />
  )
}

/** רשת צילומי מסך (2 → md:3), יחס 16/10, object-cover */
export function ScreenshotPreviews({ srcs, altPrefix = 'צילום מסך' }: { srcs: string[]; altPrefix?: string }) {
  if (srcs.length === 0) return null
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {srcs.map((src, index) => (
        <li key={index}>
          <img
            src={src}
            alt={`${altPrefix} ${index + 1}`}
            className="aspect-[16/10] w-full rounded-(--radius-control) bg-surface-container object-cover ring-1 ring-outline-variant"
          />
        </li>
      ))}
    </ul>
  )
}
