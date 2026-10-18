'use client'

import TagInput from '@/components/plugins/form/TagInput'
import { usePluginTagSuggestions } from '@/components/plugins/form/usePluginTagSuggestions'
import UploadStep from './UploadStep'
import type { UploadPluginForm } from './useUploadPluginForm'

/** שלב 3 — תגיות (לא חובה). תגיות קיימות בחנות מוצעות בזמן ההקלדה */
export default function UploadTagsStep({ form, step }: { form: UploadPluginForm; step: number }) {
  const suggestions = usePluginTagSuggestions()
  return (
    <UploadStep id="upload-step-tags" step={step} title="תגיות">
      <TagInput
        id="upload-new-tag"
        tags={form.formData.tags}
        onTagsChange={form.setTags}
        suggestions={suggestions}
        placeholder="הוסף תגית (לדוגמה: מילון, חיפוש, כלי עזר)"
      />
    </UploadStep>
  )
}
