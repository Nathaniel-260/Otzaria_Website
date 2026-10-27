'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAsk } from '../useAsk'
import { SECTION_LABELS } from '@/lib/trainingProof/vocab'
import { getJson, sendJson, fmt, fmtDate } from '../api'
import { BTN, Card, Empty, Tag } from '../bits'
import UploadCard, { readText } from './UploadCard'

// לשונית "העלאת חומר": שלושה כרטיסים (חלק לכל כרטיס) וטבלת החבילות באתר —
// מה נקרא מכל קובץ, כמה כבר הוגה, השהה/פתח, ומחיקה (עם אזהרה).

function PackagesTable({ packages, onChanged }) {
  const { showAlert, ask } = useAsk()
  const [busy, setBusy] = useState(null)
  const path = (p) => `/packages/${p.packageId}/${p.part}`

  const toggle = async (p) => {
    setBusy(p)
    try {
      await sendJson(path(p), { open: !p.open }, 'PATCH')
      onChanged()
    } catch (e) {
      showAlert('שגיאה', e.message)
    } finally {
      setBusy(null)
    }
  }
  const remove = async (p) => {
    const left = p.counts.available + p.counts.held
    const done = p.counts.submitted + p.counts.approved
    const yes = await ask(
      'למחוק את החבילה?',
      `${p.label || p.packageId} (חלק ${p.part}): ${fmt(left)} פריטים שעוד לא הוגו יימחקו מהאתר, עם התמונות שלהם${p.counts.held ? ` — כולל ${fmt(p.counts.held)} שנמצאים עכשיו אצל מתנדבים` : ''}. ${done ? `${fmt(done)} שכבר הוגו נשארים לסקירה ולהורדה.` : ''} אין דרך לשחזר — רק להעלות את הקובץ שוב.`,
      'מחק'
    )
    if (!yes) return
    setBusy(p)
    try {
      const r = await sendJson(path(p), undefined, 'DELETE')
      showAlert('נמחק', `${fmt(r.deleted)} פריטים נמחקו${r.kept ? `, ${fmt(r.kept)} נשארו` : ''}`)
      onChanged()
    } catch (e) {
      showAlert('שגיאה', e.message)
    } finally {
      setBusy(null)
    }
  }

  if (!packages.length) return <Empty>עוד לא הועלו חבילות</Empty>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-surface-variant/50 text-right">
          <tr>
            <th className="p-2">חבילה</th>
            <th className="p-2">חלק</th>
            <th className="p-2">מה בקובץ (נקרא ממנו)</th>
            <th className="p-2">הוגהו</th>
            <th className="p-2">מצב</th>
            <th className="p-2" />
          </tr>
        </thead>
        <tbody>
          {packages.map((p) => {
            const done = p.counts.submitted + p.counts.approved
            const total = p.counts.total || 1
            return (
              <tr key={`${p.packageId}#${p.part}`} className="border-t border-surface-variant align-top">
                <td className="p-2">
                  <b>{p.label || '—'}</b>
                  <div className="text-xs text-on-surface/50" dir="ltr">
                    {p.packageId} · {p.part}/{p.parts}
                  </div>
                  <div className="text-xs text-on-surface/50">הועלה {fmtDate(p.uploadedAt)}</div>
                </td>
                <td className="p-2">{SECTION_LABELS[p.section]}</td>
                <td className="p-2 text-xs">{readText(p.section, p.read)}</td>
                <td className="min-w-36 p-2">
                  <div className="h-2 overflow-hidden rounded-full bg-surface-variant">
                    <div className="h-full bg-success-600" style={{ width: `${(100 * done) / total}%` }} />
                  </div>
                  <div className="text-xs tabular-nums">
                    {fmt(done)} / {fmt(p.counts.total)}
                    {p.counts.held ? ` · ${fmt(p.counts.held)} בעבודה` : ''}
                  </div>
                </td>
                <td className="p-2">{p.open ? <Tag tone="ok">פתוח למתנדבים</Tag> : <Tag>מושהה</Tag>}</td>
                <td className="p-2">
                  <div className="flex flex-nowrap gap-1">
                    <button className={BTN.outline} disabled={busy === p} onClick={() => toggle(p)}>
                      <span className="material-symbols-outlined text-sm">{p.open ? 'pause_circle' : 'play_circle'}</span>
                      {p.open ? 'השהה' : 'פתח'}
                    </button>
                    <button className={BTN.danger} disabled={busy === p} onClick={() => remove(p)}>
                      <span className="material-symbols-outlined text-sm">delete</span> מחק
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function UploadTab({ onChanged }) {
  const [packages, setPackages] = useState(null)
  const load = useCallback(async () => {
    try {
      setPackages((await getJson('/packages')).packages)
    } catch {
      setPackages([])
    }
  }, [])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- טעינה מהשרת; ה-setState קורה אחרי await
    load()
  }, [load])
  const changed = useCallback(() => {
    load()
    onChanged?.()
  }, [load, onChanged])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 rounded-xl bg-info-100 p-3 text-sm text-info-800">
        <span className="material-symbols-outlined">info</span>
        <div>
          בתחנת-האימון בוחרים מה לייצא ולאיזה צורך, והתחנה בונה קובץ ZIP. <b>אין מה לבחור כאן:</b> כל פריט בקובץ נושא איתו מאיזה ספר ומאיזה מסלול הוא בא, וכך גם יחזור לתחנה. קובץ
          שהועלה לחלק הלא-נכון — האתר מזהה ומודיע. העלאה חוזרת של אותו קובץ לא משכפלת דבר.
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        {['ocr', 'router', 'frames'].map((s) => (
          <UploadCard key={s} section={s} onDone={changed} />
        ))}
      </div>
      <Card title="החבילות באתר" icon="inventory">
        {packages === null ? <Empty>טוען…</Empty> : <PackagesTable packages={packages} onChanged={changed} />}
      </Card>
    </div>
  )
}
