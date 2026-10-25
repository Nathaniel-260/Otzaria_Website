'use client'

import { useEffect, useMemo, useState } from 'react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useDialog } from '@/components/providers/DialogContext'
import { formatDateShortMonthWithYearAndTime } from '@/lib/formatDate'
import { apiCall, pageImageUrl } from './adminApi'
import { Pill, btnDanger, btnGhost, btnSuccess } from './AdminBits'
import { CHECK_LABEL, CHECK_VALUE, REPORT_CATEGORY, REPORT_STATUS, VERDICT_LABEL, kindLabel, words } from './adminLabels'
import { REJECT_REASON, keepOps, lineChanges, opLabel } from './lineDiff'
import RegionImage, { arrBox } from './RegionImage'

// סקירת הגשת עמוד במסך מלא: הסריקה ליד העמוד שלנו (עם מסגרות לשורות שהשתנו ולאזורי הדיווחים),
// שבירת השורות לפני/אחרי לכל שורה (applyLineOps — אותה פונקציה של השרת) והעוגנים שייגזרו,
// התשובות להחלטות, החלטות שנוספו ידנית, הדיווחים, "מבט כללי" והערת המתנדב. אישור / דחייה עם הערה:
// PATCH submissions/[id] {action, note, lineOps?} — lineOps נשלח רק כשהמנהל הוריד פעולות.

const SUB_STATUS = { submitted: 'ממתינה', approved: 'אושרה', rejected: 'נדחתה' }

