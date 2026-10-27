// נקודת-החיבור לעורך-המסגרות של סשן ג' (docs/76 §8.3: "העורך נבנה כרכיב שגם מסך הסקירה
// של המנהל משתמש בו — readOnly/review").
//
// עד שהרכיב שלו נכנס לענף, מסך הסקירה מציג תצוגה פשוטה לקריאה בלבד (FramesPagePreview).
// כשהוא מוכן — שורה אחת כאן:
//
//   export { default as FramesEditor } from '@/components/trainingProof/frames/<שם הרכיב>'
//
// והסקירה מעבירה לו (FramesBookReview):
//   mode="review"
//   page       — הפריט כפי שמסך הניהול מקבל אותו (adminItem): img, w, h, page, frames (הצעת
//                המודל), result ({status, frames, streams_added} — מה שהמתנדב שמר)
//   streams    — הזרמים של הספר (TrainingProofBook.streams)
//   onSave(result) — "תקן ואשר" לעמוד: POST /api/admin/training-proof/review/fix {id, mark: result}.
//                כדי שזה יעבוד, הבדיקה של סימון-גלאי (checkFramesMark) צריכה להירשם
//                ב-MARK_CHECKS (src/lib/trainingProof/marks.js — סשן התשתית). עד אז — 400.
export const FramesEditor = null
