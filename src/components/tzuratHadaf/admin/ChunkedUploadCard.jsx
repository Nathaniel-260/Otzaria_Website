'use client'

import { useEffect, useRef, useState } from 'react'
import { apiCall } from './adminApi'
import { Bar, Card, btnGhost, btnPrimary } from './AdminBits'
import UploadJobInfo from './UploadJobInfo'
import { pollUpload, uploadFile } from './chunkedUpload'
import { POLL_MS, findResume, formatBytes, isTerminal, percent, resumeKey } from './uploadPlan'

// העלאת חבילות של צורת הדף (ZIP למסכת, עד ~2GB לקובץ): כל קובץ נשלח בחלקים (PUT לכל חלק, עם 3
// ניסיונות), אחר כך "סיום" — והשרת מעבד ברקע; הכרטיס בודק כל 5 שניות ומציג עמודים/החלטות/תמונות,
// ובסוף הסיכום והשגיאות. העלאה שנקטעה (רשת, רענון הדף, "עצירה") — בבחירה חוזרת של אותו קובץ מוצע
// "המשך העלאה", ונשלחים רק החלקים שחסרים בשרת. עיבוד שנכשל — "נסה שוב" (בלי להעלות שוב).
// sleep / pollEvery — רק לבדיקות.

const LABEL = 'קובצי ZIP של צורת הדף'

