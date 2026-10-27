import TrainingProofItem from '@/models/TrainingProofItem';
import TrainingProofPackage from '@/models/TrainingProofPackage';
import TrainingProofExportLog from '@/models/TrainingProofExportLog';
import TrainingProofBook from '@/models/TrainingProofBook';
import { buildReturnZip, newExportId } from '@/lib/trainingProof/returnFile';
import { archiveDelta, applyArchive } from '@/lib/trainingProof/stats';
import { oid } from './http';
import { removeItemFiles, dropEmptyPackages, dropEmptyBooks } from './files';

// ההורדה לתחנה (docs/75 ה-13; docs/76 §5, §8.2): ZIP של כל מה שאושר בחלק אחד, בנוי
// ב-returnFile. החומר נמחק מהאתר **רק אחרי שהשרת סיים לשלוח את הקובץ** — הזרם
// (ReadableStream) מוסר את הקובץ במנות לפי קצב הקריאה, וה-close מגיע רק כשהמנה האחרונה
// כבר נלקחה. דפדפן שניתק באמצע ← cancel ← שום דבר לא נמחק.
// ההורדה של חלק אחד רצה פעם אחת בכל זמן נתון (busy).

const CHUNK = 64 * 1024;
const busy = new Set();
// section → Promise של המחיקה שאחרי ההורדה האחרונה (לבדיקות, ולמי שרוצה לחכות לה)
export const purges = new Map();

export const isBusy = (section) => busy.has(section);

// מה ממתין להורדה בחלק — למסך ההורדה. פילוח לפי כתב/פעולה (זיהוי), כתב (נתב), ספרים (גלאי)
export async function pendingSummary(section) {
  const match = { section, status: 'approved' };
  const [count, a, b] = await Promise.all([
    TrainingProofItem.countDocuments(match),
    section === 'frames'
      ? TrainingProofItem.aggregate([{ $match: match }, { $group: { _id: '$book', n: { $sum: 1 }, alias: { $first: '$payload.alias' } } }])
      : TrainingProofItem.aggregate([{ $match: match }, { $group: { _id: section === 'ocr' ? '$track' : '$result.label', n: { $sum: 1 } } }]),
    section === 'ocr'
      ? TrainingProofItem.aggregate([{ $match: match }, { $group: { _id: '$result.action', n: { $sum: 1 } } }])
      : section === 'router'
        ? TrainingProofItem.aggregate([{ $match: match }, { $group: { _id: '$result.bad', n: { $sum: 1 } } }])
        : TrainingProofItem.aggregate([{ $match: match }, { $group: { _id: '$result.status', n: { $sum: 1 } } }]),
  ]);
  const toObj = (rows) => Object.fromEntries(rows.map((r) => [String(r._id ?? ''), r.n]));
  if (section === 'frames') {
    // הכינוי של ספר-גלאי שמור ברשומת הספר (books.json), לא בכל עמוד
    const books = await TrainingProofBook.find({ book: { $in: a.map((r) => r._id) } }, { book: 1, alias: 1 }).lean();
    const alias = new Map(books.map((x) => [x.book, x.alias]));
    return { count, books: a.map((r) => ({ alias: r.alias || alias.get(r._id) || r._id, pages: r.n })), byStatus: toObj(b) };
  }
  if (section === 'router') return { count, byLabel: toObj(a), bad: toObj(b).true || 0 };
  return { count, byTrack: toObj(a), byAction: toObj(b) };
}

// אחרי שהקובץ נשלח: מונים לארכיון ← מחיקת הפריטים ← יומן ← ניקוי קבצים, חבילות וספרים.
// נמחקים רק הפריטים שבקובץ ושעדיין מאושרים (אם אישור בוטל בינתיים — הפריט נשאר).
export async function purgeExported({ section, exportId, ids, packages, by }) {
  const docs = await TrainingProofItem.find(
    { _id: { $in: ids }, section, status: 'approved' },
    { section: 1, status: 1, vol: 1, adminFixed: 1, rejectedFor: 1, imagePath: 1, ctxPath: 1, packageId: 1, part: 1, book: 1 }
  ).lean();
  await applyArchive(archiveDelta(docs));
  const del = await TrainingProofItem.deleteMany({ _id: { $in: docs.map((d) => d._id) }, status: 'approved' });
  await TrainingProofExportLog.create({ exportId, section, count: ids.length, packages, at: new Date(), by: by ? oid(by) : null });
  const files = await removeItemFiles(docs);
  const dropped = await dropEmptyPackages(docs.map((d) => ({ packageId: d.packageId, part: d.part })));
  const books = section === 'frames' ? await dropEmptyBooks(docs.map((d) => d.book)) : 0;
  return { deleted: del.deletedCount, files, packages: dropped.length, books };
}

// בונה את הקובץ. מחזיר {error} או {exportId, count, bytes, stream}
export async function startExport(section, by) {
  if (busy.has(section)) return { error: 'הורדה של החלק הזה כבר רצה — חכו שתסתיים', status: 409 };
  busy.add(section);
  try {
    const items = await TrainingProofItem.find({ section, status: 'approved' }).sort({ packageId: 1, uid: 1 }).lean();
    if (!items.length) {
      busy.delete(section);
      return { error: 'אין כרגע חומר מאושר להורדה בחלק הזה', status: 409 };
    }
    const packages = [...new Set(items.map((it) => it.packageId))];
    const pk = await TrainingProofPackage.find({ packageId: { $in: packages } }, { packageId: 1, stationId: 1 }).lean();
    const stations = new Map(pk.map((p) => [p.packageId, p.stationId]));
    const exportId = newExportId();
    const { bytes, manifest } = buildReturnZip(section, items, { stationOf: (p) => stations.get(p), exportId });
    const ids = items.map((it) => it._id);
    let off = 0;
    let settled = false;
    const release = () => {
      settled = true;
      busy.delete(section);
    };
    const stream = new ReadableStream(
      {
        pull(controller) {
          if (off < bytes.length) {
            controller.enqueue(bytes.subarray(off, off + CHUNK));
            off += CHUNK;
            return;
          }
          controller.close();
          if (settled) return;
          // המנה האחרונה נלקחה — עכשיו (ורק עכשיו) מוחקים
          const p = purgeExported({ section, exportId, ids, packages, by })
            .catch((e) => {
              console.error('training-proof export purge', exportId, e?.message || e);
              return { error: true };
            })
            .finally(release);
          purges.set(section, p);
        },
        cancel() {
          // הדפדפן ניתק באמצע — שום דבר לא נמחק
          release();
        },
      },
      { highWaterMark: 0 }
    );
    return { exportId, count: manifest.counts.items, bytes, stream };
  } catch (e) {
    busy.delete(section);
    throw e;
  }
}
