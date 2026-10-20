'use client'

import FileDropZone from '@/components/plugins/form/FileDropZone'
import FormNote from '@/components/plugins/form/FormNote'
import { IconPreview, ScreenshotPreviews, SelectedFile } from '@/components/plugins/form/FilePreviews'
import UploadStep from './UploadStep'
import { UPLOAD_FIELD_IDS, type UploadPluginForm } from './useUploadPluginForm'

/** שלב 1 — הקבצים: קובץ התוסף (ממנו נלקחים שאר הפרטים), תמונת התוסף וצילומי המסך */
export default function UploadFilesStep({ form, step }: { form: UploadPluginForm; step: number }) {
  const { fieldErrors } = form
  return (
    <UploadStep id="upload-step-files" step={step} title="קבצים">
      <FileDropZone
        id={UPLOAD_FIELD_IDS.pluginFile}
        icon="folder_zip"
        label={<>קובץ תוסף (<bdi dir="ltr">.otzplugin</bdi>)</>}
        required
        inputRequired={!form.pluginFile}
        accept=".otzplugin"
        onChange={form.handlePluginFile}
        onDropFiles={form.dropPluginFile}
        error={fieldErrors.pluginFile}
        hint={
          <>
            <p>
              המערכת תחיל על הטופס את השדות מתוך <code dir="ltr">manifest.json</code>: שם התוסף, מחבר, תיאור קצר, גרסה, סטטוס וגרסת מינימום נתמכת.
            </p>
            <p>טיפ: ניתן גם לגרור את קובץ ה-<bdi dir="ltr">.otzplugin</bdi> לכאן.</p>
          </>
        }
      >
        {form.pluginFile && <SelectedFile>נבחר: {form.pluginFile.name}</SelectedFile>}
      </FileDropZone>

      <FileDropZone
        id={UPLOAD_FIELD_IDS.imageFile}
        icon="image"
        label="תמונת תוסף (אופציונלי)"
        accept="image/*"
        onChange={form.handleImageFile}
        onDropFiles={form.dropImageFile}
        error={fieldErrors.imageFile}
        hint={<p>טיפ: ניתן גם לגרור תמונה לכאן.</p>}
      >
        <div className="space-y-4">
          <FormNote icon="lightbulb">
            כדי להגביר את סיכויי הקבלה מומלץ לצרף תמונת תוסף איכותית, ברורה ומתאימה לתוכן התוסף. העלאה ללא תמונה או עם תמונה לא מתאימה עלולה להוביל לדחיית התוסף.
          </FormNote>
          {form.imagePreview && <IconPreview src={form.imagePreview} alt="תצוגה מקדימה" />}
        </div>
      </FileDropZone>

      <FileDropZone
        id={UPLOAD_FIELD_IDS.screenshots}
        icon="photo_library"
        label="צילומי מסך"
        required
        inputRequired={form.screenshotFiles.length === 0}
        accept="image/*"
        multiple
        onChange={form.handleScreenshotFiles}
        onDropFiles={form.dropScreenshotFiles}
        error={fieldErrors.screenshots}
        hint={<p>חובה לצרף לפחות צילום מסך אחד של התוסף. ניתן גם לגרור מספר תמונות לכאן יחד.</p>}
      >
        {form.screenshotPreviews.length > 0 && <ScreenshotPreviews srcs={form.screenshotPreviews} />}
      </FileDropZone>
    </UploadStep>
  )
}
