'use client'

import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { hasAnyAdminAccess } from '@/lib/roles'
import { FOCUS_RING } from '@/components/ui/focusRing'
import UserAvatarLink from './UserAvatarLink'

/** טקסט למונה ההודעות (לקורא מסך): המספר לבדו אחרי "ניהול" אינו מובן */
export function unreadMessagesLabel(count) {
  return count === 1 ? ', הודעה חדשה אחת' : `, ${count} הודעות חדשות`
}

/**
 * אזור החשבון בכותרת הספרייה: ניהול (למנהלים ולמפתחים), האווטאר והתנתקות — או "התחבר".
 * מוצג גם בשורת הכותרת (מחשב) וגם בתחתית התפריט הנייד (compact).
 * onNavigate — סוגר את התפריט הנייד אחרי לחיצה על קישור.
 */
export default function LibraryAccountActions({ session, unreadMessages = 0, compact = false, onNavigate }) {
  if (!session) {
    return (
      <Link
        href="/auth/login"
        prefetch={false}
        onClick={onNavigate}
        className={`flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm font-medium ${FOCUS_RING} ${
          compact ? 'justify-center' : ''
        }`}
      >
        <span aria-hidden="true" className="material-symbols-outlined text-lg">login</span>
        <span>התחבר</span>
      </Link>
    )
  }

  const role = session.user.role
  const showAdmin = hasAnyAdminAccess(role) || role === 'developer'

  return (
    <div className={compact ? 'flex flex-wrap items-center gap-3' : 'flex items-center gap-2 lg:gap-3 xl:gap-4'}>
      {showAdmin && (
        <Link
          href={role === 'developer' ? '/library/admin/app-reports' : '/library/admin'}
          prefetch={false}
          onClick={onNavigate}
          className={`flex items-center gap-2 rounded text-accent hover:text-accent/80 transition-colors relative font-medium ${FOCUS_RING}`}
        >
          <span aria-hidden="true" className="material-symbols-outlined">admin_panel_settings</span>
          <span>ניהול</span>
          {unreadMessages > 0 && (
            <span className="absolute -top-2 -left-2 bg-danger-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              <span aria-hidden="true">{unreadMessages}</span>
              <span className="sr-only">{unreadMessagesLabel(unreadMessages)}</span>
            </span>
          )}
        </Link>
      )}
      <UserAvatarLink name={session.user.name} onNavigate={onNavigate} />
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: '/auth/login' })}
        className={`flex items-center gap-2 px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors text-sm font-medium ${FOCUS_RING}`}
      >
        <span aria-hidden="true" className="material-symbols-outlined text-lg">logout</span>
        <span>התנתק</span>
      </button>
    </div>
  )
}
