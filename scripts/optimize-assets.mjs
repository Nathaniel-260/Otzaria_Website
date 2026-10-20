#!/usr/bin/env node
/**
 * optimize-assets.mjs — יוצר את נכסי התמונה שמוגשים לדפדפן מתוך המקורות שב-assets/.
 *
 * למה: הנכסים המקוריים הוגשו כמו שהם. logo.svg היה מעטפת SVG סביב PNG של
 * 1024×1024 בבסיס-64 (2.23MB, 1.68MB דחוס) שהוצג לעיתים ב-32×32; image.png שקל
 * 1.97MB ונטען כרקע בכל דף באתר ב-15% אטימות. יחד — כ-3.6MB בכל ביקור קר.
 * (תמונת הרקע הוסרה מאז מהאתר לגמרי, ואיתה bg.avif/bg.webp והמקור שלהם.)
 *
 * המקורות (assets/) אינם מוגשים לדפדפן. הפלטים (public/) נשמרים ב-Git.
 *
 * נכסי דף הבית (public/home): נוצרים מהמקורות ב-assets/home/ (ראו buildHomeAssets למטה).
 * הקבצים ב-public/home וב-public/icons מוגשים כ-immutable לשנה (next.config.ts), ולכן שמם
 * חייב לכלול גרסה (.vN) — שינוי תוכן = העלאת HOME_ASSET_VERSION והסרת הקבצים הישנים
 * (ועדכון ההפניות ב-GoldenBook.tsx/animations.css). scripts/check-perf-budget.mjs נכשל
 * אם קובץ בתיקיות האלה בלי גרסה בשמו.
 *
 * שימוש:
 *   node scripts/optimize-assets.mjs         # הכל (או: npm run build:assets)
 *   node scripts/optimize-assets.mjs --home  # רק נכסי דף הבית
 */

