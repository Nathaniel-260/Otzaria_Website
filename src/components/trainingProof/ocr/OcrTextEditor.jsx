'use client'

import { useEffect, useRef, useState } from 'react'

export const TEXT_CLASS = 'rounded-lg px-2 py-1 text-[25px] leading-snug text-on-surface'
export const TEXT_STYLE = { fontFamily: 'var(--font-frank), var(--font-hebrew), serif', unicodeBidi: 'plaintext' }

// עריכת טקסט-השורה במקום ("תקן"): נפתח עם הטקסט הנוכחי והסמן בסופו.
// Enter (או יציאה מהשדה) שומר, Esc מבטל. השורה כולה — בלי מילה-מילה (ה-6).
export default function OcrTextEditor({ initial, ltr, onCommit, onCancel }) {
  const [value, setValue] = useState(initial)
  const ref = useRef(null)
  const done = useRef(false)

  useEffect(() => {
    const ta = ref.current
    if (!ta) return
    ta.focus()
    ta.setSelectionRange(ta.value.length, ta.value.length)
  }, [])

  const finish = (save) => {
    if (done.current) return
    done.current = true
    if (save) onCommit(value.trim())
    else onCancel()
  }

  return (
    <textarea
      ref={ref}
      aria-label="הטקסט המתוקן"
      value={value}
      dir={ltr ? 'ltr' : 'rtl'}
      rows={1}
      onChange={(e) => setValue(e.target.value.replace(/\n/g, ' '))}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          finish(true)
        } else if (e.key === 'Escape') {
          e.preventDefault()
          finish(false)
        }
      }}
      onBlur={() => finish(true)}
      className={`block w-full resize-none bg-surface-container-low outline-2 outline-primary ${TEXT_CLASS} ${ltr ? 'text-left' : ''}`}
      style={TEXT_STYLE}
    />
  )
}
