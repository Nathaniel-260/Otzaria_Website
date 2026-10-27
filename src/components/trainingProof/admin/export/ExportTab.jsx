'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAsk } from '../useAsk'
import { SECTION_LABELS, SCRIPT_LABELS, OCR_ACTION_LABELS } from '@/lib/trainingProof/vocab'
import { API, getJson, fmt, fmtDate } from '../api'
import { Card, Empty, SECTION_ICONS, Tag } from '../bits'

// לשונית "הורדה לתחנה" (docs/75 ה-13; docs/76 §5): ZIP לכל חלק — רק מה שאושר, בלי תמונות.
// אחרי שהשרת סיים לשלוח את הקובץ, החומר נמחק מהאתר; נשאר רק יומן של כמה הורד ומתי.

function what(section, s) {
  if (!s?.count) return 'אין כרגע חומר מאושר להורדה.'
  const join = (o, labels) =>
    Object.entries(o || {})
      .filter(([, n]) => n)
      .map(([k, n]) => `${labels[k] || k} ${fmt(n)}`)
      .join(' · ')
  if (section === 'ocr') return `לפי כתב: ${join(s.byTrack, SCRIPT_LABELS)}. לפי מה שסומן: ${join(s.byAction, OCR_ACTION_LABELS)}.`
  if (section === 'router') return `לפי כתב: ${join(s.byLabel, { ...SCRIPT_LABELS, '': 'פסול' })}.`
  return `${fmt(s.count)} עמודים מ-${fmt(s.books?.length)} ספרים (${(s.books || []).map((b) => `${b.alias}: ${b.pages}`).join(' · ')}).`
}

export default function ExportTab({ onChanged }) {
  const { showAlert, ask } = useAsk()
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(null)
  const load = useCallback(async () => {
    try {
      setData(await getJson('/export'))
    } catch (e) {
      setData({ sections: {}, log: [], error: e.message })
    }
  }, [])
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- טעינה מהשרת; ה-setState קורה אחרי await
    load()
  }, [load])

  const download = async (section) => {
    const s = data.sections[section]
    const yes = await ask(
      `להוריד את ${SECTION_LABELS[section]}?`,
      `${fmt(s.count)} פריטים מאושרים יירדו כקובץ ZIP. מיד כשההורדה תסתיים הם יימחקו מהאתר (הטקסט והתמונות). שמרו את הקובץ אצלכם וייבאו אותו בתחנה: "ייבוא מהאתר".`,
      'הורד'
    )
    if (!yes) return
    setBusy(section)
    try {
      const res = await fetch(`${API}/export/${section}`, { method: 'POST' })
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        throw new Error(d?.error || 'ההורדה נכשלה — שום דבר לא נמחק')
      }
      const name = /filename="([^"]+)"/.exec(res.headers.get('content-disposition') || '')?.[1] || `training-proof-${section}.zip`
      const n = Number(res.headers.get('x-item-count') || 0)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = name
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 10000)
      showAlert('ירד', `${fmt(n)} פריטים בקובץ ${name}. הם נמחקים עכשיו מהאתר.`)
    } catch (e) {
      showAlert('שגיאה', e.message)
    } finally {
      setBusy(null)
      // המחיקה רצה בשרת מיד אחרי השליחה — רגע, ואז רענון
      setTimeout(() => {
        load()
        onChanged?.()
      }, 800)
    }
  }

  if (!data) return <Empty>טוען…</Empty>
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 rounded-xl bg-success-100 p-3 text-sm text-success-800">
        <span className="material-symbols-outlined">verified</span>
        <div>
          יורד <b>רק מה שאישרתם</b>, ו<b>אחרי ההורדה הוא נמחק מהאתר</b> (התמונות והטקסט) — באתר נשאר רק יומן של כמה הורד ומתי. בתחנה: "ייבוא מהאתר" — כל פריט חוזר <b>לאותו ספר ולאותו מסלול שממנו יצא</b>,
          כמאושר-אדם. שורות שסומנו "הכתב שגוי" נכנסות לתור של נתב הכתב בתחנה.
        </div>
      </div>
      {data.error && <Empty>{data.error}</Empty>}
      {['ocr', 'router', 'frames'].map((s) => {
        const x = data.sections[s] || { count: 0 }
        return (
          <Card
            key={s}
            title={SECTION_LABELS[s]}
            icon={SECTION_ICONS[s]}
            actions={<Tag tone={x.count ? 'ok' : 'muted'}>{fmt(x.count)} מאושרים, ממתינים להורדה</Tag>}
          >
            <p className="text-sm text-on-surface/70">{what(s, x)}</p>
            <div>
              <button
                className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-40"
                disabled={!x.count || !!busy || x.busy}
                onClick={() => download(s)}
              >
                <span className="material-symbols-outlined text-base">download</span>
                {busy === s ? 'מוריד…' : x.busy ? 'הורדה אחרת רצה' : 'הורד ZIP לתחנה'}
              </button>
            </div>
          </Card>
        )
      })}
      <Card title="יומן ההורדות" icon="history">
        {!data.log.length ? (
          <Empty>עוד לא הורד דבר</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-variant/50 text-right">
                <tr>
                  <th className="p-2">מתי</th>
                  <th className="p-2">חלק</th>
                  <th className="p-2">כמה</th>
                  <th className="p-2">מי</th>
                  <th className="p-2">מזהה</th>
                </tr>
              </thead>
              <tbody>
                {data.log.map((l) => (
                  <tr key={l.exportId} className="border-t border-surface-variant">
                    <td className="p-2">{fmtDate(l.at)}</td>
                    <td className="p-2">{SECTION_LABELS[l.section]}</td>
                    <td className="p-2 tabular-nums">{fmt(l.count)}</td>
                    <td className="p-2">{l.by || '—'}</td>
                    <td className="p-2 text-xs text-on-surface/50" dir="ltr">
                      {l.exportId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