export default function ChunkedUploadCard({ onChanged, sleep, pollEvery = POLL_MS }) {
  const fileRef = useRef(null)
  const alive = useRef(true)
  const stop = useRef(false)
  // [{key, file, resumeId, resume, phase, sent, total, uploadId, upload, error}]
  // phase: ready | uploading | stopped | error | processing | done | failed
  const [entries, setEntries] = useState([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const patch = (key, p) => setEntries((cur) => cur.map((e) => (e.key === key ? { ...e, ...(typeof p === 'function' ? p(e) : p) } : e)))

  const onPick = () => {
    const files = [...(fileRef.current?.files || [])]
    setEntries(
      files.map((file) => {
        const resumeId = findResume(file)
        return { key: resumeKey(file), file, resumeId, resume: !!resumeId, phase: 'ready', sent: 0, total: file.size, uploadId: null, upload: null, error: null }
      })
    )
  }

  // מעקב אחרי העיבוד ברקע (לא חוסם את הקובץ הבא)
  const follow = (key, id) => {
    pollUpload(id, {
      alive: () => alive.current,
      every: pollEvery,
      sleep,
      onUpdate: (u) => {
        if (!alive.current) return
        patch(key, { upload: u, phase: isTerminal(u.status) ? u.status : 'processing' })
        if (isTerminal(u.status)) onChanged?.()
      },
    })
  }

  const runOne = async (entry, resumeId) => {
    patch(entry.key, { phase: 'uploading', error: null })
    const r = await uploadFile(entry.file, {
      resumeId: resumeId || null,
      sleep,
      shouldStop: () => stop.current || !alive.current,
      onProgress: ({ id, sent, total }) => alive.current && patch(entry.key, { uploadId: id, sent, total }),
    })
    if (!alive.current) return r
    if (!r.ok) {
      patch(entry.key, { phase: r.stopped ? 'stopped' : 'error', error: r.error, uploadId: r.id || null })
      return r
    }
    const id = r.upload?.id
    patch(entry.key, (e) => ({ phase: isTerminal(r.upload?.status) ? r.upload.status : 'processing', upload: r.upload, uploadId: id, sent: e.total }))
    onChanged?.()
    if (id && !isTerminal(r.upload?.status)) follow(entry.key, id)
    return r
  }

  const runAll = async () => {
    stop.current = false
    setBusy(true)
    try {
      for (const e of entries) {
        if (!alive.current || stop.current) break
        if (e.phase !== 'ready') continue
        await runOne(e, e.resume ? e.resumeId : null)
      }
    } finally {
      if (alive.current) setBusy(false)
    }
  }

  const resumeEntry = async (e) => {
    stop.current = false
    setBusy(true)
    try {
      await runOne(e, e.uploadId || e.resumeId)
    } finally {
      if (alive.current) setBusy(false)
    }
  }

  const retry = async (e) => {
    const id = e.upload?.id || e.uploadId
    if (!id) return
    const r = await apiCall(`uploads/${encodeURIComponent(id)}/retry`, { method: 'POST', body: {} })
    if (!r.ok) {
      patch(e.key, { error: r.error })
      return
    }
    patch(e.key, (cur) => ({ phase: 'processing', error: null, upload: r.data?.upload || { ...cur.upload, status: 'queued', errors: [] } }))
    follow(e.key, id)
  }

  const totalBytes = entries.reduce((s, e) => s + (e.total || 0), 0)
  const sentBytes = entries.reduce((s, e) => s + (e.sent || 0), 0)
  const ready = entries.some((e) => e.phase === 'ready')

  return (
    <Card icon="cloud_upload" title="העלאת חבילות" testId="upload-card">
      <p className="mb-3 text-sm text-on-surface/60">
        ZIP אחד למסכת, כפי שמפיקה צורת הדף (manifest.json, pages.jsonl, items.jsonl, images/). אפשר כמה קבצים יחד, עד כ-2GB לקובץ. הקובץ נשלח בחלקים;
        אם החיבור נקטע או שהדף נסגר — בחרו שוב את אותו קובץ ו&quot;המשך העלאה&quot; ישלח רק את מה שחסר. ייבוא חוזר של אותה מסכת מעדכן אותה ואינו דורס
        החלטות שכבר נענו.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <input ref={fileRef} type="file" accept=".zip" multiple disabled={busy} onChange={onPick} className="text-sm" aria-label={LABEL} />
        <button type="button" onClick={runAll} disabled={busy || !ready} className={btnPrimary}>
          <span aria-hidden="true" className="material-symbols-outlined text-base">
            {busy ? 'hourglass_top' : 'cloud_upload'}
          </span>
          {busy ? 'מעלה…' : 'העלאה'}
        </button>
        {busy && (
          <button type="button" onClick={() => (stop.current = true)} className={btnGhost}>
            <span aria-hidden="true" className="material-symbols-outlined text-base">pause_circle</span>
            עצירה
          </button>
        )}
      </div>

      {entries.length > 0 && (
        <div className="mt-4 space-y-3">
          {entries.length > 1 && (
            <div className="text-sm" data-testid="upload-overall">
              <div className="mb-1 flex justify-between text-on-surface/70">
                <span>סך הכול</span>
                <span className="tabular-nums" dir="ltr">
                  {formatBytes(sentBytes)} / {formatBytes(totalBytes)}
                </span>
              </div>
              <Bar value={percent(sentBytes, totalBytes)} label="התקדמות כוללת" />
            </div>
          )}
          {entries.map((e) => (
            <div key={e.key} className="rounded-lg border border-surface-variant p-2 text-sm" data-testid="upload-entry">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <b className="break-all">{e.file.name}</b>
                <span className="tabular-nums text-on-surface/60" dir="ltr">
                  {formatBytes(e.sent)} / {formatBytes(e.total)}
                </span>
                <span className="flex-1" />
                {e.phase === 'ready' && e.resumeId && (
                  <label className="flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={e.resume} onChange={(ev) => patch(e.key, { resume: ev.target.checked })} disabled={busy} />
                    המשך העלאה (נמצאה העלאה קודמת של הקובץ)
                  </label>
                )}
                {(e.phase === 'stopped' || e.phase === 'error') && e.uploadId && (
                  <button type="button" onClick={() => resumeEntry(e)} disabled={busy} className={btnGhost}>
                    המשך העלאה
                  </button>
                )}
                {e.phase === 'failed' && (
                  <button type="button" onClick={() => retry(e)} disabled={busy} className={btnGhost}>
                    <span aria-hidden="true" className="material-symbols-outlined text-base">restart_alt</span>
                    נסה שוב
                  </button>
                )}
              </div>
              <Bar value={percent(e.sent, e.total)} label={`התקדמות ${e.file.name}`} />
              {e.phase === 'uploading' && <p className="mt-1 text-xs text-on-surface/60">שולח… ({percent(e.sent, e.total)}%)</p>}
              {e.phase === 'stopped' && <p className="mt-1 text-xs text-warning-800">ההעלאה נעצרה — אפשר להמשיך מאותה נקודה.</p>}
              {e.error && (
                <p role="alert" className="mt-1 text-xs text-danger-700">
                  {e.error}
                </p>
              )}
              <UploadJobInfo upload={e.upload} />
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
