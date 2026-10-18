'use client'

import TagInput from '@/components/plugins/form/TagInput'
import { usePluginTagSuggestions } from '@/components/plugins/form/usePluginTagSuggestions'
import UploadStep from './UploadStep'
import type { UploadPluginForm } from './useUploadPluginForm'
import type { TagCount } from '@/components/plugins/listing/TagFilterChips'

/**
 * שלב 3 — תגיות (לא חובה). תגיות קיימות בחנות מוצעות בזמן ההקלדה — מהמאגר שנטען בשרת (tagPool),
 * ואם אין (null) — נטען בפוקוס הראשון.
 */
export default function UploadTagsStep({ form, step, tagPool = null }: {
  form: UploadPluginForm
  step: number
  tagPool?: TagCount[] | null
}) {
  const suggestions = usePluginTagSuggestions(tagPool)
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
