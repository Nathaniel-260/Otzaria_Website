'use client'

import { useState } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import Chip from '@/components/ui/Chip'
import AppIcon from '@/components/ui/AppIcon'
import FormField from '@/components/plugins/form/FormField'
import { FIELD_LABEL, fieldA11yProps, fieldClasses } from '@/components/ui/fieldStyles'

// חלון קופץ לדיווח לבעל התוסף מתוך דף התוסף באתר.
// משתמש באותה נקודת קצה שמשמשת את תוכנת אוצריא (POST /api/plugin-reports).
// ui/Dialog: פוקוס נלכד וחוזר לכפתור "דיווח", Esc/רקע סוגרים; הפעולות בשורה הקבועה בתחתית
// (כפתור השליחה מחובר לטופס ב-form=, כי הוא מחוץ ל-<form>).

type ReportType = 'bug' | 'crash' | 'content' | 'other'

const REPORT_TYPES: Array<{ value: ReportType; label: string; icon: string }> = [
  { value: 'bug', label: 'תקלה', icon: 'bug_report' },
  { value: 'crash', label: 'קריסה', icon: 'error' },
  { value: 'content', label: 'תוכן', icon: 'article' },
  { value: 'other', label: 'אחר', icon: 'help' },
]

const FORM_ID = 'plugin-report-form'

const MAX_DETAILS_LENGTH = 5000

interface PluginReportModalProps {
  plugin: { id: string; pluginUid?: string | null; name: string; version: string }
  defaultEmail?: string | null
  onClose: () => void
  onSuccess: (duplicate: boolean) => void
}

function generateReportId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `web-${crypto.randomUUID()}`
  }
  return `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export default function PluginReportModal({ plugin, defaultEmail, onClose, onSuccess }: PluginReportModalProps) {
  const [reportType, setReportType] = useState<ReportType>('bug')
  const [details, setDetails] = useState('')
  const [reporterEmail, setReporterEmail] = useState(defaultEmail || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = details.trim()
    if (!trimmed) {
      setError('נא לתאר את הבעיה')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const response = await fetch('/api/plugin-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId: generateReportId(),
          pluginUid: plugin.pluginUid || plugin.id,
          pluginName: plugin.name,
          pluginVersion: plugin.version,
          reportType,
          details: trimmed,
          reporterEmail: reporterEmail.trim() || undefined,
          platform: 'web',
        }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(
          response.status === 429
            ? 'נשלחו יותר מדי דיווחים. נסה שוב בעוד מספר דקות.'
            : result?.error || 'שגיאה בשליחת הדיווח'
        )
      }
      onSuccess(Boolean(result?.duplicate))
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'שגיאה בשליחת הדיווח')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      title="דיווח לבעל התוסף"
      subtitle={<>הדיווח על <strong className="font-semibold text-on-surface">{plugin.name}</strong> (גרסה <bdi dir="ltr">{plugin.version}</bdi>) יישלח במייל למפתח התוסף.</>}
      onClose={onClose}
      footer={
        <>
          <Button type="submit" form={FORM_ID} variant="filled" icon="send" loading={submitting} className="flex-1 sm:flex-none">
            {submitting ? 'שולח...' : 'שליחת הדיווח'}
          </Button>
          <Button type="button" variant="outlined" onClick={onClose} disabled={submitting} className="flex-1 sm:flex-none">
            ביטול
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-5">
        <fieldset>
          <legend className={FIELD_LABEL}>סוג הדיווח</legend>
          <div className="flex flex-wrap gap-x-2 gap-y-2.5">
            {REPORT_TYPES.map((type) => (
              <Chip
                key={type.value}
                icon={type.icon}
                selected={reportType === type.value}
                onClick={() => setReportType(type.value)}
              >
                {type.label}
              </Chip>
            ))}
          </div>
        </fieldset>

        <FormField
          id="plugin-report-details"
          label="תיאור הבעיה"
          required
          hint={`${details.length.toLocaleString('he-IL')} / ${MAX_DETAILS_LENGTH.toLocaleString('he-IL')}`}
        >
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value.slice(0, MAX_DETAILS_LENGTH))}
            className={fieldClasses({ kind: 'textarea' })}
            placeholder="מה קרה, באיזה מצב, ומה היית מצפה שיקרה"
            required
            maxLength={MAX_DETAILS_LENGTH}
            {...fieldA11yProps('plugin-report-details', { required: true, hint: true })}
          />
        </FormField>

        <FormField
          id="plugin-report-email"
          label="כתובת מייל למענה (לא חובה)"
          hint="הכתובת תועבר למפתח התוסף כדי שיוכל לחזור אליך. השאר ריק כדי לדווח באופן אנונימי."
        >
          <input
            type="email"
            value={reporterEmail}
            onChange={(e) => setReporterEmail(e.target.value)}
            className={fieldClasses({ className: 'text-start' })}
            placeholder="name@example.com"
            dir="ltr"
            autoComplete="email"
            {...fieldA11yProps('plugin-report-email', { hint: true })}
          />
        </FormField>

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-(--radius-control) bg-error-container px-4 py-3 text-body-sm text-on-error-container">
            <AppIcon name="error" className="mt-0.5 text-[1.15rem]" />
            <span>{error}</span>
          </p>
        )}
      </form>
    </Dialog>
  )
}
