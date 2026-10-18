'use client'

import TagInput from '@/components/plugins/form/TagInput'
import UploadStep from './UploadStep'
import type { UploadPluginForm } from './useUploadPluginForm'

/** שלב 3 — תגיות (לא חובה) */
export default function UploadTagsStep({ form, step }: { form: UploadPluginForm; step: number }) {
  return (
    <UploadStep id="upload-step-tags" step={step} title="תגיות">
      <TagInput
        id="upload-new-tag"
        tags={form.formData.tags}
        value={form.newTag}
        onValueChange={form.setNewTag}
        onAdd={form.addTag}
        onRemove={form.removeTag}
        placeholder="הוסף תגית (לדוגמה: מילון, חיפוש, כלי עזר)"
        maxLength={40}
      />
    </UploadStep>
  )
}
