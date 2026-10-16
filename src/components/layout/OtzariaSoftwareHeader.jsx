'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { MAIN_NAV_LINKS } from '@/lib/navigation-constants'
import { FOCUS_RING, FOCUS_RING_INSET } from '@/components/ui/focusRing'
import HeaderLogo from './HeaderLogo'
import AccountActions from './AccountActions'
import NavDropdown from './NavDropdown'
import DonationButton, { DonationNote } from './DonationButton'

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

/** קישור בתפריט הנייד */
function MobileNavLink({ link, pathname, onNavigate }) {
  return (
    <NavLink
      link={link}
      onClick={onNavigate}
      className={`rounded-lg px-3 py-3 text-base font-medium hover:bg-card-selected ${FOCUS_RING_INSET} ${
        pathname === link.href ? 'text-primary' : 'text-on-surface'
      }`}
    >
      {link.label}
    </NavLink>
  )
}

/**
 * אזור התחברות/חשבון בכותרת — אותו רכיב כמו בכותרת הספרייה (AccountActions); כאן ההתחברות
 * חוזרת לדף הנוכחי וההתנתקות משאירה את המשתמש בו.
 */
function AuthActions({ pathname, compact = false, onNavigate }) {
  const { data: session, status } = useSession()
  const actions = (
    <AccountActions
      session={session}
      status={status}
      compact={compact}
      onNavigate={onNavigate}
      loginCallbackUrl={pathname}
      signOutCallbackUrl={pathname}
    />
  )
  // בתפריט הנייד — מופרד מהקישורים בקו, כמו בתפריט הנייד של הספרייה
  return compact ? <div className="mt-2 border-t border-outline-variant px-3 pt-3">{actions}</div> : actions
}

/**
 * הכותרת העליונה הדביקה, משותפת לכל העמודים.
 *
 * מיקום הניווט קבוע בכל העמודים ובכל המצבים: רשת של שלוש עמודות (לוגו | ניווט | פעולות),
 * והניווט ממורכז בעמודה האמצעית — כך שרוחב הלוגו (גם בזמן החלפת הגופן) ורוחב אזור הפעולות לא
 * מזיזים אותו. אזור החשבון ברוחב קבוע (--account-slot-width) בכל מצב — טוען, אורח, מחובר —
 * ומופיע בכל עמוד, כדי שהכותרת תהיה זהה בדף הבית, בדפי השיווק ובחנות.
 * showAuth={false} — מסתיר את "התחבר"/החשבון, אבל שומר את המקום (בלי תזוזת ניווט בין עמודים).
 * wordmarkHandoff — דף הבית בלבד: הלוגו קבוע, ושם האתר "מגיע" בגלילה מהמילה "אוצריא"
 * שבכותרת הראשית של הגיבור (HeaderLogo).
 */
export default function OtzariaSoftwareHeader({ showAuth = true, wordmarkHandoff = false }) {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const donationLink = MAIN_NAV_LINKS.find(link => link.emphasis === 'donation')
  const navLinks = MAIN_NAV_LINKS.filter(link => link.emphasis !== 'donation')

  // כותרת בסגנון ה-topBar של האפליקציה: רקע surfaceContainerHigh אטום, בלי זכוכית ובלי קו
  // תחתון — הרקע השונה מהדף מספיק כדי להפריד. כשהדף נגלל מתחתיה מופיע צל רך (.site-header
  // ב-animations.css, מקושר לגלילה בלי JS), כדי שהתוכן ייראה עובר מתחת לה ולא נחתך בה.
  return (
    <header className="site-header sticky top-0 z-50 w-full bg-top-bar">
      <div className="container mx-auto grid h-16 max-w-[76rem] 2xl:max-w-[84rem] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 md:px-8">
        <div className="col-start-1 flex justify-self-start">
          <HeaderLogo handoff={wordmarkHandoff} />
        </div>

        {/* Desktop Nav */}
        <nav className="col-start-2 hidden lg:flex items-center gap-1 whitespace-nowrap">
          {navLinks.map(link => {
            if (link.children) return <NavDropdown key={link.label} label={link.label} items={link.children} />
            const isActive = pathname === link.href
            return (
              <NavLink
                key={link.label}
                link={link}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${FOCUS_RING} ${
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

        <div className="col-start-3 flex items-center gap-2 justify-self-end">
          {donationLink && <DonationButton link={donationLink} />}
          <div className="hidden lg:block">
            {showAuth ? <AuthActions pathname={pathname} /> : <div aria-hidden="true" className="w-(--account-slot-width)" />}
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className={`lg:hidden flex h-12 w-12 items-center justify-center rounded-lg text-on-surface hover:bg-card-selected ${FOCUS_RING}`}
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
        // גבוה מהמסך בנייד נמוך (הקבוצה המקוננת) — נגלל בתוך עצמו, לא דרך הדף
        <div className="lg:hidden absolute top-16 left-0 w-full max-h-[calc(100svh-var(--site-header-height))] overflow-y-auto overscroll-contain bg-top-bar p-3 flex flex-col gap-0.5 shadow-[0_12px_24px_-12px_rgb(46_28_8/0.22)]">
          {navLinks.map(link => link.children ? (
            // פריט נפתח (NavDropdown בדסקטופ) — כאן קבוצה פתוחה: כותרת, ומתחתיה הקישורים
            <div key={link.label} role="group" aria-labelledby={`mobile-nav-${link.href}`}>
              <div id={`mobile-nav-${link.href}`} className="mobile-nav-group-label">{link.label}</div>
              <div className="mobile-nav-group-list flex flex-col gap-0.5">
                {link.children.map(child => (
                  <MobileNavLink key={child.href + child.label} link={child} pathname={pathname} onNavigate={() => setIsMenuOpen(false)} />
                ))}
              </div>
            </div>
          ) : (
            <MobileNavLink key={link.label} link={link} pathname={pathname} onNavigate={() => setIsMenuOpen(false)} />
          ))}
          {donationLink && <DonationNote link={donationLink} onNavigate={() => setIsMenuOpen(false)} />}
          {showAuth && <AuthActions pathname={pathname} compact onNavigate={() => setIsMenuOpen(false)} />}
        </div>
      )}
    </header>
  )
}
