import type { ReactNode } from 'react'
import OtzariaSoftwareHeader from '@/components/layout/OtzariaSoftwareHeader'
import OtzariaSoftwareFooter from '@/components/layout/OtzariaSoftwareFooter'

/**
 * העוטף של כל דפי חנות התוספים: הכותרת (עם אזור החשבון) והפוטר יושבים כאן ולא בכל עמוד,
 * כדי שבמעבר בין דפי החנות (/plugins ← /plugins/all ← /plugins/[id]...) הם נשארים על המסך
 * ולא נטענים מחדש — גם בזמן loading.jsx, שמחליף רק את התוכן שבאמצע.
 *
 * Server Component בלי קריאת session: הכותרת קוראת אותו בדפדפן (useSession), כך שהעוטף לא
 * הופך את דפי החנות לדינמיים או תלויי-משתמש (המטמון הציבורי שלהם — next.config.ts).
 *
 * המעטפת כמו בעמודים הציבוריים (/about, /docs): text-on-surface כצבע ברירת המחדל, ו-overflow-x-clip
 * — רשת נגללת (PluginGrid mobileRail) נמתחת עד קצות המסך בלי לגרום לגלילה אופקית של הדף.
 * clip ולא hidden: hidden יוצר אזור גלילה ושובר את sticky (סרגל הקטגוריות בבית החנות).
 * כל עמוד מביא <main id="main-content"> משלו (יחיד בעמוד).
 */
export default function PluginsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-background text-on-surface">
      <OtzariaSoftwareHeader showAuth />
      {children}
      <OtzariaSoftwareFooter className="mt-20" />
    </div>
  )
}
