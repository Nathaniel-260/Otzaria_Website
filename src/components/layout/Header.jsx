'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { getAvatarColor, getInitial } from '@/lib/avatar-colors'
import { LIBRARY_NAV_LINKS } from '@/lib/navigation-constants'
import { hasAnyAdminAccess } from '@/lib/roles'
import { useState, useEffect } from 'react'
import { apiGet } from '@/lib/api-utils'
import { FOCUS_RING } from '@/components/ui/focusRing'

export default function Header() {
  const { data: session } = useSession()
  const [unreadMessages, setUnreadMessages] = useState(0)

  const role = session?.user?.role

  useEffect(() => {
    if (role === 'admin' || role === 'admin_plugins' || role === 'admin_books') {
      const loadUnreadCount = async () => {
        try {
          // מונה בלבד — בעבר נמשך כאן כל תור ההודעות (/api/messages?allMessages=true,
          // מאות KB עד MB) בכל דף ובכל דקה, רק כדי לספור את ה-unread בדפדפן.
          const result = await apiGet('/api/messages/unread-count')
          if (result.success) {
            setUnreadMessages(result.count)
          }
        } catch (error) {
          console.error('Error loading messages:', error)
        }
      }
      loadUnreadCount()
      const interval = setInterval(loadUnreadCount, 60000)
      return () => clearInterval(interval)
    }
  }, [role])

  return (
    <header className="sticky top-0 z-50 w-full glass-strong border-b border-neutral-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1800px] items-center justify-between px-2 sm:px-3 md:px-4 xl:px-8">
        {/* קישור הלוגו מופיע בכל דף ואינו מצדיק prefetch */}
        <Link href="/library" prefetch={false} className={`flex items-center gap-2 lg:gap-3 rounded-lg hover:opacity-80 transition-opacity ${FOCUS_RING}`}>
          <Image src="/logo.webp" alt="לוגו אוצריא" width={32} height={32} />
          <span className="text-lg xl:text-xl font-bold text-foreground font-frank">ספריית אוצריא</span>
        </Link>

        <nav className="hidden md:flex items-center gap-3 lg:gap-4 xl:gap-6">
          {/* prefetch={false}: תשעה קישורי ניווט שמופיעים בכל דף בספרייה. ברירת
              המחדל של Next הורידה את ה-RSC ואת חבילות ה-JavaScript של כולם מיד. */}
          {LIBRARY_NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              prefetch={false}
              className={`rounded text-foreground hover:text-primary transition-colors font-medium ${FOCUS_RING}`}
            >
              {link.label}
            </Link>
          ))}

          {session ? (
            <div className="flex items-center gap-2 lg:gap-3 xl:gap-4">
              {(hasAnyAdminAccess(session.user.role) || session.user.role === 'developer') && (
                <Link href={session.user.role === 'developer' ? '/library/admin/app-reports' : '/library/admin'} prefetch={false} className={`flex items-center gap-2 rounded text-accent hover:text-accent/80 transition-colors relative font-medium ${FOCUS_RING}`}>
                  <span className="material-symbols-outlined">admin_panel_settings</span>
                  <span>ניהול</span>
                  {unreadMessages > 0 && (
                    <span className="absolute -top-2 -left-2 bg-danger-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadMessages}
                    </span>
                  )}
                </Link>
              )}
              <Link
                href="/library/dashboard"
                prefetch={false}
                className={`flex items-center justify-center rounded-full hover:opacity-80 transition-opacity ${FOCUS_RING}`}
                title={session.user.name}
              >
                <div
                  className="w-9 h-9 rounded-full text-white flex items-center justify-center font-bold text-sm shadow-md hover:shadow-lg transition-shadow"
                  style={{ backgroundColor: getAvatarColor(session.user.name) }}
                >
                  {getInitial(session.user.name)}
                </div>
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/auth/login' })}
                className={`flex items-center gap-2 px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors text-sm font-medium ${FOCUS_RING}`}
              >
                <span className="material-symbols-outlined text-lg">logout</span>
                <span>התנתק</span>
              </button>
            </div>
          ) : (
            <Link href="/auth/login" prefetch={false} className={`flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm font-medium ${FOCUS_RING}`}>
              <span className="material-symbols-outlined text-lg">login</span>
              <span>התחבר</span>
            </Link>
          )}
        </nav>

        {/* Mobile Menu Button - Placeholder */}
        <button type="button" className={`md:hidden rounded-lg text-foreground p-2 ${FOCUS_RING}`}>
          <span className="material-symbols-outlined text-3xl">menu</span>
        </button>
      </div>
    </header>
  )
}
