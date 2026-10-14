// logoHandoff — הגיאומטריה הטהורה של "מעבר הלוגו" בדף הבית: הספר המוזהב הגדול שבמסך
// הפתיחה מתכווץ ונע, תוך כדי גלילה, אל משבצת הלוגו שבכותרת העליונה הדביקה.
//
// אין כאן DOM: הקלט הוא מלבנים שכבר נמדדו (getBoundingClientRect), והפלט הוא מספרים
// שה-hook (src/hooks/useLogoHandoff.js) כותב כמשתני CSS או, בדפדפן בלי scroll-driven
// animations, כ-transform/opacity ישירים בכל פריים.
//
// המודל:
// - "המעופף" (flyer) הוא תמונת הספר שיושבת בתוך משבצת הלוגו בכותרת. גודל ה-layout שלו
//   הוא גודל הספר הגדול (size), כך שהוא תמיד מוקטן ולא מוגדל — חד בכל שלב.
// - במנוחה (סוף המעבר) הוא ממורכז במשבצת ומוקטן ל-restScale = target/size.
// - בתחילת המעבר (גלילה 0) הוא מוזז ב-(dx, dy) בדיוק אל מרכז הספר הגדול, בגודל מלא.
// - אורך המעבר בפיקסלי גלילה (end) שווה למרחק האנכי בין שני המרכזים. כך התנועה האנכית
//   צמודה לגלילה 1:1 — הספר "נגלל עם הדף" כרגיל, ורק בדרך נסחף הצידה ומתכווץ עד שהוא
//   נוחת במשבצת. אין רגע שבו הוא נע מהר או לאט מהדף שמתחתיו.
// - "המלווה" (follow — השורה "חינם לנצח!" שמתחת לספר) נשאר בדף, אבל מקבל transform שמצמיד
//   אותו למעופף: אותה הזזה ביחס למקומו ואותו קנה מידה סביב מרכז הספר (transform-origin),
//   כך שהם נעים כיחידה אחת — והוא דועך בדרך ונעלם ב-FOLLOW_FADE_END הראשונים של המעבר.
// - ההילה שמאחורי הספר היא מלווה נוסף: אותה הזזה ואותו קנה מידה (סביב מרכז הספר — היא
//   ממורכזת עליו), כך שהיא עולה ומתכווצת עם הספר — ודועכת לאט יותר מהשורה, עד GLOW_FADE_END,
//   כדי שהספר "ייקח" את האור איתו ורק אז ייכנס לכותרת בלעדיו.

/** אורך מינימלי למעבר, כדי שגם במסך שבו הספר כמעט צמוד לכותרת לא תהיה "קפיצה". */
export const MIN_HANDOFF_DISTANCE = 120

/** חלון ההחלפה בין הספר שבגיבור למעופף (פיקסלי גלילה) — שתי תמונות זהות באותו מקום.
 *  קצר בכוונה: המעופף מתחיל לזוז הצידה מהפיקסל הראשון, ובהצלבה ארוכה (16px) נראו בנייד
 *  שני ספרים חופפים בהיסט. כאן ההחלפה מסתיימת לפני שיש ביניהם הפרש נראה. */
export const HANDOFF_SWAP_DISTANCE = 2

/** החלק האחרון של המעבר שבו שם האתר שליד הלוגו מופיע. */
export const WORDMARK_START = 0.8

/** עד איזה חלק של המעבר ההילה שמאחורי הספר (שעולה ומתכווצת איתו) דועכת — הרבה לפני
 *  שהספר נוחת בכותרת, כדי שלא תיכנס אליה. */
export const GLOW_FADE_END = 0.6

/** עד איזה חלק של המעבר השורה שמתחת לספר ("חינם לנצח!") דועכת — הספר מגיע לכותרת לבד. */
export const FOLLOW_FADE_END = 0.35

/** היחס בין שולי תמונת הספר (golden-book.webp, הציור ממלא כ-81% מהרוחב) לשולי הלוגו
 *  הרגיל (logo.webp, כ-93%) — המעופף נעצר גדול מהמשבצת ביחס הזה, כדי שייראה בגודל הלוגו. */
export const FLYER_TO_LOGO_SCALE = 1.15

const clamp01 = (value) => Math.min(1, Math.max(0, value))

const round = (value) => Math.round(value * 100) / 100

