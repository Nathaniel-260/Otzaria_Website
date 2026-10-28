'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useDialog } from '@/components/providers/DialogContext'
import GuideBody from '@/components/pageProof/guide/GuideBody'
import { API as ADMIN_API } from './adminApi'

// "הנחיות": עריכת דף ההנחיות של צורת הדף (/docs/tzurat-hadaf) — העתק של GuideEditorCard של הגהת עמודים
// עם ה-API של המודול (api/admin/tzurat-hadaf/guide: GET {saved, default, codes} / PUT {html, preview?} /
// DELETE). התגובות בלי `success` — ההצלחה לפי res.ok. התצוגה המקדימה — GuideBody של הגהת עמודים
// (HTML שכבר נוקה בשרת).

export const GUIDE_API = `${ADMIN_API}/guide`
export const GUIDE_PATH = '/docs/tzurat-hadaf'
const btn = 'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40'

const failMsg = (e, fallback = 'הפעולה נכשלה — בדקו את החיבור ונסו שוב') =>
  e?.name === 'TypeError' || e?.name === 'SyntaxError' || !e?.message ? fallback : e.message

async function request(method, body) {
  const res = await fetch(GUIDE_API, {
    method,
    cache: 'no-store',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const d = await res.json().catch(() => null)
  if (!res.ok || !d || d.success === false) throw new Error(d?.error || 'הפעולה נכשלה')
  return d
}

export default function GuideEditorCard() {
  const { showAlert, showConfirm } = useDialog()
  const [data, setData] = useState(null) // {saved, default, codes}
  const [text, setText] = useState('')
  const [preview, setPreview] = useState(null) // {html, toc, unknown}
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const area = useRef(null)
  const [tick, setTick] = useState(0)
  const load = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let on = true
    request('GET')
      .then((d) => {
        if (!on) return
        setData(d)
        setText(d.saved?.html || d.default || '')
        setPreview(null)
        setError(null)
      })
      .catch((e) => on && setError(failMsg(e, 'הטעינה נכשלה — בדקו את החיבור ונסו שוב')))
    return () => {
      on = false
    }
  }, [tick])

  const call = async (method, body) => {
    setBusy(true)
    try {
      return await request(method, body)
    } catch (e) {
      showAlert('שגיאה', failMsg(e))
      return null
    } finally {
      setBusy(false)
    }
  }

  const doPreview = async () => {
    const d = await call('PUT', { html: text, preview: true })
    if (d) setPreview(d.preview || null)
  }

  const save = async () => {
    const d = await call('PUT', { html: text })
    if (!d) return
    load()
    showAlert('נשמר', `דף ההנחיות עודכן.${d.unknown?.length ? `\nקודים שלא הוכרו (נשארו כמו שהם): ${d.unknown.join(' · ')}` : ''}`)
  }

  const reset = () =>
    showConfirm(
      'חזרה לנוסח המקורי',
      'הנוסח השמור יימחק, והדף יציג את הנוסח המקורי (מהקוד).',
      async () => {
        if (await call('DELETE')) load()
      },
      'חזור לנוסח המקורי',
      'ביטול'
    )

  const insert = (code) => {
    const el = area.current
    const at = el ? el.selectionStart : text.length
    const end = el ? el.selectionEnd : text.length
    setText(text.slice(0, at) + code + text.slice(end))
    requestAnimationFrame(() => {
      if (!el) return
      el.focus()
      el.selectionStart = el.selectionEnd = at + code.length
    })
  }

  const codes = data?.codes || {}
  const figureCodes = codes.figures || []
  const otherCodes = [...(codes.buttons || []), ...(codes.values || [])]
  const dirty = data && text !== (data.saved?.html || data.default || '')
  const savedInfo = data?.saved
    ? `מוצג הנוסח שנשמר${data.saved.byName ? ` בידי ${data.saved.byName}` : ''}${data.saved.at ? ` (${new Date(data.saved.at).toLocaleString('he-IL')})` : ''}`
    : 'מוצג הנוסח המקורי (לא נשמר נוסח אחר)'

  return (
    <section className="glass-strong rounded-xl p-4" data-testid="guide-editor">
      <h3 className="mb-2 flex items-center gap-2 font-bold text-on-surface">
        <span aria-hidden="true" className="material-symbols-outlined text-primary">menu_book</span>
        דף ההנחיות למתנדבים
      </h3>
      {error && !data ? (
        <p role="alert" className="mt-3 text-danger-700">
          {error}
        </p>
      ) : !data ? (
        <p className="mt-3 text-sm text-on-surface/60">טוען…</p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <p className="text-sm text-on-surface/70">
            {savedInfo} ·{' '}
            <a href={GUIDE_PATH} target="_blank" rel="noopener" className="font-bold text-primary hover:underline">
              פתח את הדף
            </a>
          </p>
          <p className="text-xs text-on-surface/60">
            HTML פשוט: פרק = &lt;section id=&quot;…&quot;&gt; עם כותרת &lt;h2&gt;; פסקה &lt;p&gt; (class=&quot;note&quot; — מסגרת הדגשה,
            &quot;muted&quot; — משני); רשימות &lt;ol&gt;/&lt;ul&gt;; &lt;b&gt;, &lt;kbd&gt;, קישור &lt;a href&gt;. כל השאר יורד בשמירה.
          </p>
          <textarea
            ref={area}
            dir="rtl"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={24}
            spellCheck={false}
            aria-label="תוכן דף ההנחיות (HTML)"
            className="w-full rounded-lg border border-surface-variant bg-surface p-3 font-mono text-sm leading-relaxed"
          />
          {(figureCodes.length > 0 || otherCodes.length > 0) && (
            <div className="flex flex-wrap items-center gap-2 text-xs" aria-label="קודים">
              <span className="font-bold text-on-surface/70">הוספה במקום הסמן:</span>
              {figureCodes.map((c) => (
                <button key={c} type="button" onClick={() => insert(c)} className="rounded-full border border-surface-variant px-2 py-0.5 hover:bg-surface-variant">
                  {c}
                </button>
              ))}
              {otherCodes.map((c) => (
                <button key={c.code} type="button" onClick={() => insert(c.code)} title={c.text} className="rounded-full border border-surface-variant px-2 py-0.5 hover:bg-surface-variant">
                  {c.code}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={doPreview} className={`${btn} border border-surface-variant bg-white hover:bg-surface-variant/60`}>
              תצוגה מקדימה
            </button>
            <button type="button" disabled={busy || !dirty} onClick={save} className={`${btn} bg-primary text-on-primary hover:bg-accent`}>
              שמור ועדכן את הדף
            </button>
            <button type="button" disabled={busy || !dirty} onClick={load} className={`${btn} hover:bg-surface-variant`}>
              בטל שינויים
            </button>
            <span className="flex-1" />
            <button type="button" disabled={busy || !data.saved} onClick={reset} className={`${btn} text-danger-700 hover:bg-danger-100`}>
              חזרה לנוסח המקורי
            </button>
          </div>
          {preview && (
            <section aria-label="תצוגה מקדימה" className="rounded-xl border-2 border-dashed border-primary/40 bg-background p-4">
              {(preview.unknown || []).length > 0 && (
                <p role="alert" className="mb-3 text-sm text-warning-800">
                  קודים שלא הוכרו (יוצגו כמו שהם): {preview.unknown.join(' · ')}
                </p>
              )}
              <GuideBody html={preview.html} />
            </section>
          )}
        </div>
      )}
    </section>
  )
}
