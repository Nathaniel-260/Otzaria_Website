import type { Metadata } from "next";
import localFont from "next/font/local";
import { Assistant } from "next/font/google";
import "./globals.css"; 
import SessionProvider from "@/components/providers/SessionProvider";
import ErrorBoundary from "@/components/providers/ErrorBoundary";
import VersionNotice from "@/components/notifications/VersionNotice";
import ReminderGuard from "@/components/notifications/ReminderGuard"; 
import { DialogProvider } from '@/components/providers/DialogContext'
import { LoadingProvider } from '@/components/providers/LoadingContext'
import { ICON_FONT_URL } from '@/lib/icon-font'


const frankRuehl = localFont({
  src: "./fonts/FrankRuehlCLM-Medium.woff2",
  variable: "--font-frank-ruehl",
  display: "swap",
});

// OT Vilna — Levi Chyrek / Otzar Fonts; התקבל אישור שימוש באתר.
// שני משקלים: Bold (700) לטקסט התצוגה המודגש (font-display: כותרות האזורים), ו-Regular (400)
// למילה "אוצריא" כשם המותג (הכותרת הראשית בגיבור ושם האתר בכותרת העליונה). אין בו אותיות לטיניות — הן נופלות ל---font-hebrew (typography.css).
// preload (ברירת המחדל) נשאר: שם האתר בכותרת העליונה משתמש בו בכל עמוד, ובדף הבית הוא
// גם הכותרת הראשית. כ-17KB לכל משקל. adjustFontFallback (ברירת המחדל, Arial מותאם-מידות) מצמצם
// את קפיצת ה-layout ברגע ההחלפה (display: swap).
const vilna = localFont({
  src: [
    { path: "./fonts/OTVilna-Regular.woff2", weight: "400" },
    { path: "./fonts/OTVilna-Bold.woff2", weight: "700" },
  ],
  variable: "--font-vilna",
  display: "swap",
});

// Assistant — גופן הגוף והממשק בכל האתר (--font-sans / --font-hebrew ב-typography.css).
// גופן משתנה (200–800) — קובץ אחד לכל המשקלים. next/font מוריד אותו בזמן ה-build ומגיש
// אותו מהאתר עצמו (בלי בקשה ל-Google בזמן ריצה). Assistant נראה קטן מגופן המערכת באותו
// גודל — הפיצוי ב---font-body-size-adjust (typography.css), לא בגדלים עצמם.
const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  variable: "--font-assistant",
  display: "swap",
});

export const metadata: Metadata = {
  title: "אוצריא",
  description: "פלטפורמה משותפת לעריכה ושיתוף",
  // האייקונים נקבעים על ידי app/icon.png ו-app/apple-icon.png (מוסיף Next hash
  // ו-cache ארוך). קודם הוגש כאן logo.svg — 1.68MB דחוסים כ-favicon.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // --font-assistant על <html> ולא על <body>: --font-sans/--font-hebrew (typography.css) הם
  // טוקני @theme רגילים שמחושבים ב-:root, ושם המשתנה חייב כבר להיות מוגדר
  return (
    <html lang="he" dir="rtl" className={assistant.variable}>
      <head>
        {/* גופן האייקונים מוגש מקומית כ-subset (scripts/build-icon-font.mjs) ומוצהר
            ב-styles/icon-font.css. ה-preload מקדים את הבקשה לפרסור ה-CSS. */}
        <link rel="preload" href={ICON_FONT_URL} as="font" type="font/woff2" crossOrigin="anonymous" />
        {/* חסימת שבת/יום טוב מתבצעת כעת בצד שרת ב-src/proxy.js (כולל מעבר חופשי לבוטים) */}
      </head>
      <body className={`antialiased bg-background text-foreground font-sans ${frankRuehl.variable} ${vilna.variable}`}>
        <ErrorBoundary>
          <SessionProvider>
            <DialogProvider>
              <LoadingProvider>
                <ReminderGuard>
                  {children}
                </ReminderGuard>
                
                {/* חותם הדפלוי מוטמע בזמן build (next.config.ts) — חוסך בקשת
                    version.json בכל טעינת דף */}
                <VersionNotice deployVersion={process.env.DEPLOY_VERSION} />
              </LoadingProvider>
            </DialogProvider>
          </SessionProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
