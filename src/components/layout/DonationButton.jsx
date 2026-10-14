'use client'

import Link from 'next/link'
import { useId, useState } from 'react'

/**
 * קישור התרומה שבכותרת — כפתור טונלי בצבע התרומה, מחוץ לרשימת הניווט כדי שיבלוט בכל עמוד
 * (גם בנייד, ליד כפתור התפריט). ראו .donation-button ב-styles/effects.css.
 *
 * hint — משפט קצר שמוצג בבועה מתחת לכפתור בריחוף ובפוקוס מקלדת (CSS), ומחובר לקישור
 * ב-aria-describedby כך שקורא מסך שומע אותו תמיד. Esc מסתיר את הבועה (WCAG 1.4.13) עד
 * שהעכבר/הפוקוס עוזבים. במגע אין ריחוף — המשפט מוצג בתפריט הנייד (DonationNote).
 *
 * @param {{ link: { href: string, label: string, icon?: string, hint?: string }, className?: string }} props
 */
export default function DonationButton({ link, className = '' }) {
  const tipId = useId()
  const [dismissed, setDismissed] = useState(false)
  const reset = () => setDismissed(false)

  return (
    <span
      className={`donation-tip-host ${className}`}
      data-tip-dismissed={dismissed ? 'true' : undefined}
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
          <span className="donation-tip-bubble">{link.hint}</span>
        </span>
      )}
    </span>
  )
}

/** המשפט של התרומה בתפריט הנייד — קישור שלם לדף התרומה, כי אין שם ריחוף שיציג את הבועה. */
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