import { copyFile, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ASSETS = path.join(ROOT, 'assets')
const PUBLIC = path.join(ROOT, 'public')
const APP = path.join(ROOT, 'src', 'app')

// הלוגו מוצג לכל היותר ב-128px (הירו בדף הבית) — 256px נותן 2x לצפיפות גבוהה.
const LOGO_SIZE = 256

/** שולף את ה-PNG המוטמע בבסיס-64 מתוך מעטפת ה-SVG של הלוגו המרובע. */
async function squareLogoMaster() {
  const svg = await readFile(path.join(ASSETS, 'logo-square-master.svg'), 'utf8')
  const base64 = svg.match(/base64,\s*([A-Za-z0-9+/=]+)/)?.[1]
  if (!base64) throw new Error('logo-square-master.svg: לא נמצא PNG מוטמע')
  return Buffer.from(base64, 'base64')
}

const report = []

async function emit(target, buffer) {
  await writeFile(target, buffer)
  report.push(`${path.relative(ROOT, target)} — ${(buffer.length / 1024).toFixed(1)}KB`)
}

// ---- דף הבית ----
const HOME_ASSET_VERSION = 'v2'
// הרצועה המקורית: 24 פריימים של 360px (8640×360). הגרסה הקלה: 12 פריימים — נבחרים בפיזור
// אחיד כך שהראשון והאחרון נשמרים (0,2,4,6,8,10,13,15,17,19,21,23), ולכן האנימציה
// (steps(11), שנייה אחת, 12fps) מתחילה ונגמרת בדיוק באותם פריימים כמו המקורית.
// animations.css (background-size 1200%, steps(11)) חייב להתאים ל-SPRITE_FRAMES.
const SPRITE_FRAME_SIZE = 360
const SPRITE_SOURCE_FRAMES = 24
const SPRITE_FRAMES = 12
// רוחב הספר המוצג: 144–320px ב-CSS; 320w ל-DPR1, 560w (המקור) ל-DPR2 ולמסכים גדולים.
const BOOK_SRCSET_WIDTHS = [320, 560]

function spriteFrameIndices(frames = SPRITE_FRAMES, sourceFrames = SPRITE_SOURCE_FRAMES) {
  return Array.from({ length: frames }, (_, i) => Math.round((i * (sourceFrames - 1)) / (frames - 1)))
}

async function buildHomeAssets() {
  const HOME = path.join(PUBLIC, 'home')
  const sourceDir = path.join(ASSETS, 'home')
  const v = HOME_ASSET_VERSION

  // תמונות הספר (הסגור — LCP, והפתוח): WebP ברוחבי srcset. 560 הוא המקור עצמו (בלי קידוד חוזר).
  for (const name of ['golden-book-closed', 'golden-book']) {
    const master = path.join(sourceDir, `${name}.master.webp`)
    for (const width of BOOK_SRCSET_WIDTHS) {
      const target = path.join(HOME, `${name}.${v}-${width}.webp`)
      if (width === 560) {
        await copyFile(master, target)
        report.push(`${path.relative(ROOT, target)} — ${((await readFile(target)).length / 1024).toFixed(1)}KB (עותק המקור)`)
      } else {
        await emit(target, await sharp(master).resize(width, width, { kernel: 'lanczos3' }).webp({ quality: 88, effort: 6, alphaQuality: 95 }).toBuffer())
      }
    }
  }

  // רצועת הפתיחה: פריימים נבחרים → רצועה אחת → AVIF (עיקרי) + WebP (גיבוי לדפדפן בלי AVIF)
  const spriteMaster = path.join(sourceDir, 'golden-book-sprite.master.webp')
  const frames = await Promise.all(spriteFrameIndices().map(async (frame, i) => ({
    input: await sharp(spriteMaster).extract({ left: frame * SPRITE_FRAME_SIZE, top: 0, width: SPRITE_FRAME_SIZE, height: SPRITE_FRAME_SIZE }).png().toBuffer(),
    left: i * SPRITE_FRAME_SIZE,
    top: 0,
  })))
  const strip = await sharp({
    create: { width: SPRITE_FRAMES * SPRITE_FRAME_SIZE, height: SPRITE_FRAME_SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite(frames).png().toBuffer()
  await emit(path.join(HOME, `golden-book-sprite.${v}.avif`), await sharp(strip).avif({ quality: 55, effort: 6, chromaSubsampling: '4:4:4' }).toBuffer())
  await emit(path.join(HOME, `golden-book-sprite.${v}.webp`), await sharp(strip).webp({ quality: 75, effort: 6, alphaQuality: 90 }).toBuffer())
}

async function main() {
  // --home: רק נכסי דף הבית (בלי לייצר מחדש את הלוגואים)
  if (process.argv.includes('--home')) {
    await buildHomeAssets()
    console.log(`✓ נוצרו ${report.length} נכסי דף הבית:`)
    for (const line of report) console.log(`   ${line}`)
    return
  }
  const square = await squareLogoMaster()

  // לוגו מרובע (כותרות, הירו, ברירת מחדל לתוספים) — WebP.
  await emit(
    path.join(PUBLIC, 'logo.webp'),
    await sharp(square).resize(LOGO_SIZE, LOGO_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 85 }).toBuffer()
  )

  // לוגו בגזירה הצרה — נשאר PNG: הוא מוטמע גם במיילים, ושם התמיכה ב-WebP חלקית.
  await emit(
    path.join(PUBLIC, 'logo.png'),
    await sharp(path.join(ASSETS, 'logo-master.png')).resize({ width: LOGO_SIZE }).png({ compressionLevel: 9, palette: true }).toBuffer()
  )

  // אייקוני האתר. Next מזהה את app/icon.png ו-app/apple-icon.png אוטומטית,
  // מוסיף להם hash ומגיש אותם עם cache ארוך — במקום favicon של 1.68MB.
  await emit(
    path.join(APP, 'icon.png'),
    await sharp(square).resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9, palette: true, colors: 128 }).toBuffer()
  )
  await emit(
    path.join(APP, 'apple-icon.png'),
    // iOS אינו מכבד שקיפות ומצייר רקע שחור — לכן משטיחים על לבן.
    await sharp(square).resize(180, 180, { fit: 'contain', background: '#ffffff' }).flatten({ background: '#ffffff' }).png({ compressionLevel: 9, palette: true, colors: 128 }).toBuffer()
  )

  await buildHomeAssets()

  console.log(`✓ נוצרו ${report.length} נכסים:`)
  for (const line of report) console.log(`   ${line}`)
}

main().catch((err) => {
  console.error(`✗ optimize-assets: ${err.message}`)
  process.exit(1)
})
