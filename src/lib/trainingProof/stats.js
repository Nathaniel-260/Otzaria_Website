import mongoose from 'mongoose';
import TrainingProofItem from '../../models/TrainingProofItem.js';
import TrainingProofVolunteer from '../../models/TrainingProofVolunteer.js';
import { SECTIONS } from './vocab.js';

// "ההגהות שלי" (ה-3) ו"שיעור ההתאמה" בניהול: לכל חלק — שמר · ממתינות · אושרו · נדחו.
//
// המקור הוא הפריטים עצמם. אבל פריט שאושר וירד לתחנה נמחק מהאתר (ה-13), ולכן לפני
// המחיקה מסך ההורדה מוסיף את המונים שלו ל-TrainingProofVolunteer.stats.archived
// (archiveDelta + applyArchive כאן). המונה הסופי = מה שחי באתר + מה שכבר ירד.

const oid = (v) => new mongoose.Types.ObjectId(String(v));
// corrected — כמה מהמאושרות המנהל תיקן ("תקן ואשר" ששינה משהו) = approved − unchanged
const zero = () => ({ saved: 0, pending: 0, approved: 0, unchanged: 0, corrected: 0, rejected: 0, match: null });

// המונים שנמחקים יחד עם הפריטים — לפי מתנדב ולפי חלק. items — מסמכים (lean) עם
// section, status, vol, adminFixed, rejectedFor. מחזיר Map(userId → {section → {approved, unchanged, rejected}})
export function archiveDelta(items) {
  const out = new Map();
  const bump = (u, section, key) => {
    const k = String(u);
    if (!out.has(k)) out.set(k, {});
    const s = (out.get(k)[section] ||= { approved: 0, unchanged: 0, rejected: 0 });
    s[key]++;
  };
  for (const it of items) {
    if (it.status === 'approved' && it.vol) {
      bump(it.vol, it.section, 'approved');
      if (!it.adminFixed) bump(it.vol, it.section, 'unchanged');
    }
    for (const r of it.rejectedFor || []) bump(r, it.section, 'rejected');
  }
  return out;
}

// מוסיף את archiveDelta למונים השמורים של כל מתנדב (לפני מחיקת הפריטים)
export async function applyArchive(delta, exportId = null) {
  const ops = [];
  for (const [userId, bySection] of delta) {
    const inc = {};
    for (const [section, c] of Object.entries(bySection)) {
      for (const [k, v] of Object.entries(c)) if (v) inc[`stats.archived.${section}.${k}`] = v;
    }
    if (Object.keys(inc).length) {
      const filter = { userId: oid(userId) };
      const update = { $inc: inc };
      if (exportId) {
        filter.archivedExports = { $ne: exportId };
        update.$addToSet = { archivedExports: exportId };
      }
      ops.push({ updateOne: { filter, update } });
    }
  }
  if (ops.length) await TrainingProofVolunteer.bulkWrite(ops);
  return ops.length;
}

// המונים של מתנדב אחד: {ocr:{saved,pending,approved,unchanged,rejected,match}, router:{…}, frames:{…}}
// frames סופר עמודים (פריט = עמוד)
export async function volunteerStats(userId) {
  const uid = oid(userId);
  const out = Object.fromEntries(SECTIONS.map((s) => [s, zero()]));
  const [mine, rejected, vol] = await Promise.all([
    TrainingProofItem.aggregate([
      { $match: { vol: uid, status: { $in: ['submitted', 'approved'] } } },
      {
        $group: {
          _id: { section: '$section', status: '$status' },
          n: { $sum: 1 },
          fixed: { $sum: { $cond: ['$adminFixed', 1, 0] } },
        },
      },
    ]),
    TrainingProofItem.aggregate([{ $match: { rejectedFor: uid } }, { $group: { _id: '$section', n: { $sum: 1 } } }]),
    TrainingProofVolunteer.findOne({ userId: uid }, { stats: 1 }).lean(),
  ]);
  for (const g of mine) {
    const s = out[g._id.section];
    if (!s) continue;
    if (g._id.status === 'submitted') s.pending += g.n;
    else {
      s.approved += g.n;
      s.unchanged += g.n - g.fixed;
    }
  }
  for (const g of rejected) if (out[g._id]) out[g._id].rejected += g.n;
  const archived = vol?.stats?.archived || {};
  for (const section of SECTIONS) {
    const a = archived[section] || {};
    const s = out[section];
    s.approved += a.approved || 0;
    s.unchanged += a.unchanged || 0;
    s.rejected += a.rejected || 0;
    s.corrected = s.approved - s.unchanged;
    s.saved = s.pending + s.approved + s.rejected;
    const judged = s.approved + s.rejected;
    s.match = judged ? s.unchanged / judged : null;
  }
  return out;
}
