'use client'

import { useCallback, useEffect, useState } from 'react'
import { useDialog } from '@/components/providers/DialogContext'
import { formatDateShort, formatDateShortMonthWithYearAndTime } from '@/lib/formatDate'
import { API } from './adminApi'
import { MAX_ACTIVE, SCOPE_SHORT, STATE_LABELS } from './tokenLabels'
import TokenCreateForm from './TokenCreateForm'
import TokenReveal from './TokenReveal'

// "מפתחות API" של צורת הדף (קידומת tht_; api/admin/tzurat-hadaf/tokens) — העתק של TokensCard של הגהת עמודים.
// כלי צורת הדף (tools/site_pull.py ועוד) קוראים, מכריעים ומייבאים בלי דפדפן — רק תחת
// /api/admin/tzurat-hadaf, ורק כל עוד מי שיצר את המפתח הוא מנהל המודול. המפתח מוצג פעם אחת.
// התגובות בלי `success` — ההצלחה לפי res.ok.

export const TOKENS_API = `${API}/tokens`

const STATE_STYLE = {
  active: 'bg-success-50 text-success-800',
  revoked: 'bg-danger-50 text-danger-700',
  expired: 'bg-surface-variant/60 text-on-surface/70',
}

const failMsg = (d, fallback) => d?.error || fallback
const okReply = (res, d) => !!res?.ok && !!d && d.success !== false

// טקסט שעשוי להיות משמאל לימין (שם באנגלית, tht_…) בתוך משפט עברי — מבודד (FSI…PDI)
const FSI = String.fromCharCode(0x2068)
const PDI = String.fromCharCode(0x2069)
const isolate = (s) => `${FSI}${s}${PDI}`

async function fetchTokens() {
  const res = await fetch(TOKENS_API, { cache: 'no-store' }).catch(() => null)
  const d = await res?.json().catch(() => null)
  return { ok: okReply(res, d), d }
}

export default function TokensCard() {
  const { showAlert, showConfirm } = useDialog()
  const [data, setData] = useState(null) // {tokens, active, max}
  const [loadError, setLoadError] = useState(null)
  const [created, setCreated] = useState(null) // {token, name}
  const [busy, setBusy] = useState(false)

  const [tick, setTick] = useState(0)
  const load = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let on = true
    fetchTokens().then(({ ok, d }) => {
      if (!on) return
      if (ok) {
        setData(d)
        setLoadError(null)
      } else setLoadError(failMsg(d, 'טעינת המפתחות נכשלה'))
    })
    return () => {
      on = false
    }
  }, [tick])

  const create = async (input) => {
    setBusy(true)
    try {
      const res = await fetch(TOKENS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      const d = await res.json().catch(() => null)
      if (!okReply(res, d) || !d.token) throw new Error(failMsg(d, 'יצירת המפתח נכשלה'))
      setCreated({ token: d.token, name: d.item?.name || input.name })
      load()
      return true
    } catch (e) {
      showAlert('שגיאה', e.message)
      return false
    } finally {
      setBusy(false)
    }
  }

  const revoke = (t) =>
    showConfirm(
      'ביטול מפתח API',
      `לבטל את "${isolate(t.name)}" (${isolate(`${t.prefix}…`)})? כלי שמשתמש בו יפסיק לעבוד מיד, ואי אפשר להחזיר אותו — רק ליצור מפתח חדש.`,
      async () => {
        const res = await fetch(`${TOKENS_API}/${encodeURIComponent(t.id)}`, { method: 'DELETE' }).catch(() => null)
        const d = await res?.json().catch(() => null)
        if (!res?.ok || d?.success === false) showAlert('שגיאה', failMsg(d, 'הביטול נכשל'))
        load()
      },
      'בטל את המפתח',
      'חזרה'
    )

  const tokens = data?.tokens || []
  const max = data?.max || MAX_ACTIVE
  const active = data?.active ?? tokens.filter((t) => t.state === 'active').length
  const full = active >= max

  return (
    <section className="glass-strong rounded-xl p-4" data-testid="tokens-card">
      <h3 className="mb-2 flex items-center gap-2 font-bold text-on-surface">
        <span aria-hidden="true" className="material-symbols-outlined text-primary">key</span>
        מפתחות API
      </h3>
      <p className="mb-3 text-sm text-on-surface/60">
        מפתח API מאפשר לכלים של צורת הדף לעבוד מול המודול בלי דפדפן: לקרוא סטטיסטיקה, החלטות, הגשות ודיווחים ולייצא, להכריע ולאשר, ולהעלות חבילות
        (לפי ההרשאות שתבחרו) — בשמכם, ורק תחת צורת הדף. המפתח פועל רק כל עוד אתם מנהלי המודול, עד תום התוקף או עד שתבטלו אותו (הביטול חל מיד). עד{' '}
        {max} מפתחות פעילים.
      </p>

      {created ? (
        <TokenReveal token={created.token} name={created.name} onDone={() => setCreated(null)} />
      ) : (
        <>
          <TokenCreateForm busy={busy} disabled={full || !data} onCreate={create} />
          {full && <p className="mt-2 text-xs text-warning-800">יש כבר {max} מפתחות פעילים — בטלו מפתח שאינו בשימוש כדי ליצור חדש.</p>}
        </>
      )}

      {loadError && <p className="mt-3 rounded bg-danger-50 px-2 py-1 text-sm text-danger-700">{loadError}</p>}
      {data && (
        <div className="mt-4 overflow-x-auto">
          <p className="mb-1 text-xs text-on-surface/60">
            {active} מתוך {max} פעילים
          </p>
          {!tokens.length ? (
            <p className="py-2 text-center text-sm text-on-surface/60">אין מפתחות</p>
          ) : (
            <table className="w-full min-w-[640px] text-sm" data-testid="tokens-table">
              <thead className="text-right text-on-surface/60">
                <tr>
                  <th className="p-1">מפתח</th>
                  <th className="p-1">שם</th>
                  <th className="p-1">הרשאות</th>
                  <th className="p-1">נוצר</th>
                  <th className="p-1">שימוש אחרון</th>
                  <th className="p-1">בתוקף עד</th>
                  <th className="p-1">מצב</th>
                  <th className="p-1"></th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((t) => (
                  <tr key={t.id} className="border-t border-surface-variant">
                    <td className="p-1">
                      <code dir="ltr" className="font-mono text-xs">
                        {t.prefix}…
                      </code>
                    </td>
                    <td className="p-1">{t.name}</td>
                    <td className="p-1 text-xs">{(t.scopes || []).map((s) => SCOPE_SHORT[s] || s).join(' · ')}</td>
                    <td className="p-1 text-xs">{t.createdAt ? formatDateShort(t.createdAt) : ''}</td>
                    <td className="p-1 text-xs">{t.lastUsedAt ? formatDateShortMonthWithYearAndTime(t.lastUsedAt) : 'לא נעשה שימוש'}</td>
                    <td className="p-1 text-xs">{t.expiresAt ? formatDateShort(t.expiresAt) : ''}</td>
                    <td className="p-1">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${STATE_STYLE[t.state] || ''}`}>{STATE_LABELS[t.state] || t.state}</span>
                    </td>
                    <td className="p-1">
                      {t.state === 'active' && (
                        <button
                          type="button"
                          onClick={() => revoke(t)}
                          className="flex items-center gap-1 rounded-md bg-danger-600 px-2 py-1 text-xs text-white hover:bg-danger-700"
                          aria-label={`ביטול המפתח ${t.name}`}
                        >
                          <span aria-hidden="true" className="material-symbols-outlined text-sm">block</span>
                          ביטול
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  )
}
