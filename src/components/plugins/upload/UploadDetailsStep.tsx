'use client'

import { Fragment, type ReactNode } from 'react'
import FormField from '@/components/plugins/form/FormField'
import FormNote from '@/components/plugins/form/FormNote'
import { fieldA11yProps, fieldClasses } from '@/components/ui/fieldStyles'
import ManifestSummary from './ManifestSummary'
import UploadStep from './UploadStep'
import { UPLOAD_FIELD_IDS, type UploadPluginForm } from './useUploadPluginForm'

function ManifestKey({ children }: { children: ReactNode }) {
  return <code dir="ltr" className="font-semibold text-on-surface">{children}</code>
}

const MANIFEST_KEYS = ['name', 'author', 'description', 'version', 'stability', 'minAppVersion']

/** שלב 2 — מידע בסיסי: מה נלקח מה-manifest (ומה זוהה בפועל), והתיאור המלא */
export default function UploadDetailsStep({ form, step }: { form: UploadPluginForm; step: number }) {
  const id = UPLOAD_FIELD_IDS.description
  const error = form.fieldErrors.description
  return (
    <UploadStep id="upload-step-details" step={step} title="מידע בסיסי">
      <FormNote>
        <p>
          שאר המידע יילקח אוטומטית מקובץ התוסף, מתוך <code dir="ltr">manifest.json</code>. יש לוודא שהשדות הבאים מוגדרים בקובץ:
        </p>
        <p className="mt-1.5">
          {MANIFEST_KEYS.map((key, index) => (
            <Fragment key={key}>
              <ManifestKey>{key}</ManifestKey>
              {index < MANIFEST_KEYS.length - 1 && ', '}
            </Fragment>
          ))}
          {' (ואם יש, גם '}
          <ManifestKey>homepage</ManifestKey>
          {').'}
        </p>
      </FormNote>

      {form.pluginFile && <ManifestSummary formData={form.formData} />}

      <FormField id={id} label="תיאור מלא" required error={error}>
        <textarea
          value={form.formData.description}
          onChange={(e) => form.handleChange('description', e.target.value)}
          className={fieldClasses({ kind: 'textarea', invalid: Boolean(error) })}
          placeholder="תיאור מפורט של התוסף, מה הוא עושה ואיך להשתמש בו"
          maxLength={10000}
          required
          {...fieldA11yProps(id, { required: true, error })}
        />
      </FormField>
    </UploadStep>
  )
}
