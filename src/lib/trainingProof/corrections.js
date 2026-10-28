import mongoose from 'mongoose';
import TrainingProofCorrection from '../../models/TrainingProofCorrection.js';

// "המתנדבים שהמנהל תיקן" (בקשת בעל הפרויקט, 2026-10-28):
//   * המונה — לכל מתנדב ולכל חלק: אושרו פחות "אושרו בלי שינוי" (volunteerStats ← corrected).
//     שני המונים כבר נשמרים ב-stats.archived לפני המחיקה בהורדה, ולכן הוא שורד את ההורדה.
//   * היומן — TrainingProofCorrection: רשומה לכל "תקן ואשר" שבאמת שינה משהו, עם הגרסה של
//     המתנדב והגרסה של המנהל בצורה מקוצרת (בלי תמונות). אוסף משלו — שורד את מחיקת הפריט.
//     נשמרות רק CORRECTIONS_KEEP האחרונות לכל מתנדב. קובץ-ההחזרה לתחנה לא משתנה.

export const CORRECTIONS_KEEP = 200;

const oid = (v) => new mongoose.Types.ObjectId(String(v));

// סימון ← הצורה המקוצרת שביומן (טהור). זיהוי: מה הפעולה והטקסט שנקבע; נתב: כתב-השורה וכתב
// כל מילה; גלאי: מצב העמוד ומספר המסגרות (ההבדל עצמו — changes)
export function markSummary(section, payload, r) {
  if (!r) return null;
  if (section === 'ocr') {
    const text = r.action === 'fixed' ? r.text : r.action === 'ok' ? payload?.text ?? '' : '';
    return { action: r.action, text: String(text || '').slice(0, 4000) };
  }
  if (section === 'router') {
    if (r.bad) return { bad: true };
    return { label: r.label, words: Array.isArray(r.words) ? r.words.map((w) => w.label) : null };
  }
  return { status: r.status, frames: Array.isArray(r.frames) ? r.frames.length : 0 };
}

// אחרי "תקן ואשר" שבו המנהל שינה את הסימון. doc — הפריט אחרי העדכון (result = של המנהל,
// volResult = של המתנדב). changes — רק בגלאי (כמה מסגרות שונו)
export async function logCorrection(doc, { by = null, at = new Date(), changes = null } = {}) {
  if (!doc?.vol || !doc.adminFixed) return null;
  const p = doc.payload || {};
  const entry = await TrainingProofCorrection.create({
    vol: doc.vol,
    section: doc.section,
    item: doc._id,
    uid: doc.uid || '',
    alias: p.alias || '',
    page: Number.isInteger(p.page) ? p.page : null,
    track: doc.section === 'ocr' ? p.track || null : doc.section === 'router' ? p.pred || null : null,
    before: markSummary(doc.section, p, doc.volResult),
    after: markSummary(doc.section, p, doc.result),
    changes,
    by: by ? oid(by) : null,
    at,
  });
  await trimCorrections(doc.vol);
  return entry;
}

// רק CORRECTIONS_KEEP האחרונות לכל מתנדב
export async function trimCorrections(vol, keep = CORRECTIONS_KEEP) {
  const old = await TrainingProofCorrection.find({ vol: oid(vol) }, { _id: 1 }).sort({ at: -1, _id: -1 }).skip(keep).lean();
  if (old.length) await TrainingProofCorrection.deleteMany({ _id: { $in: old.map((d) => d._id) } });
  return old.length;
}

// "החזר לממתינות": התיקון של המנהל בוטל — גם הרשומה שלו
export async function dropCorrections(itemIds) {
  if (!itemIds?.length) return 0;
  const r = await TrainingProofCorrection.deleteMany({ item: { $in: itemIds.map(oid) } });
  return r.deletedCount;
}

// התיקונים של מתנדב, החדשים קודם
export async function listCorrections(vol, { limit = CORRECTIONS_KEEP, section = null } = {}) {
  const q = { vol: oid(vol) };
  if (section) q.section = section;
  const docs = await TrainingProofCorrection.find(q).sort({ at: -1, _id: -1 }).limit(limit).lean();
  return docs.map((d) => ({
    id: String(d._id),
    section: d.section,
    alias: d.alias,
    page: d.page,
    track: d.track,
    before: d.before,
    after: d.after,
    changes: d.changes,
    at: d.at,
  }));
}
