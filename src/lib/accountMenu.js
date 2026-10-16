import { hasAnyAdminAccess } from './roles.js'

/**
 * לוגיקה טהורה של אזור החשבון בכותרות (components/layout/AccountActions + AccountMenu):
 * כתובות, תווית קצרה לכפתור החשבון, ורשימת הקישורים בתפריט לפי תפקיד.
 */

/** כתובת ההתחברות — עם callbackUrl כשרוצים לחזור לאותו דף אחרי ההתחברות */
export function loginHref(callbackUrl) {
  return callbackUrl ? `/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : '/auth/login'
}

/** יעד "ניהול": מפתח — דיווחי התוכנה בלבד; מנהל (כל סוג, roles.js) — לוח הניהול; אחר — אין */
export function adminHref(role) {
  if (role === 'developer') return '/library/admin/app-reports'
  if (hasAnyAdminAccess(role)) return '/library/admin'
  return null
}

/** האות הראשונה של השם (לעיגול שבכפתור החשבון); בלי שם — אייקון במקומה (null) */
export function userInitial(name) {
  const trimmed = typeof name === 'string' ? name.trim() : ''
  return trimmed ? trimmed.charAt(0).toUpperCase() : null
}

/** שם קצר לכפתור החשבון — המילה הראשונה של השם (הקיצור הסופי ב-CSS, truncate) */
export function shortName(name) {
  const trimmed = typeof name === 'string' ? name.trim() : ''
  return trimmed ? trimmed.split(/\s+/)[0] : 'החשבון שלי'
}

/** השם הנגיש של כפתור החשבון: בלי השם המלא קורא המסך היה שומע רק את המילה הראשונה */
export function accountButtonLabel(name, unreadMessages = 0) {
  const base = name ? `החשבון של ${name}` : 'החשבון שלי'
  return unreadMessages > 0 ? `${base}${unreadMessagesLabel(unreadMessages)}` : base
}

/** טקסט למונה ההודעות (לקורא מסך): המספר לבדו אינו מובן */
export function unreadMessagesLabel(count) {
  return count === 1 ? ', הודעה חדשה אחת' : `, ${count} הודעות חדשות`
}

/**
 * הקישורים בתפריט החשבון, לפי הסדר. ההתנתקות אינה כאן — היא כפתור (signOut), לא קישור.
 * "ניהול" — רק למורשים (adminHref), עם מונה ההודעות שלא נקראו.
 */
export function accountMenuLinks(role, unreadMessages = 0) {
  const links = [{ href: '/library/dashboard', label: 'לוח בקרה', icon: 'dashboard' }]
  const admin = adminHref(role)
  if (admin) {
    links.push({
      href: admin,
      label: 'ניהול',
      icon: 'admin_panel_settings',
      badge: unreadMessages > 0 ? unreadMessages : undefined
    })
  }
  return links
}
