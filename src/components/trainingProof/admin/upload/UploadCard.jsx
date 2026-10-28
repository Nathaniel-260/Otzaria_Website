'use client'

import { useEffect, useRef, useState } from 'react'
import { SECTION_LABELS, SCRIPT_LABELS, MAX_FILE_BYTES } from '@/lib/trainingProof/vocab'
import { sendForm, sendJson, fmt } from '../api'
import { BTN, Card, SECTION_ICONS } from '../bits'

// כרטיס העלאה לחלק אחד: גרירת קובץ ZIP (או בחירה). אין בחירת מסלול (ה-12) — כל פריט
// בקובץ נושא את הספר והמסלול שלו. הבדיקה בשרת (zipCheck) קודם; קובץ של חלק אחר ←
// הודעה ברורה. אחר-כך הקליטה במנות קטנות (כל מנה בקשה משלה), כדי שהשער של האתר לא
// יחזיר 504 באמצע; אפשר לעצור, ומה שנקלט נשאר.

const HINTS = {
  ocr: 'שורות עם תמונה וטקסט-המודל, מכל הכתבים. השורות יוצגו למתנדבים מעורבבות.',
  router: 'שורות עם הצעת הנתב לשורה ולכל מילה.',
  frames: 'עמודים שלמים עם הצעת המודל למסגרות, מקובצים לפי ספר.',
}

// "מה נקרא מהקובץ" בשורה אחת
export function readText(section, read) {
  if (!read) return ''
  if (section === 'frames' && read.books) return `${fmt(read.books.length)} ספרים · ${fmt(read.items)} עמ' (${read.books.map((b) => `${b.alias}: ${b.pages}`).join(' · ')})`
  const parts = Object.entries(read.byTrack || read.by_track || {}).map(([k, v]) => `${SCRIPT_LABELS[k] || (k === 'none' ? 'בלי הצעה' : k)} ${fmt(v)}`)
  const lead = section === 'router' ? 'הצעת הנתב: ' : ''
  return `${fmt(read.items)} ${section === 'frames' ? "עמ'" : 'שורות'}${parts.length ? ` · ${lead}${parts.join(' · ')}` : ''}`
}

