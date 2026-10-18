'use client'

import { useState } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import IconTile from '@/components/ui/IconTile'

const REPO_URL = 'https://github.com/Otzaria/otzaria-plugin-store'

function formatSize(bytes) {
  if (!bytes) return null
  return `כ-${Math.round(bytes / (1024 * 1024))}MB`
}

function formatDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })
}

const HIGHLIGHTS = [
  { icon: 'extension', text: 'כל התוספים ארוזים בפנים מראש' },
  { icon: 'wifi_off', text: 'עובדת גם בלי חיבור לאינטרנט' },
  { icon: 'download_done', text: 'מתקינים ישירות לתוך אוצריא' },
]

/**
 * כפתור להורדת "חנות התוספים" — אפליקציית Windows נפרדת שמכילה מראש את כל
 * התוספים. בלחיצה נפתח דיאלוג הסבר (ui/Dialog — פוקוס נלכד, Esc, הפוקוס חוזר לכפתור),
 * וההורדה מתחילה רק לאחר אישור.
 * variant/size — מראה הכפתור (בבית החנות: כפתור טקסט קטן, פעולה משנית שקטה).
 */
export default function PluginStoreAppBanner({ variant = 'outlined', size: buttonSize = 'md' } = {}) {
  const [open, setOpen] = useState(false)
  const [release, setRelease] = useState(null)
  const [loading, setLoading] = useState(false)

  const openDialog = async () => {
    setOpen(true)
    if (release || loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/plugin-store-app-release')
      if (res.ok) setRelease(await res.json())
    } catch {
      // בלי פרטי גרסה — ההורדה תפנה לדף ההפצות בגיטהאב
    } finally {
      setLoading(false)
    }
  }

  const closeDialog = () => setOpen(false)

  const size = formatSize(release?.size)
  const updated = formatDate(release?.updatedAt)
  const downloadHref = release?.url || `${REPO_URL}/releases`

  return (
    <>
      <Button type="button" variant={variant} size={buttonSize} icon="desktop_windows" onClick={openDialog} aria-haspopup="dialog">
        הורדת החנות למחשב
      </Button>

      {open && (
        <Dialog
          title="חנות התוספים למחשב"
          onClose={closeDialog}
          footer={
            <>
              <Button
                href={downloadHref}
                // בכרטיסיה חדשה: אם שליפת ה-release נכשלה ההורדה מפנה לדף ההפצות
                // בגיטהאב, ואין רוצים לזרוק את המשתמש מהחנות בגלל זה.
                external
                onClick={closeDialog}
                variant="filled"
                icon="download"
                className="flex-1 sm:flex-none"
              >
                הורדה
              </Button>
              <Button type="button" variant="outlined" onClick={closeDialog} className="flex-1 sm:flex-none">
                ביטול
              </Button>
            </>
          }
        >
          <div className="flex flex-col items-center text-center">
            <IconTile icon="desktop_windows" size="lg" />
            <p className="mt-4 max-w-measure text-body-md text-on-surface-variant">
              תוכנה נפרדת למחשבי Windows, שכל התוספים כבר נמצאים בתוכה. אפשר לעיין בהם
              ולהתקין אותם ישירות לאוצריא, גם במחשב שאין בו חיבור לאינטרנט.
            </p>
          </div>

          <ul className="mt-6 space-y-3">
            {HIGHLIGHTS.map(item => (
              <li key={item.icon} className="flex items-center gap-3 text-body-md text-on-surface">
                <IconTile icon={item.icon} size="sm" />
                <span>{item.text}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap justify-center gap-2" aria-live="polite">
            <Badge size="md">מיועדת ל-Windows</Badge>
            <Badge size="md">{loading ? 'בודק גודל…' : size ? `גודל ${size}` : 'קובץ הרצה אחד'}</Badge>
            {updated && <Badge size="md">עודכנה ב-{updated}</Badge>}
          </div>
        </Dialog>
      )}
    </>
  )
}
