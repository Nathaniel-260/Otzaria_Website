'use client'

import Link from 'next/link'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { clampShift, splitHint } from '@/lib/donationTip'

/**
 * קישור התרומה שבכותרת — כפתור טונלי בצבע התרומה, מחוץ לרשימת הניווט כדי שיבלוט בכל עמוד
 * (גם בנייד, ליד כפתור התפריט). ראו .donation-button ב-styles/effects.css.
 *
 * hint — כרטיס קטן מתחת לכפתור בריחוף ובפוקוס מקלדת (CSS, .donation-tip), מחובר לקישור
 * ב-aria-describedby כך שקורא מסך שומע אותו תמיד. Esc מסתיר אותו (WCAG 1.4.13) עד שהעכבר/
 * הפוקוס עוזבים. הכרטיס ממורכז מתחת לכפתור; כאן רק נמדד אם הוא חורג מקצה המסך, ואז הוא
 * מוזז פנימה (--donation-tip-shift) — החוד נשאר מול הכפתור. במגע אין ריחוף — המשפט מוצג
 * בתפריט הנייד (DonationNote).
 *
 * @param {{ link: { href: string, label: string, icon?: string, hint?: string }, className?: string }} props
 */
export default function DonationButton({ link, className = '' }) {
  const tipId = useId()
  const hostRef = useRef(null)
  const bubbleRef = useRef(null)
  const [dismissed, setDismissed] = useState(false)
  const reset = () => setDismissed(false)

  const place = useCallback(() => {
    const host = hostRef.current
    const bubble = bubbleRef.current
    if (!host || !bubble) return
    const hostRect = host.getBoundingClientRect()
    const shift = clampShift({
      centerX: hostRect.left + hostRect.width / 2,
      width: bubble.offsetWidth,
      viewportWidth: document.documentElement.clientWidth
    })
    host.style.setProperty('--donation-tip-shift', `${shift}px`)
  }, [])

  useEffect(() => {
    if (!link.hint) return
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [link.hint, place])

  const { lead, punch } = splitHint(link.hint)

  return (
    <span
      ref={hostRef}
      className={`donation-tip-host ${className}`}
      data-tip-dismissed={dismissed ? 'true' : undefined}
      onPointerEnter={place}
      onFocus={place}
      onPointerLeave={reset}
      onBlur={reset}
      onKeyDown={(event) => { if (event.key === 'Escape' && link.hint) setDismissed(true) }}
    >
      <Link
        href={link.href}
        prefetch={false}
        aria-describedby={link.hint ? tipId : undefined}
        className="donation-button donation-nav-link text-sm"
      >
        <span className="material-symbols-outlined donation-button-icon" aria-hidden="true">{link.icon}</span>
        {link.label}
      </Link>
      {link.hint && (
        <span className="donation-tip" role="tooltip" id={tipId}>
          <span ref={bubbleRef} className="donation-tip-bubble">
            <span className="material-symbols-outlined donation-tip-icon" aria-hidden="true">{link.icon}</span>
            <span className="donation-tip-text">
              {lead && <span className="donation-tip-lead">{lead}</span>}
              {lead && ' '}
              <span className="donation-tip-punch">{punch}</span>
            </span>
          </span>
        </span>
      )}
    </span>
  )
}

/** המשפט של התרומה בתפריט הנייד — קישור שלם לדף התרומה, כי אין שם ריחוף שיציג את הכרטיס. */
export function DonationNote({ link, onNavigate }) {
  if (!link.hint) return null
  return (
    <Link href={link.href} prefetch={false} onClick={onNavigate} className="donation-note">
      <span className="material-symbols-outlined donation-button-icon" aria-hidden="true">{link.icon}</span>
      <span className="flex-1">{link.hint}</span>
      <span className="material-symbols-outlined text-lg" aria-hidden="true">chevron_left</span>
    </Link>
  )
}
