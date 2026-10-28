'use client'

import { useState } from 'react'
import { formatDateShortMonthWithYearAndTime } from '@/lib/formatDate'
import { apiCall } from './adminApi'
import { Pill, btnGhost, btnPrimary } from './AdminBits'
import { ITEM_STATUS, QUESTION_LABEL, VERDICT_LABEL, VIA_LABEL, hintBadges, kindLabel, resolveVerdicts, words } from './adminLabels'

// החלטת נוסח אחת למנהל (AdminItem): החיתוך מהסריקה, ההקשר, שתי הקריאות **מסומנות** (המנהל אינו
// "עיוור": "אוצריא" מול "הדפוס לפי ה-OCR"), התשובות של המתנדבים, רמזי העדים, וההכרעה:
// PATCH items/[id] {action:'resolve', verdict, text?} | reopen | unflag | obsolete → {item}.

const RESOLVE_TEXT = {
  print: 'כמו הדפוס (print)',
  otz: 'כמו אוצריא (otz)',
  elsewhere: 'בעמוד/בשורה אחרים (elsewhere)',
}

export default function ItemCard({ item, onChange }) {
  const [other, setOther] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const act = async (body) => {
    setBusy(true)
    setError(null)
    const r = await apiCall(`items/${encodeURIComponent(item.id)}`, { method: 'PATCH', body })
    setBusy(false)
    if (!r.ok) return setError(r.error)
    onChange?.(r.data?.item || { ...item })
    if (body.verdict === 'other') setOther('')
  }

  const verdicts = resolveVerdicts(item)
  const hints = hintBadges(item.hints)
  const closed = item.status === 'resolved' || item.status === 'obsolete'
  const title = `${item.masechet || item.slug} ${item.daf || ''}`

  return (
    <article className="rounded-xl border border-surface-variant bg-surface p-3" data-testid="admin-item" aria-label={`החלטה ${title}`}>
      <header className="mb-2 flex flex-wrap items-center gap-2 text-sm">
        <b>{title}</b>
        <span className="text-on-surface/70">{kindLabel(item.kind)}</span>
        <span className="text-on-surface/70">· {QUESTION_LABEL[item.question] || item.question}</span>
        {item.manual && <span className="rounded bg-info-50 px-1.5 text-xs text-info-800">נוסף בבדיקת עמוד</span>}
        <span className="flex-1" />
        {hints.map((h) => (
          <span key={h.key} className="rounded bg-surface-variant/70 px-1.5 py-0.5 text-[11px] text-on-surface/80" data-testid="item-hint">
            {h.text}
          </span>
        ))}
        <Pill status={item.status} labels={ITEM_STATUS} />
      </header>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="rounded-lg border bg-white p-2">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={`חיתוך מהסריקה — ${title}`} loading="lazy" className="mx-auto max-h-56 w-auto" />
          ) : (
            <p className="py-6 text-center text-xs text-on-surface/60">אין מיקום בסריקה</p>
          )}
        </div>
        <div className="space-y-2 text-sm">
          <p className="leading-relaxed" dir="rtl">
            <span className="text-on-surface/60">{words(item.ctxBefore)} </span>
            <mark className="rounded bg-warning-100 px-1">{words(item.otz) || '∅'}</mark>
            <span className="text-on-surface/60"> {words(item.ctxAfter)}</span>
          </p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
            <dt className="font-bold text-on-surface/70">אוצריא:</dt>
            <dd data-testid="item-otz">{words(item.otz) || <i className="text-on-surface/50">(אין)</i>}</dd>
            <dt className="font-bold text-on-surface/70">הדפוס לפי ה-OCR:</dt>
            <dd data-testid="item-print">{words(item.print) || <i className="text-on-surface/50">(אין)</i>}</dd>
          </dl>
          {(item.answers || []).length > 0 && (
            <ul className="space-y-0.5 text-xs" aria-label="תשובות">
              {item.answers.map((a, i) => (
                <li key={`${a.user || a.who || i}:${i}`}>
                  <b>{a.name || a.who || 'מתנדב'}</b>: {VERDICT_LABEL[a.verdict] || a.verdict}
                  {a.text ? ` «${a.text}»` : ''}
                  <span className="text-on-surface/50">
                    {' '}
                    · {VIA_LABEL[a.via] || a.via || ''}
                    {a.at ? ` · ${formatDateShortMonthWithYearAndTime(a.at)}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {item.resolved?.verdict && (
            <p className="text-xs text-success-800" data-testid="item-resolved">
              הוכרע: {VERDICT_LABEL[item.resolved.verdict] || item.resolved.verdict}
              {item.resolved.text ? ` «${item.resolved.text}»` : ''}
              {item.resolved.byName ? ` — ${item.resolved.byName}` : ''}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {verdicts
          .filter((v) => v !== 'other')
          .map((v) => (
            <button key={v} type="button" disabled={busy} onClick={() => act({ action: 'resolve', verdict: v })} className={btnPrimary}>
              {RESOLVE_TEXT[v]}
            </button>
          ))}
        <form
          className="flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault()
            if (other.trim()) act({ action: 'resolve', verdict: 'other', text: other.trim() })
          }}
        >
          <input
            value={other}
            onChange={(e) => setOther(e.target.value)}
            maxLength={500}
            placeholder="מה נדפס"
            aria-label="טקסט אחר"
            className="w-40 rounded border border-surface-variant bg-surface px-2 py-1 text-sm"
          />
          <button type="submit" disabled={busy || !other.trim()} className={btnGhost}>
            טקסט אחר
          </button>
        </form>
        <span className="flex-1" />
        {item.status !== 'open' && (
          <button type="button" disabled={busy} onClick={() => act({ action: 'reopen' })} className={btnGhost}>
            <span aria-hidden="true" className="material-symbols-outlined text-base">undo</span>
            החזר לתור
          </button>
        )}
        {item.status === 'flagged' && (
          <button type="button" disabled={busy} onClick={() => act({ action: 'unflag' })} className={btnGhost}>
            בטל סימון
          </button>
        )}
        {!closed && (
          <button type="button" disabled={busy} onClick={() => act({ action: 'obsolete' })} className={btnGhost}>
            לא רלוונטי
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger-700">
          {error}
        </p>
      )}
    </article>
  )
}
