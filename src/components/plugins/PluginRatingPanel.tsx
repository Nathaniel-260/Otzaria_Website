'use client'

// לוח הדירוגים בדף התוסף: הממוצע, התפלגות 5★→1★, והדירוג של המשתמש עצמו.
//
// הממוצע המוצג הוא הממוצע האמיתי. הציון שלפיו החנות ממיינת (ממוצע מוחלק) הוא
// פנימי ואינו נחשף — ראו src/lib/pluginRating.js.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import RatingStars, { formatRatingValue } from '@/components/plugins/RatingStars'
import { useDialog } from '@/components/providers/DialogContext'
import Badge from '@/components/ui/Badge'
import { cx } from '@/components/ui/cx'
import { FOCUS_RING } from '@/components/ui/focusRing'

// כוכב בודד ב-SVG (אותו מסלול כמו RatingStars) — לכפתורי הדירוג ולתוויות ההתפלגות. הגליף 'star'
// בגופן האייקונים המוקטן הוא קו מתאר בלבד (FILL=0), ולכן "כוכב מלא" ממנו נראה ריק.
const STAR_PATH =
  'M12 2.6l2.83 5.73 6.32.92-4.58 4.46 1.08 6.3L12 17.03l-5.65 2.98 1.08-6.3-4.58-4.46 6.32-.92z'

function StarIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={cx(filled ? 'fill-rating' : 'fill-outline-variant', className)}>
      <path d={STAR_PATH} />
    </svg>
  )
}

interface RatingSummary {
  ratingAvg: number
  ratingCount: number
  ratingVerifiedCount: number
  ratingBreakdown: number[]
  myRating: { value: number; verifiedInstall: boolean } | null
  canRate?: boolean
  isOwnPlugin?: boolean
}

interface PluginRatingPanelProps {
  pluginId: string
  /** מה שהגיע כבר בתשובת התוסף — כדי שהלוח יוצג מיד ולא יקרוץ */
  initial: Pick<RatingSummary, 'ratingAvg' | 'ratingCount' | 'ratingVerifiedCount' | 'ratingBreakdown'>
  /** פריסה בלבד. הכותרת ("דירוג המשתמשים") — אצל העמוד (DetailSection) */
  className?: string
}

const STAR_LABELS = [5, 4, 3, 2, 1]

