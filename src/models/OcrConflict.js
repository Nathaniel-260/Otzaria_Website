import mongoose from 'mongoose';

// התנגשות בהחלת תוצאת OCR מקומי (ספק local): העמוד השתנה אחרי יצירת העבודה
// (updatedAt שונה מ-expectedUpdatedAt ב-pageMap), ולכן טקסט ה-OCR לא נכתב עליו.
// הטקסט נשמר כאן להחלטת מנהל (החלה ידנית או דחייה). אוסף נפרד ולא בתוך OcrJob —
// אלפיים עמודים של טקסט עלולים להתקרב למגבלת 16MB של מסמך יחיד.
const OcrConflictSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'OcrJob', required: true },
  book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  page: { type: mongoose.Schema.Types.ObjectId, ref: 'Page', required: true },
  pageNumber: { type: Number },
  pdfPageIndex: { type: Number },
  reason: { type: String, enum: ['page_changed'], default: 'page_changed' },
  ocrText: { type: String, default: '' },
  resultSha256: { type: String },
  expectedUpdatedAt: { type: Date },
  foundUpdatedAt: { type: Date },
  status: { type: String, enum: ['open', 'applied', 'dismissed'], default: 'open' },
  resolvedAt: { type: Date },
  resolvedByName: { type: String },
}, { timestamps: true });

// התנגשות אחת לכל עמוד בעבודה (upsert בשליחה חוזרת לא יוצר כפילות)
OcrConflictSchema.index({ job: 1, page: 1 }, { unique: true });
OcrConflictSchema.index({ book: 1, status: 1 });

export default mongoose.models.OcrConflict || mongoose.model('OcrConflict', OcrConflictSchema);
