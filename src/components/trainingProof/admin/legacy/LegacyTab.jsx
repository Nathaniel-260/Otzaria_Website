'use client'

import { useCallback, useEffect, useState } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import { useAsk } from '../useAsk'
import { getJson, sendJson, fmt } from '../api'
import { Card, Empty } from '../bits'

// לשונית "הדף הישן" (docs/75 ה-15): כלי מחיקה **חד-פעמי** לנתונים של הגהת-העמודים הקודמת —
// ספרים, עמודים, הגשות, טיוטות ותמונות-העמודים. לא אוטומטי: כפתור ← חלון-אישור ראשון ←
// חלון שני שבו מקלידים את משפט-האישור. הקוד הישן עצמו לא נמחק כאן (החלטה נפרדת).

export default function LegacyTab() {
  const { showAlert, ask } = useAsk()
  const [data, setData] = useState(null)
  const [step2, setStep2] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    try {
      setData(await getJson('/legacy'))
    } catch (e) {
      setData({ error: e.message })
    }
  }, [])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- טעינה מהשרת; ה-setState קורה אחרי await
    load()
  }, [load])

  if (!data) return <Empty>טוען…</Empty>
  if (data.error) return <Empty>{data.error}</Empty>
  const c = data.counts
  const total = c.books + c.pages + c.submissions + c.drafts + data.files

  const first = async () => {
    const yes = await ask(
      'למחוק את כל הנתונים של הדף הישן?',
      `${fmt(c.books)} ספרים, ${fmt(c.pages)} עמודים, ${fmt(c.submissions)} הגשות, ${fmt(c.drafts)} טיוטות ו-${fmt(data.files)} תמונות. אין דרך לשחזר.`,
      'המשך'
    )
    if (yes) {
      setTyped('')
      setStep2(true)
    }
  }
  const run = async () => {
    setBusy(true)
    try {
      const r = await sendJson('/legacy', { confirm: typed })
      setStep2(false)
      showAlert('נמחק', `${fmt(r.deleted.books)} ספרים, ${fmt(r.deleted.pages)} עמודים, ${fmt(r.deleted.submissions)} הגשות ו-${fmt(r.files)} תמונות נמחקו`)
      load()
    } catch (e) {
      showAlert('שגיאה', e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card title="הדף הישן — הגהת עמודים" icon="delete_forever">
      <p className="text-sm">
        הדף הזה החליף את הגהת-העמודים הקודמת. הנתונים שלה עדיין במסד ובתיקיית התמונות, והוחלט שאין בהם צורך כרגע (ה-15). כאן אפשר למחוק אותם — <b>פעם אחת, רק בלחיצה שלכם</b>, אחרי
        שני אישורים.
      </p>
      <ul className="list-disc ps-5 text-sm">
        <li>ספרים: {fmt(c.books)}</li>
        <li>עמודים: {fmt(c.pages)}</li>
        <li>הגשות: {fmt(c.submissions)}</li>
        <li>טיוטות: {fmt(c.drafts)}</li>
        <li>קובצי תמונות: {fmt(data.files)}</li>
      </ul>
      <p className="text-xs text-on-surface/60">
        לא נמחקים: הקוד הישן (ההחלטה על הסרתו מהמאגר תיסגר מול פלמוני), מפתחות-הגישה של תוכנת-הספר, ההגדרות, ותמונות הספרים של האתר עצמו.
      </p>
      <div>
        <button
          className="inline-flex items-center gap-1 rounded-full bg-danger-100 px-4 py-2 text-sm font-semibold text-danger-700 disabled:opacity-40"
          disabled={!total || busy}
          onClick={first}
        >
          <span className="material-symbols-outlined text-base">delete_forever</span> {total ? 'מחק את הנתונים של הדף הישן…' : 'אין מה למחוק'}
        </button>
      </div>
      {step2 && (
        <Dialog
          title="אישור אחרון"
          onClose={() => setStep2(false)}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="text" size="sm" onClick={() => setStep2(false)}>
                ביטול
              </Button>
              <Button variant="danger" size="sm" disabled={typed !== data.confirm || busy} onClick={run}>
                מחק לצמיתות
              </Button>
            </div>
          }
        >
          <label className="flex flex-col gap-2 text-sm">
            <span>
              כדי למחוק, הקלידו: <b>{data.confirm}</b>
            </span>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} className="rounded-md border border-surface-variant bg-surface px-2 py-1" autoComplete="off" />
          </label>
        </Dialog>
      )}
    </Card>
  )
}
