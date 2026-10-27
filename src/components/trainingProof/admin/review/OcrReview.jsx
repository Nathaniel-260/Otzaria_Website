'use client'

import { useState } from 'react'
import { LINE_SCRIPTS, SCRIPT_LABELS, OCR_RETURN_ACTIONS } from '@/lib/trainingProof/vocab'
import { fmt } from '../api'
import { BTN, Empty, Muted } from '../bits'
import { useReview } from './useReview'
import { BulkBar, Pager } from './BulkBar'
import OcrRow from './OcrRow'
import VolunteerPicker from './VolunteerPicker'

const ACTION_FILTER = { ok: 'סימן: נכון', fixed: 'תיקן', seg: 'חיתוך גרוע', bad: 'לא קריא', router: 'הכתב שגוי' }
const select = 'rounded-md border border-surface-variant bg-surface px-2 py-1 text-sm'

// סקירת זיהוי-הטקסט: מסננים (מצב, מסלול, מה המתנדב עשה, מתנדב, ביטחון נמוך קודם),
// השוואה מודל↔מתנדב, אישור בודד / "תקן ואשר" / דחייה, סימון ואישור/דחייה גורפים,
// ואישור מהיר על כל התור.
export default function OcrReview({ onChanged }) {
  const [f, setF] = useState({ status: 'submitted', track: '', action: '', vol: '', lowConf: false })
  const [picker, setPicker] = useState(false)
  const query = { section: 'ocr', status: f.status, track: f.track || null, action: f.action || null, vol: f.vol || null, lowConf: f.lowConf ? '1' : null }
  const R = useReview(query, onChanged)
  const items = R.data?.items || []
  const stats = R.data?.stats
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const okInView = items.filter((x) => x.status === 'submitted' && x.result?.action === 'ok').length

  return (
    <div className="flex flex-col gap-3">
      <div className="glass-strong flex flex-col gap-2 rounded-xl p-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <label className="flex items-center gap-1.5">
            מצב
            <select className={select} value={f.status} onChange={set('status')}>
              <option value="submitted">ממתינות לאישור</option>
              <option value="approved">אושרו (עוד לא הורדו)</option>
            </select>
          </label>
          <label className="flex items-center gap-1.5">
            מסלול
            <select className={select} value={f.track} onChange={set('track')}>
              <option value="">כל הכתבים</option>
              {LINE_SCRIPTS.map((s) => (
                <option key={s} value={s}>
                  {SCRIPT_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5">
            מה המתנדב עשה
            <select className={select} value={f.action} onChange={set('action')}>
              <option value="">הכול</option>
              {OCR_RETURN_ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {ACTION_FILTER[a]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5">
            מתנדב
            <select className={select} value={f.vol} onChange={set('vol')}>
              <option value="">כולם</option>
              {(stats?.vols || []).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={f.lowConf} onChange={set('lowConf')} />
            ביטחון נמוך קודם
          </label>
        </div>
        <Muted>השורות מעורבבות מכל הספרים. "הכתב שגוי" לא נכנס לאימון הקריאה — באישור הוא חוזר בתחנה לתור של נתב הכתב.</Muted>
      </div>

      {f.status === 'submitted' && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-on-surface/60">אישור מהיר:</span>
          <button
            className={BTN.tonal}
            disabled={R.busy || !stats?.okUnchanged}
            onClick={() =>
              R.bulk('ok-unchanged', {}, {
                title: (n) => `לאשר ${fmt(n)} שורות "נכון"?`,
                message: 'בכל התור (לא רק במסך): כל השורות שהמתנדב סימן "נכון" ולא שינה בהן אף אות. כדאי לעבור קודם על מדגם מהן.',
              })
            }
          >
            כל ה"נכון" שלא שונו ({fmt(okInView)} בתצוגה, {fmt(stats?.okUnchanged)} בכל התור)
          </button>
          <button className={BTN.tonal} disabled={R.busy || !stats?.vols?.length} onClick={() => setPicker(true)}>
            הכול ממתנדב מסוים…
          </button>
        </div>
      )}

      <BulkBar
        items={items}
        sel={R.sel}
        setSel={R.setSel}
        busy={R.busy}
        total={R.data?.total || 0}
        onApprove={() => R.decideSelected('approve')}
        onReject={() => R.decideSelected('reject')}
      />

      <div className="glass-strong overflow-hidden rounded-xl" aria-busy={!R.data}>
        {R.data?.error && <Empty>{R.data.error}</Empty>}
        {R.data && !items.length && !R.data.error && <Empty>אין שורות בתצוגה הזו</Empty>}
        {!R.data && <Empty>טוען…</Empty>}
        {items.map((it) => (
          <OcrRow
            key={it.id}
            item={it}
            busy={R.busy}
            selected={R.sel.has(it.id)}
            onToggle={R.toggle}
            onApprove={(x) => R.decide([x.id], 'approve')}
            onReject={(x) => R.decide([x.id], 'reject')}
            onUnapprove={(x) => R.decide([x.id], 'unapprove')}
            onFix={(x, text) => R.fix(x, { action: 'fixed', text })}
          />
        ))}
      </div>
      <Pager data={R.data} setPage={R.setPage} />

      {picker && (
        <VolunteerPicker
          vols={stats?.vols || []}
          onClose={() => setPicker(false)}
          onPick={(v) => {
            setPicker(false)
            R.bulk('volunteer', { vol: v.id }, {
              title: (n) => `לאשר ${fmt(n)} שורות של ${v.name}?`,
              message: `כל ההגשות הממתינות של ${v.name} בזיהוי-הטקסט, בכל הכתבים.${v.match != null ? ` שיעור-ההתאמה שלו עד היום: ${v.match}%.` : ''}`,
            })
          }}
        />
      )}
    </div>
  )
}