/**
 * @param {{ source: {left:number, top:number, width:number, height:number},
 *           target: {left:number, top:number, width:number, height:number},
 *           scrollY: number, targetScale?: number }} input
 *   source — מלבן הספר הגדול כפי שנמדד עכשיו (viewport), target — מלבן משבצת הלוגו
 *   בכותרת (viewport; הכותרת דביקה, ולכן הוא קבוע), scrollY — מיקום הגלילה בזמן המדידה.
 *   targetScale — כמה גדול מהמשבצת המעופף נעצר: בתמונת הספר יש שוליים שקופים רחבים יותר
 *   מבלוגו הרגיל (logo.webp), ולכן בלי תיקון הוא היה נראה קטן ממנו במנוחה.
 * @returns {{ dx:number, dy:number, size:number, restScale:number, end:number, exit:number } | null}
 *   exit — הגלילה שבה הספר הגדול נעלם כולו מתחת לכותרת (ל-reduced-motion).
 */
export function computeHandoffGeometry({ source, target, scrollY = 0, targetScale = 1 }) {
  if (!source || !target || !(source.width > 0) || !(target.width > 0)) return null
  // מרכז הספר במצב גלילה 0 (קואורדינטות מסמך), ומרכז המשבצת (קבוע ב-viewport)
  const sourceX = source.left + source.width / 2
  const sourceY = source.top + scrollY + source.height / 2
  const targetX = target.left + target.width / 2
  const targetY = target.top + target.height / 2
  const size = source.width
  return {
    dx: round(sourceX - targetX),
    dy: round(sourceY - targetY),
    size: round(size),
    restScale: Math.round(target.width * targetScale / size * 1000) / 1000,
    end: round(Math.max(MIN_HANDOFF_DISTANCE, sourceY - targetY)),
    exit: round(Math.max(0, source.top + scrollY + source.height - (target.top + target.height)))
  }
}

/** התקדמות המעבר (0–1) לפי מיקום הגלילה. */
export function handoffProgress(scrollY, end) {
  if (!(end > 0)) return 1
  return clamp01(scrollY / end)
}

const lerp = (from, to, t) => from + (to - from) * t

/**
 * מצב פריים בודד — ל-fallback ב-JS (דפדפן בלי animation-timeline). אותן נוסחאות בדיוק
 * כמו ה-keyframes ב-animations.css (אינטרפולציה לינארית), כדי ששני המסלולים ייראו זהים.
 * @param {ReturnType<typeof computeHandoffGeometry>} geometry
 * @param {number} scrollY
 * @param {{ reducedMotion?: boolean }} [options]
 */
export function handoffFrame(geometry, scrollY, { reducedMotion = false } = {}) {
  if (!geometry) return { transform: 'none', flyerOpacity: 1, sourceOpacity: 1, glowOpacity: 1, wordmarkOpacity: 1, followTransform: 'none', followOpacity: 1 }

  // בלי תנועה: הלוגו פשוט מופיע במקומו כשהספר הגדול כבר יצא מהמסך
  if (reducedMotion) {
    const shown = scrollY >= geometry.exit ? 1 : 0
    return { transform: `scale(${geometry.restScale})`, flyerOpacity: shown, sourceOpacity: 1, glowOpacity: 1, wordmarkOpacity: shown, followTransform: 'none', followOpacity: 1 }
  }

  const t = handoffProgress(scrollY, geometry.end)
  const swap = clamp01(scrollY / HANDOFF_SWAP_DISTANCE)
  const x = round(lerp(geometry.dx, 0, t))
  const y = round(lerp(geometry.dy, 0, t))
  const scale = Math.round(lerp(1, geometry.restScale, t) * 1000) / 1000
  // המלווים (השורה וההילה) זזים בדף, ולכן ההזזה שלהם היא ההפרש בין המעופף לבין המקום שהספר היה נגלל אליו:
  // אופקית — הסחיפה אל המשבצת; אנכית — רק כש-end ארוך מהמרחק (MIN_HANDOFF_DISTANCE)
  const followX = round(-geometry.dx * t)
  const followY = round((geometry.end - geometry.dy) * t)
  return {
    transform: `translate(${x}px, ${y}px) scale(${scale})`,
    flyerOpacity: swap,
    sourceOpacity: 1 - swap,
    glowOpacity: round(1 - clamp01(t / GLOW_FADE_END)),
    wordmarkOpacity: round(clamp01((t - WORDMARK_START) / (1 - WORDMARK_START))),
    followTransform: `translate(${followX}px, ${followY}px) scale(${scale})`,
    followOpacity: round(1 - clamp01(t / FOLLOW_FADE_END))
  }
}
