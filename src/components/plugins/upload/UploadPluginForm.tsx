'use client'

import UploadDetailsStep from './UploadDetailsStep'
import UploadFilesStep from './UploadFilesStep'
import UploadSubmitBar from './UploadSubmitBar'
import UploadTagsStep from './UploadTagsStep'
import type { UploadPluginForm as UploadPluginFormState } from './useUploadPluginForm'
import type { TagCount } from '@/components/plugins/listing/TagFilterChips'

/**
 * טופס העלאת התוסף — שלבים ממוספרים בסדר שבו ממלאים אותו: קודם קובץ התוסף (ממנו נלקחים
 * השם, המפתח, הגרסה ועוד), אחר כך התיאור, התגיות, ולבסוף אישור ושליחה.
 * המצב והשליחה — ב-useUploadPluginForm (ההורה), כדי שאפשר יהיה לרנדר את הטופס בטסט.
 * tagPool — מאגר התגיות הקיימות שנטען בשרת (null — שדה התגיות טוען בעצמו).
 */
export default function UploadPluginForm({ form, tagPool = null }: { form: UploadPluginFormState; tagPool?: TagCount[] | null }) {
  return (
    <form onSubmit={form.handleSubmit} className="space-y-6 md:space-y-8" aria-busy={form.loading || undefined}>
      <UploadFilesStep form={form} step={1} />
      <UploadDetailsStep form={form} step={2} />
      <UploadTagsStep form={form} step={3} tagPool={tagPool} />
      <UploadSubmitBar form={form} />
    </form>
  )
}
