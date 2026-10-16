'use client'

import Button from '@/components/ui/Button'
import { loginHref } from '@/lib/accountMenu'
import AccountMenu, { AccountMenuItems } from './AccountMenu'

/**
 * אזור החשבון בכותרת — משותף לכותרת הספרייה (Header) ולכותרת האתר בחנות התוספים
 * (OtzariaSoftwareHeader showAuth), כך שהוא נראה ומתנהג אותו דבר בכל האתר.
 *   אורח   — "התחבר" (ui/Button בגודל header, כמו כפתור התרומות שלצדו).
 *   מחובר  — כפתור חשבון אחד (AccountMenu) שפותח תפריט: לוח בקרה, ניהול למורשים, התנתקות.
 *   טוען   — מקום שמור ריק (ה-session עוד לא הגיע מ-/api/auth/session).
 *
 * בשורת הכותרת האזור ברוחב קבוע (--account-slot-width) בשלושת המצבים: כשה-session נטען
 * והמצב מתחלף, קישורי הניווט לא זזים (בלי layout shift). ה-session נקרא בדפדפן בלבד, ולא
 * בשרת, בכוונה — כך דפי השיווק והחנות נשארים זהים לכל המבקרים וניתנים למטמון ציבורי
 * (next.config.ts), ואין בהם HTML תלוי-משתמש.
 *
 * compact — בתוך התפריט הנייד: "התחבר" ברוחב מלא, ולמחובר — תוכן התפריט עצמו (בלי כפתור).
 * loginCallbackUrl — לאן לחזור אחרי ההתחברות (בחנות: הדף הנוכחי; בספרייה: ברירת המחדל).
 * signOutCallbackUrl — לאן לעבור אחרי ההתנתקות.
 * onNavigate — סוגר את התפריט הנייד אחרי לחיצה על קישור.
 */
export default function AccountActions({
  session,
  status,
  unreadMessages = 0,
  compact = false,
  onNavigate,
  loginCallbackUrl,
  signOutCallbackUrl = '/auth/login'
}) {
  const loading = status === 'loading'

  if (compact) {
    if (loading) return null
    if (!session) {
      return (
        <Button href={loginHref(loginCallbackUrl)} onClick={onNavigate} icon="login" fullWidth>
          התחבר
        </Button>
      )
    }
    return (
      <div className="-mx-3">
        <AccountMenuItems
          user={session.user}
          unreadMessages={unreadMessages}
          signOutCallbackUrl={signOutCallbackUrl}
          onNavigate={onNavigate}
        />
      </div>
    )
  }

  return (
    <div className="flex w-(--account-slot-width) shrink-0 items-center" data-account-slot="">
      {loading ? null : session ? (
        <AccountMenu user={session.user} unreadMessages={unreadMessages} signOutCallbackUrl={signOutCallbackUrl} />
      ) : (
        <Button href={loginHref(loginCallbackUrl)} onClick={onNavigate} icon="login" size="header">
          התחבר
        </Button>
      )}
    </div>
  )
}