export default function PluginRatingPanel({ pluginId, initial, className }: PluginRatingPanelProps) {
  const { data: session, status: sessionStatus } = useSession()
  const { showAlert, showConfirm } = useDialog() as {
    showAlert: (title: string, message: string) => Promise<void> | void
    showConfirm: (title: string, message: string) => Promise<boolean>
  }

  const [summary, setSummary] = useState<RatingSummary>({
    ratingAvg: initial.ratingAvg || 0,
    ratingCount: initial.ratingCount || 0,
    ratingVerifiedCount: initial.ratingVerifiedCount || 0,
    ratingBreakdown: initial.ratingBreakdown || [0, 0, 0, 0, 0],
    myRating: null
  })
  const [hovered, setHovered] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  // טעינת הדירוג של המשתמש הנוכחי (וסיכום מעודכן) — no-store בשרת.
  // ממתינים שהסשן ייושב, אחרת הבקשה נשלחת פעמיים (loading → מצב סופי).
  useEffect(() => {
    if (sessionStatus === 'loading') return
    let cancelled = false
    const load = async () => {
      try {
        const response = await fetch(`/api/plugins/${pluginId}/rating`)
        if (!response.ok) return
        const data = await response.json()
        if (!cancelled) setSummary(data)
      } catch (error) {
        console.error('Error loading plugin rating:', error)
      }
    }
    load()
    return () => { cancelled = true }
  }, [pluginId, sessionStatus])

  const submit = async (value: number) => {
    try {
      setSaving(true)
      const response = await fetch(`/api/plugins/${pluginId}/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'שמירת הדירוג נכשלה')

      setSummary((prev) => ({ ...prev, ...result }))
      await showAlert('תודה!', result.message || 'הדירוג נשמר')
    } catch (error) {
      showAlert('שגיאה', error instanceof Error ? error.message : 'לא הצלחנו לשמור את הדירוג')
    } finally {
      setSaving(false)
      setHovered(null)
    }
  }

  const remove = async () => {
    const confirmed = await showConfirm('הסרת הדירוג', 'להסיר את הדירוג שלך לתוסף זה?')
    if (!confirmed) return
    try {
      setSaving(true)
      const response = await fetch(`/api/plugins/${pluginId}/rating`, { method: 'DELETE' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'הסרת הדירוג נכשלה')
      setSummary((prev) => ({ ...prev, ...result }))
    } catch (error) {
      showAlert('שגיאה', error instanceof Error ? error.message : 'לא הצלחנו להסיר את הדירוג')
    } finally {
      setSaving(false)
    }
  }

  const { ratingAvg, ratingCount, ratingVerifiedCount, ratingBreakdown, myRating, isOwnPlugin } = summary
  const isLoggedIn = Boolean(session?.user)
  const displayed = hovered ?? myRating?.value ?? 0

  return (
    <div className={cx('rounded-(--card-radius) bg-(--card-bg) p-4 sm:p-6', className)}>
      {/* בלי דירוגים — רק "עדיין לא דורג" (חמישה פסים ריקים עם 0 הם רעש) */}
      <div className={cx('grid gap-6 sm:gap-8', ratingCount > 0 && 'sm:grid-cols-[12rem_minmax(0,1fr)]')}>
        {/* הממוצע */}
        <div className={cx(
          'flex items-center justify-center gap-2 rounded-(--radius-shape) bg-surface-container-low p-5 text-center',
          ratingCount > 0 ? 'flex-col' : 'flex-col sm:flex-row sm:gap-4'
        )}>
          {ratingCount > 0 ? (
            <>
              <div className="text-5xl font-bold leading-none tabular-nums text-on-surface">
                {formatRatingValue(ratingAvg)}
              </div>
              <RatingStars value={ratingAvg} size="lg" />
              <div className="text-body-sm text-on-surface-variant">
                {ratingCount.toLocaleString('he-IL')} {ratingCount === 1 ? 'מדרג' : 'מדרגים'}
              </div>
              {ratingVerifiedCount > 0 && (
                <span title="מדרגים שהתקנת התוסף אצלם נרשמה בפועל">
                  <Badge tone="success" icon="verified">
                    {ratingVerifiedCount.toLocaleString('he-IL')} מאומתים
                  </Badge>
                </span>
              )}
            </>
          ) : (
            <>
              <RatingStars value={0} size="lg" />
              <div className="text-body-sm text-on-surface-variant">התוסף עדיין לא דורג</div>
            </>
          )}
        </div>

        {/* התפלגות — הפסים בצבע הכוכבים; כל שורה: "5★ ▬▬▬ 12" */}
        {ratingCount > 0 && (
        <div className="flex flex-col justify-center gap-2.5">
          {STAR_LABELS.map((star) => {
            const count = ratingBreakdown[star - 1] || 0
            const percent = ratingCount > 0 ? (count / ratingCount) * 100 : 0
            return (
              <div key={star} className="flex items-center gap-3">
                <span className="flex w-8 shrink-0 items-center justify-end gap-1 text-label-md font-normal tabular-nums text-on-surface-variant">
                  {star}
                  <StarIcon filled className="size-3.5" />
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-container-high">
                  <span
                    className="block h-full rounded-full bg-rating transition-[width] duration-300 motion-reduce:transition-none"
                    style={{ width: `${percent}%` }}
                  />
                </span>
                <span className="w-10 shrink-0 text-label-md font-normal tabular-nums text-on-surface-variant">{count.toLocaleString('he-IL')}</span>
              </div>
            )
          })}
        </div>
        )}
      </div>

      {/* הדירוג שלי */}
      <div className="mt-6 border-t border-outline-variant pt-5">
        {isOwnPlugin ? (
          <p className="text-body-sm text-on-surface-variant">
            זה התוסף שהעלית — מפתח אינו מדרג את התוסף של עצמו.
          </p>
        ) : !isLoggedIn ? (
          <p className="text-body-sm text-on-surface-variant">
            <Link
              href={`/auth/login?callbackUrl=${encodeURIComponent(`/plugins/${pluginId}`)}`}
              prefetch={false}
              className={`rounded-sm font-bold text-primary underline-offset-4 hover:underline ${FOCUS_RING}`}
            >
              התחבר לאתר
            </Link>
            {' '}כדי לדרג את התוסף. דירוג אחד לכל משתמש, ואפשר לשנות אותו בכל עת.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-label-lg text-on-surface">
              {myRating ? 'הדירוג שלך:' : 'דרג את התוסף:'}
            </span>
            <div className="flex items-center" onMouseLeave={() => setHovered(null)}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  disabled={saving}
                  onClick={() => submit(star)}
                  onMouseEnter={() => setHovered(star)}
                  onFocus={() => setHovered(star)}
                  onBlur={() => setHovered(null)}
                  className={cx(
                    'group/star flex size-(--touch-target) items-center justify-center rounded-(--radius-control) disabled:cursor-default disabled:opacity-60',
                    FOCUS_RING
                  )}
                  title={`${star} מתוך 5`}
                  aria-label={`דרג ${star} מתוך 5`}
                  aria-pressed={myRating ? myRating.value === star : undefined}
                >
                  <StarIcon
                    filled={star <= displayed}
                    className="size-8 transition-transform group-hover/star:scale-110 motion-reduce:transition-none motion-reduce:group-hover/star:scale-100"
                  />
                </button>
              ))}
            </div>
            {myRating?.verifiedInstall && (
              <span title="התקנת התוסף אצלך נרשמה — הדירוג שלך מסומן כמאומת">
                <Badge tone="success" icon="verified">דירוג מאומת</Badge>
              </span>
            )}
            {myRating && (
              <button
                type="button"
                onClick={remove}
                disabled={saving}
                className={cx(
                  'inline-flex min-h-(--touch-target) items-center rounded-sm px-1 text-label-md text-error underline-offset-4 hover:underline disabled:opacity-50',
                  FOCUS_RING
                )}
              >
                הסר דירוג
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
