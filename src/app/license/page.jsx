import { fetchLicenseText, LICENSE_BLOB_URL } from '@/lib/licenseSource'
import LegalPage, { ForumContact, LegalHeading } from '@/components/legal/LegalPage'
import { pageMetadata } from '@/lib/seo'

export const metadata = pageMetadata({
  title: 'רישיון שימוש',
  description: 'תנאי הרישיון של תוכנת אוצריא ושל ספריית הספרים שלה.',
  path: '/license',
})

// אותו מקור (URL מוצמד ל-commit, timeout ובדיקת שפיות) כמו ב-/api/license — src/lib/licenseSource.js,
// אך נטען ישירות בצד השרת כדי למנוע מסך טעינה ו-JavaScript מיותר בצד הלקוח.
async function loadLicenseText() {
  try {
    return await fetchLicenseText()
  } catch (error) {
    console.error('License fetch error:', error)
    return null
  }
}

export default async function LicensePage() {
  const licenseText = await loadLicenseText()
  const error = licenseText === null

  return (
    <LegalPage title="רישיון שימוש - אוצריא (Otzaria)">
      <div>
        <LegalHeading>מבוא</LegalHeading>
        <p>
          פרויקט "אוצריא" הוא מיזם שמטרתו הנגשת ספרי קודש לציבור.
          התוכנה מופצת תחת <strong>Personal Use License 1.0</strong> — רישיון שימוש אישי בלבד.
          הספרייה (הספרים והתכנים) מופצת תחת רישיון נפרד — <a href="/library/license" className="text-primary hover:underline">לפרטי רישיון הספרייה</a>.
        </p>
      </div>

      <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10">
        <LegalHeading icon="gavel">תנאי הרישיון (License)</LegalHeading>


        <div className="p-4 rounded-xl border border-surface-variant/50 mb-6 dir-ltr text-left font-sans text-sm text-on-surface/90">
          {error ? (
            <div className="text-danger-500 text-center py-4">
              <p>לא ניתן היה לטעון את הרישיון.</p>
              <a
                href={LICENSE_BLOB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                צפייה בקובץ הרישיון במקור (GitHub)
              </a>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap font-mono leading-relaxed">
              {licenseText}
            </pre>
          )}
        </div>

        <div className="flex items-center gap-2 text-sm bg-surface p-3 rounded-lg border border-surface-variant/50">
           <span className="material-symbols-outlined text-primary text-lg">info</span>
           <p>
            לצפייה בקובץ הרישיון המקורי והעדכני ב-GitHub:{' '}
            <a
              href={LICENSE_BLOB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-bold hover:underline"
            >
              קובץ הרישיון ב-GitHub
            </a>
          </p>
        </div>
      </div>

      <ForumContact question="יש לך שאלות נוספות בנוגע לרישיון?" />
    </LegalPage>
  )
}
