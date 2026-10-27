'use client'

import { useState } from 'react'
import Dialog from '@/components/ui/Dialog'

// תמונת-שורה מהאתר (נתיב מוגן של הניהול). רוחב מלא עד הגודל המקורי, בלי מתיחה.
export function LineImage({ src, w, h, alt = 'תמונת השורה', className = '' }) {
  return (
    <img
      src={src}
      alt={alt}
      width={w || undefined}
      height={h || undefined}
      loading="lazy"
      className={`block h-auto max-w-full rounded border border-surface-variant bg-white ${className}`}
    />
  )
}

// "הצג בעמוד המלא": תמונת העמוד עם מסגרת סביב השורה (ctx.bbox בפיקסלים של תמונת-העמוד)
export function ContextButton({ ctx }) {
  const [open, setOpen] = useState(false)
  const [size, setSize] = useState(null)
  if (!ctx) return null
  const [x0, y0, x1, y1] = ctx.bbox
  return (
    <>
      <button type="button" className="text-xs text-info-700 hover:underline" onClick={() => setOpen(true)}>
        הצג בעמוד המלא
      </button>
      {open && (
        <Dialog title="השורה בעמוד" onClose={() => setOpen(false)} className="sm:max-w-3xl">
          <div className="relative inline-block">
            <img
              src={ctx.img}
              alt="העמוד המלא"
              className="block h-auto max-w-full"
              onLoad={(e) => setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            />
            {size && (
              <div
                aria-hidden
                className="pointer-events-none absolute rounded-sm border-2 border-danger-500 bg-danger-500/10"
                style={{
                  left: `${(x0 / size.w) * 100}%`,
                  top: `${(y0 / size.h) * 100}%`,
                  width: `${((x1 - x0) / size.w) * 100}%`,
                  height: `${((y1 - y0) / size.h) * 100}%`,
                }}
              />
            )}
          </div>
        </Dialog>
      )}
    </>
  )
}
