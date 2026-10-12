'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { getAvatarColor, getInitial } from '@/lib/avatar-colors'
import { MAIN_NAV_LINKS } from '@/lib/navigation-constants'

/**
 * קישור ניווט בכותרת.
 *
 * prefetch={false} במכוון: התפריט מוצג בכל דף, פעמיים (דסקטופ + מובייל), ולכן
 * ברירת המחדל של Next גררה בקשות RSC כפולות-משולשות לכל מסלול בתפריט מיד עם
 * טעינת הדף — כולל חבילות ה-JavaScript שלהם. ברשת איטית הן מתחרות בנכסים
 * שהמסך הנוכחי צריך.
 *
 * מסלולים חיצוניים (כמו /forum, שאינו מסלול Next ומחזיר redirect) מקבלים <a>
 * רגיל, כדי שלא ינסו ניווט צד-לקוח או prefetch של RSC שאינו קיים.
 */
function NavLink({ link, className, onClick, children }) {
  if (link.external) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer" className={className} onClick={onClick}>
        {children}
      </a>
    )
  }

  return (
    <Link href={link.href} prefetch={false} className={className} onClick={onClick}>
      {children}
    </Link>
  )
}

/**
 * אזור התחברות/חשבון בכותרת — מוצג רק כש-showAuth מופעל (חנות התוספים).
 * ההתחברות חוזרת לדף הנוכחי דרך callbackUrl, וההתנתקות משאירה את המשתמש באותו דף.
 */
function AuthActions({ pathname, compact = false, onNavigate }) {
  const { data: session } = useSession()
  const loginHref = `/auth/login?callbackUrl=${encodeURIComponent(pathname)}`

  if (session) {
    return (
      <div className={compact ? 'flex items-center gap-3 p-2' : 'flex items-center gap-3'}>
        <Link
          href="/library/dashboard"
          prefetch={false}
          onClick={onNavigate}
          className="flex items-center justify-center hover:opacity-80 transition-opacity"
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
          onClick={() => signOut({ callbackUrl: pathname })}
          className="flex items-center gap-2 px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors text-sm font-medium"
        >
          <span className="material-symbols-outlined text-lg">logout</span>
          <span>התנתק</span>
        </button>
      </div>
    )
  }

  return (
    <Link
      href={loginHref}
      prefetch={false}
      onClick={onNavigate}
      className={`flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm font-medium ${
        compact ? 'justify-center text-lg' : 'text-sm'
      }`}
    >
      <span className="material-symbols-outlined text-lg">login</span>
      <span>התחבר</span>
    </Link>
  )
}

/** קישור התרומה — כפתור מלא בצבע התרומה, מחוץ לרשימת הניווט כדי שיבלוט בכל עמוד
 *  (גם בנייד, ליד כפתור התפריט). ראו .donation-nav-link ב-styles/effects.css. */
function DonationButton({ link, className = '', onClick }) {
  return (
    <NavLink link={link} onClick={onClick} className={`donation-nav-link text-sm ${className}`}>
      <span className="material-symbols-outlined donation-nav-icon" aria-hidden="true">
        {link.icon}
      </span>
      {link.label}
    </NavLink>
  )
}

export default function OtzariaSoftwareHeader({ showAuth = false }) {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const donationLink = MAIN_NAV_LINKS.find(link => link.emphasis === 'donation')
  const navLinks = MAIN_NAV_LINKS.filter(link => link.emphasis !== 'donation')

  // כותרת בסגנון ה-topBar של האפליקציה: רקע surfaceContainerHigh אטום, קו הפרדה דק,
  // בלי זכוכית ובלי צל.
  return (
    <header className="sticky top-0 z-50 w-full border-b border-surface-variant bg-top-bar">
      <div className="container mx-auto flex h-16 max-w-[76rem] items-center justify-between gap-4 px-4 md:px-8">
        {/* קישור הלוגו מופיע בכל דף ואינו מצדיק prefetch */}
        <Link href="/" prefetch={false} className="flex min-h-12 shrink-0 items-center gap-2.5 rounded-lg transition-opacity hover:opacity-80">
          <Image src="/logo.webp" alt="לוגו אוצריא" width={32} height={32} />
          <span className="text-xl font-bold text-on-surface">אוצריא</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map(link => {
            const isActive = pathname === link.href
            return (
              <NavLink
                key={link.label}
                link={link}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  link.highlight
                    ? 'bg-secondary-container text-on-secondary-container hover:bg-tile/70'
                    : isActive
                      ? 'bg-card-selected text-primary'
                      : 'text-on-surface-variant hover:bg-card-selected hover:text-on-surface'
                }`}
              >
                {link.label}
              </NavLink>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          {donationLink && <DonationButton link={donationLink} />}
          {showAuth && (
            <div className="hidden lg:block">
              <AuthActions pathname={pathname} />
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="lg:hidden flex h-12 w-12 items-center justify-center rounded-lg text-on-surface hover:bg-card-selected"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-expanded={isMenuOpen}
            aria-label="תפריט"
          >
            <span className="material-symbols-outlined text-2xl">{isMenuOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden absolute top-16 left-0 w-full border-b border-surface-variant bg-top-bar p-3 flex flex-col gap-0.5">
          {navLinks.map(link => (
            <NavLink
              key={link.label}
              link={link}
              onClick={() => setIsMenuOpen(false)}
              className={`rounded-lg px-3 py-3 text-base font-medium hover:bg-card-selected ${
                pathname === link.href ? 'text-primary' : 'text-on-surface'
              }`}
            >
              {link.label}
            </NavLink>
          ))}
          {showAuth && <AuthActions pathname={pathname} compact onNavigate={() => setIsMenuOpen(false)} />}
        </div>
      )}
    </header>
  )
}
