'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import AppIcon from '@/components/ui/AppIcon'
import { FRAME_ROLES } from '@/lib/trainingProof/vocab'
import { ROLE_COLORS, ROLE_LABELS, KEY_OF_ROLE, STREAM_ROLES, OBJECT_LABELS, OBJECT_ORDER } from './look'
import { NO_STREAM_ROLES } from './geometry'

// לוח-הצד של עורך-המסגרות: התפקיד (1–9), סוג-האובייקט, הזרם (Alt+מספר) וזרם חדש, "ממשיך" (C) ומחיקה.
// כל לחיצה נשמרת מיד (דרך onPatch/onDelete של FramesEditor). readOnly — רק מציג.

function RoleButton({ role, on, disabled, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={on}
      onClick={onClick}
      style={{ '--c': ROLE_COLORS[role] }}
      className={`flex items-center justify-between gap-1 rounded-control border-[1.5px] border-(--c) px-2 py-1 text-label-md font-bold transition-colors disabled:opacity-60 ${
        on ? 'bg-(--c) text-on-primary' : 'bg-transparent text-(--c) hover:bg-surface-container'
      }`}
    >
      <span className="truncate">{ROLE_LABELS[role]}</span>
      <kbd className="text-label-sm opacity-80">{KEY_OF_ROLE[role]}</kbd>
    </button>
  )
}

function NewStreamForm({ onAdd, onDone }) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('commentary')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return setErr('צריך שם לזרם')
    setBusy(true)
    setErr('')
    try {
      await onAdd(name.trim(), role)
      onDone()
    } catch (x) {
      setErr(x?.message || 'לא נשמר')
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-control bg-surface-container-low p-2">
      <label className="flex flex-col gap-1 text-label-md">
        שם הזרם
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder='למשל: הגהות, פירוש ב'
          className="rounded-control border border-outline bg-surface px-2 py-1 text-body-md text-on-surface"
        />
      </label>
      <label className="flex flex-col gap-1 text-label-md">
        התפקיד שלו
        <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-control border border-outline bg-surface px-2 py-1 text-body-md">
          {STREAM_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      </label>
      {err && <p className="text-label-md text-error">{err}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="filled" loading={busy}>
          הוסף
        </Button>
        <Button type="button" size="sm" variant="text" onClick={onDone}>
          ביטול
        </Button>
      </div>
    </form>
  )
}

export default function FramePanel({ frame, frames, streams, readOnly, onPatch, onSetRole, onDelete, onAddStream }) {
  const [adding, setAdding] = useState(false)
  if (!frame) {
    const auto = frames.filter((f) => f.src === 'auto').length
    return (
      <div className="flex flex-col gap-2">
        <h3 className="text-title-sm font-bold">המסגרת</h3>
        <p className="text-body-sm text-on-surface-variant">
          {readOnly ? 'בחרו מסגרת בעמוד כדי לראות את התפקיד והזרם שלה.' : 'בחרו מסגרת בעמוד כדי לקבוע לה תפקיד וזרם.'}
        </p>
        <p className="text-body-sm text-on-surface-variant">
          {frames.length} מסגרות בעמוד{auto ? ` · ${auto} מהן הצעת המודל (מקווקוות)` : ''}.
        </p>
      </div>
    )
  }
  const noStream = NO_STREAM_ROLES.includes(frame.role)
  return (
    <div className="flex flex-col gap-3" data-testid="frame-panel">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-title-sm font-bold">תפקיד המסגרת</h3>
        {frame.src === 'auto' && <span className="text-label-sm text-on-surface-variant">הצעת המודל</span>}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {FRAME_ROLES.map((r) => (
          <RoleButton key={r} role={r} on={frame.role === r} disabled={readOnly} onClick={() => onSetRole(r)} />
        ))}
      </div>

      {frame.role === 'object' && (
        <label className="flex flex-col gap-1 text-label-md">
          סוג האובייקט
          <select
            disabled={readOnly}
            value={frame.obj || 'other'}
            onChange={(e) => onSetRole('object', { obj: e.target.value })}
            className="rounded-control border border-outline bg-surface px-2 py-1 text-body-md"
          >
            {OBJECT_ORDER.map((k) => (
              <option key={k} value={k}>
                {OBJECT_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
      )}

      {!noStream && (
        <>
          <h3 className="text-title-sm font-bold">הזרם (לאיזה טקסט שייכת)</h3>
          <div className="grid grid-cols-2 gap-1.5">
            {streams.map((s, i) => (
              <button
                key={s.id}
                type="button"
                disabled={readOnly}
                aria-pressed={frame.stream === s.id}
                onClick={() => onPatch({ stream: s.id })}
                className={`flex items-center justify-between gap-1 rounded-control border-[1.5px] border-primary px-2 py-1 text-label-md font-bold disabled:opacity-60 ${
                  frame.stream === s.id ? 'bg-primary text-on-primary' : 'text-primary hover:bg-surface-container'
                }`}
              >
                <span className="truncate">{s.name}</span>
                {i < 9 && <kbd className="text-label-sm opacity-80">Alt+{i + 1}</kbd>}
              </button>
            ))}
            <button
              type="button"
              disabled={readOnly}
              aria-pressed={!frame.stream}
              onClick={() => onPatch({ stream: null })}
              className={`rounded-control border-[1.5px] border-outline px-2 py-1 text-label-md font-bold disabled:opacity-60 ${
                !frame.stream ? 'bg-outline text-on-primary' : 'text-on-surface-variant hover:bg-surface-container'
              }`}
            >
              בלי זרם
            </button>
          </div>
          {!readOnly && onAddStream && !adding && (
            <Button size="sm" variant="text" icon="add" className="self-start" onClick={() => setAdding(true)}>
              זרם חדש לספר
            </Button>
          )}
          {adding && (
            <NewStreamForm
              onAdd={async (name, role) => {
                const s = await onAddStream(name, role)
                if (s?.id) onPatch({ stream: s.id })
              }}
              onDone={() => setAdding(false)}
            />
          )}
          <label className="flex items-center gap-2 text-body-sm">
            <input type="checkbox" disabled={readOnly} checked={!!frame.cont} onChange={(e) => onPatch({ cont: e.target.checked })} />
            ממשיך בעמוד הבא <kbd className="rounded border border-outline-variant px-1 text-label-sm">C</kbd>
          </label>
        </>
      )}

      <p className="text-label-md text-on-surface-variant">
        מקום בסדר הקריאה: <b className="text-on-surface">{frame.ord ?? 'אין עדיין'}</b>
      </p>

      {!readOnly && (
        <Button size="sm" variant="danger" icon="delete" className="self-start" onClick={onDelete}>
          מחק מסגרת <kbd className="ms-1 text-label-sm opacity-80">Delete</kbd>
        </Button>
      )}
      {readOnly && (
        <p className="flex items-center gap-1 text-label-md text-on-surface-variant">
          <AppIcon name="lock" className="text-base" /> קריאה בלבד
        </p>
      )}
    </div>
  )
}