export default function SubmissionReviewModal({ id, onClose, onDone }) {
  const { showAlert, showConfirm } = useDialog()
  const [data, setData] = useState(null)
  const [dropped, setDropped] = useState(() => new Set())
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let on = true
    apiCall(`submissions/${encodeURIComponent(id)}`).then((r) => {
      if (!on) return
      if (r.ok && r.data?.submission) setData(r.data)
      else {
        showAlert('שגיאה', r.error || 'טעינת ההגשה נכשלה')
        onClose()
      }
    })
    return () => {
      on = false
    }
  }, [id, showAlert, onClose])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !e.defaultPrevented && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const sub = data?.submission
  const page = data?.page
  const model = page?.model
  const ops = useMemo(() => sub?.lineOps || [], [sub])
  const kept = useMemo(() => keepOps(ops, dropped), [ops, dropped])
  const diff = useMemo(() => (model ? lineChanges(model, kept) : { lines: [], rejected: [], anchors: [] }), [model, kept])
  const pending = sub?.status === 'submitted'

  const itemsById = useMemo(() => new Map((data?.items || []).map((it) => [String(it.id), it])), [data])
  const manualIds = new Set((sub?.manualItems || []).map(String))
  const manual = (data?.items || []).filter((it) => it.manual || manualIds.has(String(it.id)))
  const reports = data?.reports || []

  // מסגרות: שורות שהשתנו (לפי המודל) ואזורי הדיווחים
  const boxes = (side) => {
    const out = []
    if (model) {
      const changed = new Set(diff.lines.map((l) => l.key))
      for (const b of model.blocks || []) {
        for (const l of b.lines || []) {
          const box = changed.has(`${b.id}:${l.i}`) ? arrBox(l[side]) : null
          if (box) out.push({ ...box, key: `l:${b.id}:${l.i}`, tone: 'line', label: `${b.label || b.id} · שורה ${l.i + 1}` })
        }
      }
    }
    reports.forEach((r, ri) =>
      (r.regions || []).forEach((g, gi) => {
        if (g.side === side) out.push({ x: g.x, y: g.y, w: g.w, h: g.h, key: `r:${ri}:${gi}`, tone: 'report', label: REPORT_CATEGORY[r.category] || r.category })
      })
    )
    return out
  }

  const toggleOp = (i) =>
    setDropped((cur) => {
      const next = new Set(cur)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })

  const act = async (action) => {
    if (action === 'reject') {
      const ok = await showConfirm('דחיית ההגשה', 'העמוד ייפתח שוב לבדיקה. להמשיך?')
      if (!ok) return
    }
    setBusy(true)
    const body = { action, note }
    if (action === 'approve' && dropped.size) body.lineOps = kept
    const r = await apiCall(`submissions/${encodeURIComponent(id)}`, { method: 'PATCH', body })
    setBusy(false)
    if (!r.ok) return showAlert('שגיאה', r.error)
    onDone?.(id, r.data?.submission?.status || (action === 'approve' ? 'approved' : 'rejected'))
  }

  const side = (key, label) => {
    const img = page?.[key]
    return (
      <figure className="min-w-0 flex-1">
        <figcaption className="mb-1 text-sm font-bold text-on-surface/70">{label}</figcaption>
        <RegionImage src={img?.url || (page?.id ? pageImageUrl(page.id, key) : '')} alt={`${label} — ${page?.masechet || ''} ${page?.daf || ''}`} boxes={boxes(key)} className="rounded border bg-white" />
      </figure>
    )
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-2" dir="rtl" role="dialog" aria-modal="true" aria-label="סקירת הגשת עמוד">
      <div className="mx-auto flex max-w-[1900px] flex-col gap-3 rounded-2xl bg-background p-3">
        {!data ? (
          <LoadingSpinner message="טוען הגשה..." />
        ) : (
          <>
            <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 bg-background py-1">
              <h3 className="flex items-center gap-2 text-lg font-bold text-on-surface">
                <span aria-hidden="true" className="material-symbols-outlined text-primary">rate_review</span>
                {page?.masechet} {page?.daf}
              </h3>
              <span className="text-sm text-on-surface/70">
                {sub.userName} · סבב {sub.round ?? page?.round ?? 1}
                {sub.createdAt || sub.at ? ` · ${formatDateShortMonthWithYearAndTime(sub.createdAt || sub.at)}` : ''}
              </span>
              <Pill status={sub.status} labels={SUB_STATUS} />
              {sub.reviewedByName && (
                <span className="text-xs text-on-surface/60">
                  נבדק ע״י {sub.reviewedByName}
                  {sub.reviewerEdited ? ' (עם תיקונים)' : ''}
                  {sub.reviewNote ? ` — ${sub.reviewNote}` : ''}
                </span>
              )}
              <span className="flex-1" />
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="הערת בודק" aria-label="הערת בודק" className="w-52 rounded-md border border-surface-variant bg-surface px-2 py-1 text-sm" />
              {pending && (
                <button type="button" disabled={busy} onClick={() => act('approve')} className={btnSuccess}>
                  {dropped.size ? `אישור (בלי ${dropped.size} פעולות)` : 'אישור'}
                </button>
              )}
              {pending && (
                <button type="button" disabled={busy} onClick={() => act('reject')} className={btnDanger}>
                  דחייה
                </button>
              )}
              <button type="button" onClick={onClose} disabled={busy} className={btnGhost}>
                סגירה
              </button>
            </div>

            {sub.note && <p className="rounded bg-warning-alt-100 px-2 py-1 text-sm">הערת המתנדב: {sub.note}</p>}

            <div className="flex flex-col gap-3 lg:flex-row">
              {side('scan', 'הסריקה (וילנא)')}
              {side('ours', 'העמוד שלנו')}
            </div>

            <section aria-label="שבירת שורות" className="rounded-xl border border-surface-variant p-3" data-testid="line-changes">
              <h4 className="mb-2 font-bold">שבירת שורות</h4>
              {!ops.length ? (
                <p className="text-sm text-on-surface/60">אין פעולות שורה בהגשה</p>
              ) : (
                <>
                  <ul className="mb-3 space-y-1 text-sm" aria-label="פעולות המתנדב">
                    {ops.map((op, i) => (
                      <li key={`${i}:${op.block}:${op.line}`} className={dropped.has(i) ? 'text-on-surface/40 line-through' : ''}>
                        <label className="flex items-center gap-2">
                          {pending && <input type="checkbox" checked={!dropped.has(i)} onChange={() => toggleOp(i)} aria-label={`השאר: ${opLabel(op, model)}`} />}
                          {opLabel(op, model)}
                        </label>
                      </li>
                    ))}
                  </ul>
                  <table className="w-full text-sm">
                    <thead className="text-right text-on-surface/60">
                      <tr>
                        <th className="p-1">שורה</th>
                        <th className="p-1">לפני</th>
                        <th className="p-1">אחרי</th>
                        <th className="p-1">הדפוס (OCR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diff.lines.map((l) => (
                        <tr key={l.key} className="border-t border-surface-variant align-top" data-testid="line-row">
                          <td className="whitespace-nowrap p-1 text-xs">
                            {l.blockLabel} · {l.line + 1}
                            {l.action === 'confirm' && <div className="text-success-700">אושרה</div>}
                          </td>
                          <td className="p-1 text-on-surface/70" data-testid="line-before">
                            {l.before}
                          </td>
                          <td className={`p-1 ${l.changed ? 'font-medium text-on-surface' : 'text-on-surface/70'}`} data-testid="line-after">
                            {l.after}
                          </td>
                          <td className="p-1 text-xs text-on-surface/60">{l.print}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {diff.rejected.length > 0 && (
                    <ul className="mt-2 list-disc pr-5 text-xs text-warning-800" data-testid="line-rejected">
                      {diff.rejected.map((r, i) => (
                        <li key={i}>
                          {opLabel(r.op, model)} — {REJECT_REASON[r.reason] || r.reason}
                        </li>
                      ))}
                    </ul>
                  )}
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer">העוגנים שייגזרו ({diff.anchors.length})</summary>
                    <ul className="mt-1 space-y-0.5" data-testid="anchors">
                      {diff.anchors.map((a) => (
                        <li key={`${a.block}:${a.line}`} dir="rtl">
                          {a.block} · שורה {a.line + 1}: {a.action === 'start' ? `מתחילה ב-${a.ref} #${a.wi}` : 'נבדקה ונכונה'}
                        </li>
                      ))}
                    </ul>
                  </details>
                </>
              )}
            </section>

            <div className="grid gap-3 lg:grid-cols-2">
              <section aria-label="תשובות להחלטות" className="rounded-xl border border-surface-variant p-3 text-sm">
                <h4 className="mb-2 font-bold">תשובות להחלטות ({(sub.itemAnswers || []).length})</h4>
                <ul className="space-y-2">
                  {(sub.itemAnswers || []).map((a, i) => {
                    const it = itemsById.get(String(a.item))
                    return (
                      <li key={`${a.item}:${i}`} className="rounded bg-surface-variant/40 p-2" data-testid="item-answer">
                        <div className="text-xs text-on-surface/60">{it ? `${kindLabel(it.kind)} · ${words(it.ctxBefore)} … ${words(it.ctxAfter)}` : a.item}</div>
                        {it && (
                          <div>
                            אוצריא: <b>{words(it.otz) || '(אין)'}</b> · הדפוס לפי ה-OCR: <b>{words(it.print) || '(אין)'}</b>
                          </div>
                        )}
                        <div>
                          תשובה: <b>{VERDICT_LABEL[a.verdict] || a.verdict || a.choice}</b>
                          {a.text ? ` «${a.text}»` : ''}
                        </div>
                      </li>
                    )
                  })}
                </ul>
                {manual.length > 0 && (
                  <>
                    <h4 className="mb-1 mt-3 font-bold">נוסח שהמתנדב תיקן בעמוד ({manual.length})</h4>
                    <ul className="space-y-1">
                      {manual.map((it) => (
                        <li key={it.id} data-testid="manual-item">
                          {kindLabel(it.kind)}: אצלנו <b>{words(it.otz)}</b> → בדפוס <b>{words(it.print) || it.text}</b>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </section>

              <section aria-label="דיווחים ומבט כללי" className="rounded-xl border border-surface-variant p-3 text-sm">
                <h4 className="mb-2 font-bold">מבט כללי</h4>
                <ul className="mb-3 flex flex-wrap gap-2">
                  {Object.entries(sub.checks || {}).map(([k, v]) => (
                    <li key={k} className={`rounded px-2 py-0.5 text-xs ${v === 'issue' ? 'bg-warning-100 text-warning-800' : 'bg-success-50 text-success-800'}`}>
                      {CHECK_LABEL[k] || k}: {CHECK_VALUE[v] || v}
                    </li>
                  ))}
                </ul>
                <h4 className="mb-1 font-bold">דיווחים ({reports.length})</h4>
                <ul className="space-y-1">
                  {reports.map((r, i) => (
                    <li key={r.id || i} data-testid="sub-report">
                      <b>{REPORT_CATEGORY[r.category] || r.category}</b>: {r.text}{' '}
                      {r.status && <Pill status={r.status} labels={REPORT_STATUS} />}
                      {(r.regions || []).length > 0 && <span className="text-xs text-on-surface/60"> · {r.regions.length} אזורים מסומנים בתמונות</span>}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
