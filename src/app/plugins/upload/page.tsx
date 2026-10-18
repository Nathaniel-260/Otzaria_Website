'use client'

import Section from '@/components/ui/Section'
import StorePageHeader from '@/components/plugins/StorePageHeader'
import UploadPluginForm from '@/components/plugins/upload/UploadPluginForm'
import { useUploadPluginForm } from '@/components/plugins/upload/useUploadPluginForm'

/**
 * העלאת תוסף חדש לחנות. מוגן בהתחברות ב-proxy (src/lib/protected-routes.js) — אורח מופנה
 * לדף ההתחברות לפני שהעמוד נטען. הלוגיקה (קריאת manifest.json, בדיקות הקבצים, השליחה
 * ל-/api/plugins/upload) — ב-useUploadPluginForm; הטופס עצמו — ב-components/plugins/upload/.
 */
export default function UploadPluginPage() {
  const form = useUploadPluginForm()

  return (
    <main id="main-content" className="flex-1">
      <StorePageHeader
        titleId="upload-plugin-title"
        container="narrow"
        breadcrumbs={[{ label: 'חנות התוספים', href: '/plugins' }, { label: 'העלאת תוסף' }]}
        title="העלאת תוסף חדש"
        subtitle="מלא את הפרטים הבאים כדי להעלות תוסף לחנות. התוסף יעבור אישור מנהל לפני שיופיע בחנות."
      />
      <Section spacing="none" container="narrow">
        <UploadPluginForm form={form} />
      </Section>
    </main>
  )
}
