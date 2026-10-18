'use client'

import { useCallback, useState } from 'react'
import { cx } from '@/components/ui/cx'

/**
 * אייקון התוסף — תמונת התוסף (/api/plugins/[id]/image) היא אייקון ריבועי (512–1200px, זהב על
 * לבן), ולכן היא מוצגת כאריח ריבועי בגודל קבוע ולא כבאנר חתוך (עד כה aspect 16/11 חתך את
 * האייקון). הגודל — --plugin-icon-size-* (component-tokens.css); object-contain, כך שאייקון לא
 * ריבועי לא נחתך.
 *
 * חלופה: בלי src, או כשהטעינה נכשלה (404, קובץ חסר) — הלוגו של אוצריא על משטח טונלי, במקום
 * אייקון "תמונה שבורה" וטקסט ה-alt.
 *
 * alt ריק כברירת מחדל: בכרטיס ובשורת תוצאה האייקון יושב ליד שם התוסף, וחזרה על השם רק מוסיפה
 * רעש לקורא המסך. בעמוד התוסף (התמונה לבד) — להעביר alt={name}.
 * priority — האייקון הראשון בעמוד (מועמד ל-LCP): eager + fetchPriority גבוה.
 */
const SIZES = {
  sm: 'size-(--plugin-icon-size-sm)',
  md: 'size-(--plugin-icon-size-md)',
  lg: 'size-(--plugin-icon-size-lg)',
  xl: 'size-(--plugin-icon-size-xl)'
} as const

/** אותן מידות מ-sm ומעלה — מחרוזות מלאות, כדי ש-Tailwind ימצא אותן בסריקה */
const SM_SIZES = {
  sm: 'sm:size-(--plugin-icon-size-sm)',
  md: 'sm:size-(--plugin-icon-size-md)',
  lg: 'sm:size-(--plugin-icon-size-lg)',
  xl: 'sm:size-(--plugin-icon-size-xl)'
} as const

/** מידות פיקסל ל-width/height של <img> (שומרות מקום לפני הטעינה) — זהות לטוקנים */
const PIXELS = { sm: 40, md: 64, lg: 72, xl: 120 } as const

export type PluginImageSize = keyof typeof SIZES

export const PLUGIN_IMAGE_FALLBACK = '/logo.webp'

export default function PluginImage({ src, alt = '', size = 'md', responsive, priority = false, className }: {
  src?: string | null
  alt?: string
  size?: PluginImageSize
  /** גודל שני מ-sm ומעלה (למשל md בנייד → lg במסך רחב) */
  responsive?: PluginImageSize
  priority?: boolean
  className?: string
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const broken = !src || failedSrc === src
  const sizeClasses = cx(SIZES[size], responsive && SM_SIZES[responsive])
  // תמונה שנכשלה עוד לפני ה-hydration (HTML מהשרת): onError כבר לא יירה — בודקים בחיבור ה-ref
  const checkAlreadyFailed = useCallback((img: HTMLImageElement | null) => {
    if (img && src && img.complete && img.naturalWidth === 0) setFailedSrc(src)
  }, [src])

  return (
    <span
      data-fallback={broken ? '' : undefined}
      className={cx(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-(--plugin-icon-radius) bg-(--plugin-icon-bg) ring-1 ring-(--plugin-icon-ring)',
        sizeClasses,
        className
      )}
    >
      {broken ? (
        <img src={PLUGIN_IMAGE_FALLBACK} alt={alt} width={PIXELS[size]} height={PIXELS[size]} className="size-1/2 object-contain opacity-80" />
      ) : (
        <img
          ref={checkAlreadyFailed}
          src={src}
          alt={alt}
          width={PIXELS[size]}
          height={PIXELS[size]}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
          decoding="async"
          onError={() => setFailedSrc(src)}
          className="size-full object-contain"
        />
      )}
    </span>
  )
}
