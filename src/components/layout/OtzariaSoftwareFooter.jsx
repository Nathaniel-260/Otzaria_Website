import Link from 'next/link'

// כותרת תחתונה בסגנון ה-topBar של האפליקציה: רקע surfaceContainerHigh, קו הפרדה דק
// למעלה, טקסט שקט. אותה כותרת משמשת את כל הדפים הציבוריים.
const FOOTER_LINKS = [
  { href: '/license', label: 'רשיון' },
  { href: '/library', label: 'הספרייה המקוונת' },
  { href: '/privacy', label: 'מדיניות פרטיות' }
]

export default function OtzariaSoftwareFooter() {
  return (
    <footer className="mt-20 border-t border-surface-variant bg-top-bar px-4 py-10">
      <div className="container mx-auto flex max-w-6xl flex-col items-center gap-5 text-center">
        <div className="flex items-center gap-2.5">
          <img src="/logo.webp" alt="" width={28} height={28} loading="lazy" />
          <span className="text-lg font-bold text-on-surface">אוצריא</span>
        </div>
        <p className="max-w-xl text-sm text-on-surface-variant">
          תוכנה זו נוצרה והוקדשה על ידי המפתחים והתורמים של פרויקט אוצריא
        </p>
        <nav className="flex flex-wrap justify-center gap-x-1 gap-y-1 text-sm" aria-label="קישורים בכותרת התחתונה">
          <a
            href="https://github.com/otzaria/otzaria"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center rounded-lg px-3 font-medium text-primary transition-colors hover:bg-card-selected"
          >
            GitHub
          </a>
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch={false}
              className="inline-flex min-h-12 items-center rounded-lg px-3 text-on-surface-variant transition-colors hover:bg-card-selected hover:text-on-surface"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="text-xs text-outline">רישיון שימוש אישי — Personal Use License 1.0</p>
      </div>
    </footer>
  )
}
