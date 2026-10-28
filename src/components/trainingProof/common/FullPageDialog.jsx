'use client'

import { useEffect, useRef, useState } from 'react'
import Dialog from '@/components/ui/Dialog'
import { boxStyle } from './boxStyle'

// "הצג בעמוד המלא": תמונת העמוד, והשורה מסומנת בה (ctx.bbox בפיקסלים של תמונת העמוד).
// החלון נגלל אל השורה כשהתמונה נטענת.
export default function FullPageDialog({ ctx, alias, page, onClose }) {
  const markRef = useRef(null)
  const [size, setSize] = useState(null)

  useEffect(() => {
    if (size) markRef.current?.scrollIntoView?.({ block: 'center' })
  }, [size])

  return (
    <Dialog
      title="השורה בעמוד המלא"
      subtitle={[alias, page != null ? `עמוד ${page}` : ''].filter(Boolean).join(' · ')}
      onClose={onClose}
    >
      <div className="relative mx-auto w-fit max-w-full overflow-hidden rounded border border-outline-variant leading-none">
        <img
          src={ctx.img}
          alt="העמוד המלא"
          className="block h-auto max-w-full"
          draggable={false}
          onLoad={(e) => setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
        />
        {size ? (
          <div
            ref={markRef}
            className="pointer-events-none absolute rounded-sm border-2 border-primary bg-primary/10"
            style={boxStyle(ctx.bbox, size.w, size.h)}
          />
        ) : null}
      </div>
    </Dialog>
  )
}
