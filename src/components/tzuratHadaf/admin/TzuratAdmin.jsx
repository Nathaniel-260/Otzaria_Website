'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import OverviewSection from './OverviewSection'
import UploadsSection from './UploadsSection'
import DisputesSection from './DisputesSection'
import SubmissionsSection from './SubmissionsSection'
import ReportsSection from './ReportsSection'
import ExportCard from './ExportCard'
import GuideEditorCard from './GuideEditorCard'
import TokensCard from './TokensCard'

// מסך הניהול של צורת הדף: לשוניות (סקירה, העלאת חבילות, מחלוקות, הגשות עמוד, דיווחים, ייצוא, הנחיות,
// מפתחות API). הלשונית נשמרת ב-hash של הכתובת (#disputes), כך שאפשר לקשר אליה ולחזור אליה ברענון.
// רק הלשונית הפעילה מוצגת (וטוענת את הנתונים שלה).

export const TABS = [
  { id: 'overview', label: 'סקירה', icon: 'bar_chart', Comp: OverviewSection },
  { id: 'uploads', label: 'העלאת חבילות', icon: 'cloud_upload', Comp: UploadsSection },
  { id: 'disputes', label: 'מחלוקות', icon: 'gavel', Comp: DisputesSection },
  { id: 'submissions', label: 'הגשות עמוד', icon: 'rate_review', Comp: SubmissionsSection },
  { id: 'reports', label: 'דיווחים', icon: 'flag', Comp: ReportsSection },
  { id: 'export', label: 'ייצוא', icon: 'download', Comp: ExportCard },
  { id: 'guide', label: 'הנחיות', icon: 'menu_book', Comp: GuideEditorCard },
  { id: 'tokens', label: 'מפתחות API', icon: 'key', Comp: TokensCard },
]

const tabFromHash = () => {
  if (typeof window === 'undefined') return null
  const id = window.location.hash.replace(/^#/, '')
  return TABS.some((t) => t.id === id) ? id : null
}

export default function TzuratAdmin({ initialTab = 'overview' }) {
  const [tab, setTab] = useState(initialTab)

  useEffect(() => {
    const sync = () => {
      const t = tabFromHash()
      if (t) setTab(t)
    }
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  const choose = (id) => {
    setTab(id)
    try {
      window.history.replaceState(null, '', `#${id}`)
    } catch {
      // סביבה בלי history (בדיקות) — רק המצב המקומי
    }
  }

  const Active = (TABS.find((t) => t.id === tab) || TABS[0]).Comp

  return (
    <div className="flex flex-col gap-4">
      <div className="glass-strong rounded-xl p-4">
        <h2 className="flex items-center gap-2 text-2xl font-bold text-on-surface">
          <span aria-hidden="true" className="material-symbols-outlined text-primary">splitscreen</span>
          צורת הדף — בדיקה מול הדפוס
        </h2>
        <p className="mt-1 text-sm text-on-surface/60">
          עמודי ש&quot;ס בצורת דף וילנא מול הסריקה. מתנדבים מכריעים בהחלטות נוסח (שתי תשובות זהות — מוסכם; שונות — מחלוקת שמוכרעת כאן), בודקים עמודים
          ושוברים שורות, ומדווחים. ההגשות ממתינות לאישור כאן, והכול יוצא בייצוא לצורת הדף. דף המתנדבים:{' '}
          <Link href="/library/tzurat-hadaf" prefetch={false} className="text-primary underline">
            /library/tzurat-hadaf
          </Link>
        </p>
      </div>

      <nav aria-label="לשוניות צורת הדף" className="flex flex-wrap gap-2" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => choose(t.id)}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${tab === t.id ? 'bg-primary text-on-primary' : 'glass text-on-surface hover:bg-surface-variant'}`}
          >
            <span aria-hidden="true" className="material-symbols-outlined text-base">
              {t.icon}
            </span>
            {t.label}
          </button>
        ))}
      </nav>

      <div role="tabpanel">
        <Active />
      </div>
    </div>
  )
}
