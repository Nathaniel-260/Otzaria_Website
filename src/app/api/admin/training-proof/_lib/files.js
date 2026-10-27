import fs from 'fs-extra';
import TrainingProofItem from '@/models/TrainingProofItem';
import TrainingProofPackage from '@/models/TrainingProofPackage';
import TrainingProofBook from '@/models/TrainingProofBook';
import { resolveImageFsPath } from '@/lib/ocr/images';
import { TP_IMAGE_ROOT, packageDirRel } from '@/lib/trainingProof/storage';

// מחיקת קבצים וניקוי אחרי מחיקת פריטים (הורדה לתחנה — ה-13; מחיקת חבילה בהעלאה).
// רק בתוך תיקיית ההגהה לאימון — לעולם לא נוגעים בתמונות אחרות של האתר.

const inRoot = (rel) => typeof rel === 'string' && rel.startsWith(`${TP_IMAGE_ROOT}/`);

async function removeRel(rel) {
  if (!inRoot(rel)) return false;
  try {
    await fs.remove(resolveImageFsPath(rel));
    return true;
  } catch {
    return false;
  }
}

// docs — הפריטים שנמחקו (עם imagePath/ctxPath). תמונת-השורה שלהם נמחקת; תמונת-הקשר
// נמחקת רק כשאין עוד פריט שמשתמש בה. מחזיר כמה קבצים נמחקו
export async function removeItemFiles(docs) {
  let n = 0;
  for (const d of docs) if (await removeRel(d.imagePath)) n++;
  const ctx = [...new Set(docs.map((d) => d.ctxPath).filter(inRoot))];
  for (const rel of ctx) {
    if (await TrainingProofItem.exists({ ctxPath: rel })) continue;
    if (await removeRel(rel)) n++;
  }
  return n;
}

// חבילות שלא נשאר בהן פריט נמחקות; תיקיית-התמונות של package_id נמחקת כשלא נשאר
// לו אף חלק. keys — [{packageId, part}]. מחזיר את מה שנמחק
export async function dropEmptyPackages(keys) {
  const dropped = [];
  const uniq = [...new Map(keys.map((k) => [`${k.packageId}#${k.part}`, k])).values()];
  for (const { packageId, part } of uniq) {
    if (await TrainingProofItem.exists({ packageId, part })) continue;
    await TrainingProofPackage.deleteOne({ packageId, part });
    dropped.push({ packageId, part });
  }
  for (const packageId of new Set(dropped.map((d) => d.packageId))) {
    if (await TrainingProofItem.exists({ packageId })) continue;
    if (await TrainingProofPackage.exists({ packageId })) continue;
    await fs.remove(resolveImageFsPath(packageDirRel(packageId))).catch(() => {});
  }
  return dropped;
}

// ספרי-גלאי שלא נשאר להם עמוד באתר נמחקים מרשימת הספרים
export async function dropEmptyBooks(books) {
  let n = 0;
  for (const book of new Set(books.filter(Boolean))) {
    if (await TrainingProofItem.exists({ section: 'frames', book })) continue;
    n += (await TrainingProofBook.deleteOne({ book })).deletedCount;
  }
  return n;
}