export default function UploadCard({ section, onDone }) {
  const input = useRef(null)
  const stop = useRef(false)
  const alive = useRef(true)
  const [hot, setHot] = useState(false)
  const [state, setState] = useState(null) // {phase, name, staged, progress, error, errors, wrong, result}

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      stop.current = true
    }
  }, [])

  const busy = state?.phase === 'check' || state?.phase === 'ingest'

  const take = async (file) => {
    if (!file || busy) return
    stop.current = false
    if (!/\.zip$/i.test(file.name)) return setState({ phase: 'error', name: file.name, error: 'יש להעלות קובץ ZIP מתחנת-האימון' })
    if (file.size > MAX_FILE_BYTES) return setState({ phase: 'error', name: file.name, error: `הקובץ גדול מ-${Math.round(MAX_FILE_BYTES / 1024 / 1024)}MB — התחנה מפצלת לכמה קבצים` })
    setState({ phase: 'check', name: file.name })
    const fd = new FormData()
    fd.append('section', section)
    fd.append('file', file)
    let staged
    try {
      staged = await sendForm('/upload', fd)
    } catch (e) {
      return setState({ phase: 'error', name: file.name, error: e.message, errors: e.data?.errors, wrong: e.data?.wrongSection })
    }
    let progress = { done: 0, total: staged.total, inserted: 0, skipped: 0 }
    setState({ phase: 'ingest', name: file.name, staged, progress })
    let tries = 0
    while (!stop.current) {
      try {
        const r = await sendJson(`/upload/${staged.token}`, undefined)
        tries = 0
        progress = r
        if (alive.current) setState((s) => ({ ...s, progress: r }))
        if (r.finished) break
      } catch (e) {
        // שער שלא חיכה / תקלה רגעית — מנסים שוב את אותה מנה (היא ממשיכה מאותה נקודה)
        if (e.status === 409 || ++tries > 4) {
          if (alive.current) setState((s) => ({ ...s, phase: 'error', error: e.message }))
          return onDone?.()
        }
        await new Promise((r) => setTimeout(r, 3000))
      }
    }
    if (stop.current && !progress.finished) {
      await sendJson(`/upload/${staged.token}`, undefined, 'DELETE').catch(() => {})
      if (alive.current) setState((s) => ({ ...s, phase: 'stopped' }))
    } else if (alive.current) setState((s) => ({ ...s, phase: 'done' }))
    onDone?.()
  }

  const st = state
  const pct = st?.progress?.total ? Math.round((100 * st.progress.done) / st.progress.total) : 0
  return (
    <Card title={SECTION_LABELS[section]} icon={SECTION_ICONS[section]} className="min-w-0 flex-1 basis-72">
      <p className="text-sm text-on-surface/60">{HINTS[section]}</p>
      <label
        data-drop={section}
        onDragOver={(e) => {
          e.preventDefault()
          setHot(true)
        }}
        onDragLeave={() => setHot(false)}
        onDrop={(e) => {
          e.preventDefault()
          setHot(false)
          take(e.dataTransfer.files?.[0])
        }}
        className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed p-5 text-center text-sm transition-colors ${hot ? 'border-primary bg-info-100/50' : 'border-surface-variant hover:bg-surface-variant/40'} ${busy ? 'pointer-events-none opacity-60' : ''}`}
      >
        <span className="material-symbols-outlined text-4xl text-on-surface/50">upload_file</span>
        <span>
          <b>גררו לכאן קובץ ZIP</b> או לחצו לבחירה
        </span>
        <span className="text-xs text-on-surface/50">מתחנת-האימון: "ייצוא לאתר — הגהה לאימון"</span>
        <input
          ref={input}
          type="file"
          accept=".zip,application/zip"
          hidden
          aria-label={`קובץ ZIP ל${SECTION_LABELS[section]}`}
          onChange={(e) => {
            take(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </label>

      {st && (
        <div className="flex flex-col gap-1.5 text-sm" role="status" aria-live="polite">
          <div className="truncate text-xs text-on-surface/60" dir="ltr">
            {st.name}
          </div>
          {st.phase === 'check' && <div>בודק את הקובץ…</div>}
          {st.staged && (
            <div>
              <b>נקרא מהקובץ:</b> {readText(section, st.staged.read)}
              {st.staged.manifest.label && <div className="text-xs text-on-surface/60">"{st.staged.manifest.label}" · חלק {st.staged.manifest.part} מתוך {st.staged.manifest.parts}</div>}
              {st.staged.existing > 0 && (
                <div className="text-xs text-warning-alt-800">
                  החבילה הזו כבר הועלתה: {fmt(st.staged.existing)} פריטים כבר באתר{st.staged.proofed ? ` (${fmt(st.staged.proofed)} כבר הוגו)` : ''} — הם לא ישוכפלו ולא יידרסו.
                </div>
              )}
              {st.staged.warnings?.map((w) => (
                <div key={w} className="text-xs text-warning-alt-800">
                  {w}
                </div>
              ))}
            </div>
          )}
          {st.progress && (
            <div className="flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-variant">
                <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="tabular-nums text-xs">
                {fmt(st.progress.done)} / {fmt(st.progress.total)}
              </span>
            </div>
          )}
          {st.phase === 'ingest' && (
            <button className={`${BTN.quiet} self-start`} onClick={() => (stop.current = true)}>
              עצור (מה שנקלט נשאר)
            </button>
          )}
          {st.phase === 'done' && (
            <div className="font-semibold text-success-800">
              נקלט: {fmt(st.progress.inserted)} חדשים{st.progress.skipped ? `, ${fmt(st.progress.skipped)} כבר היו באתר` : ''}.
            </div>
          )}
          {st.phase === 'stopped' && <div className="text-warning-alt-800">נעצר. מה שנקלט נשאר; החבילה מושהית עד שתעלו את הקובץ שוב.</div>}
          {st.phase === 'error' && (
            <div className="rounded-md bg-danger-100 p-2 text-danger-700">
              {st.wrong ? (
                <>
                  <b>הקובץ הזה שייך ל"{SECTION_LABELS[st.wrong]}", לא ל"{SECTION_LABELS[section]}".</b> העלו אותו בכרטיס של {SECTION_LABELS[st.wrong]}.
                </>
              ) : (
                <b>{st.error}</b>
              )}
              {st.errors?.length > 1 && (
                <ul className="mt-1 list-disc ps-5 text-xs">
                  {st.errors.slice(1, 10).map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
