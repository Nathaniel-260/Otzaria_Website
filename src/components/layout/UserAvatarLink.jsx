'use client'

import Link from 'next/link'
import { getAvatarColor, getInitial } from '@/lib/avatar-colors'
import { FOCUS_RING } from '@/components/ui/focusRing'

/** השם הנגיש של קישור האווטאר — בלעדיו קורא המסך מקריא רק את האות הראשונה של השם */
export function avatarLinkLabel(name) {
  return name ? `האזור האישי של ${name}` : 'האזור האישי'
}

/**
 * עיגול האות הראשונה של המשתמש, כקישור לאזור האישי (/library/dashboard).
 * משותף לכותרת הספרייה (Header) ולכותרת האתר (OtzariaSoftwareHeader).
 */
export default function UserAvatarLink({ name, onNavigate }) {
  return (
    <Link
      href="/library/dashboard"
      prefetch={false}
      onClick={onNavigate}
      aria-label={avatarLinkLabel(name)}
      title={name}
      className={`flex items-center justify-center rounded-full hover:opacity-80 transition-opacity ${FOCUS_RING}`}
    >
      <span
        aria-hidden="true"
        className="w-9 h-9 rounded-full text-white flex items-center justify-center font-bold text-sm shadow-md hover:shadow-lg transition-shadow"
        style={{ backgroundColor: getAvatarColor(name) }}
      >
        {getInitial(name)}
      </span>
    </Link>
  )
}
