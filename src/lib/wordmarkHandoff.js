// wordmarkHandoff — הגיאומטריה הטהורה של "מעבר שם האתר" בדף הבית: המילה "אוצריא" שבכותרת
// הראשית של הגיבור עולה ומתכווצת, תוך כדי גלילה, אל מקום שם האתר בכותרת העליונה הדביקה —
// לצד הלוגו, שמוצג שם קבוע מטעינת הדף (כמקובל: הלוגו קבוע, והמילה היא שעוברת).
//
// אין כאן DOM: הקלט הוא מלבנים שכבר נמדדו (getBoundingClientRect), והפלט הוא מספרים
// שה-hook (src/hooks/useWordmarkHandoff.js) כותב כמשתני CSS או, בדפדפן בלי scroll-driven
// animations, כ-transform/opacity ישירים בכל פריים.
//
// המודל:
// - "המעופף" (flyer) הוא עותק של המילה שיושב בכותרת, ממורכז על מקום שם האתר. גודל הגופן
//   שלו הוא גודל הכותרת הראשית (נמדד), כך שהוא תמיד מוקטן ולא מוגדל — חד בכל שלב.
// - במנוחה (סוף המעבר) הוא מוקטן ל-restScale = גודל הגופן של שם האתר / גודל הגופן של המילה
//   בגיבור, ממורכז על שם האתר שבכותרת.
// - שם האתר שבכותרת עצמו הוא אלמנט נפרד — בגודל גופן אמיתי ובלי transform, באותו משקל
//   (OT Vilna Regular — ראו HeaderLogo.jsx), כי מעופף מוקטן ב-transform מצויר מטושטש. בקטע
//   האחרון של המעבר (CROSSFADE_START→1) המעופף דועך והסטטי עולה במקומו, באותו מקום ובאותו
//   גודל — כך שבמנוחה מוצג רק טקסט חד.
// - בתחילת המעבר (גלילה 0) הוא מוזז ב-(dx, dy) בדיוק אל המילה שבגיבור, בגודל מלא.
// - אורך המעבר בפיקסלי גלילה (end) הוא המרחק האנכי בין שני המרכזים כפול riseRatio:
//   - riseRatio = 1 (נייד — הספר מעל המילה): התנועה האנכית צמודה לגלילה 1:1, המילה "נגללת
//     עם הדף" ואינה עולה על הספר שמעליה;
//   - riseRatio < 1 (שתי עמודות — הספר לצד המילה, בינה לבין הלוגו): המילה עולה מהר מהדף,
//     כך שהיא כבר מעל הספר כשהיא נסחפת לעברו.
// - הסחיפה האופקית מואצת (t², DRIFT_EASE): בהתחלה המילה בעיקר עולה, ורק אחר כך נסחפת אל
//   מקומה — כך היא לא חוצה את הספר שלצדה. אנכית וקנה המידה — לינאריים.
// - המילה שבגיבור (source) מפנה את מקומה למעופף בבת אחת (HANDOFF_SWAP_DISTANCE) — שני
//   עותקים זהים באותו מקום, כך שאין רגע עם שתי מילים נראות או בלי אף אחת.

/** אורך מינימלי למעבר, כדי שגם כשהמילה כמעט צמודה לכותרת לא תהיה "קפיצה". */
export const MIN_HANDOFF_DISTANCE = 120

/** נקודת ההחלפה בין המילה שבגיבור למעופף (פיקסלי גלילה): החלפה חדה ולא הצלבה — בהצלבה
 *  שני עותקים חצי-שקופים זה על זה נראו בהירים מהמילה עצמה. בנקודה הזו המעופף עוד כמעט
 *  לא זז, כך שההחלפה בלתי נראית. אותו מספר ב-animations.css (steps של המקור ושל המעופף). */
export const HANDOFF_SWAP_DISTANCE = 2

/** מאיזה חלק של המעבר המעופף (מוקטן ב-transform) מתחלף בשם האתר הסטטי (בגודל גופן אמיתי).
 *  אותו מספר ב-animations.css. */
export const CROSSFADE_START = 0.85

/** עד איזה חלק של המעבר הקישוט שמתחת לכותרת (הקו ונקודת הזהב — "מלווה") דועך: בלעדיו הוא
 *  נשאר תלוי לבד מעל מקום ריק כשהמילה כבר עלתה. אותו מספר ב-animations.css. */
export const COMPANION_FADE_END = 0.5

/** הסחיפה האופקית כפונקציה של ההתקדמות: t². ב-CSS — cubic-bezier(1/3, 0, 2/3, 1/3), שהוא
 *  בדיוק t² (ראו animations.css). */
export const driftEase = (t) => t * t

const clamp01 = (value) => Math.min(1, Math.max(0, value))

const round = (value) => Math.round(value * 100) / 100

/**
 * @param {{ source: {left:number, top:number, width:number, height:number},
 *           target: {left:number, top:number, width:number, height:number},
 *           scrollY: number, sourceFontSize?: number, targetFontSize?: number }} input
 *   source — מלבן המילה בגיבור כפי שנמדד עכשיו (viewport), target — מלבן שם האתר בכותרת
 *   (viewport; הכותרת דביקה, ולכן הוא קבוע), scrollY — מיקום הגלילה בזמן המדידה.
 *   sourceFontSize/targetFontSize — גדלי הגופן (px): קנה המידה במנוחה הוא היחס ביניהם, כי
 *   המשקלים שונים ולכן גם הרוחב. בלעדיהם — יחס הרוחבים.
 *   riseRatio — אורך המעבר ביחס למרחק האנכי (0–1]; ראו המודל למעלה.
 * @returns {{ dx:number, dy:number, restScale:number, end:number } | null}
 */
export function computeHandoffGeometry({ source, target, scrollY = 0, sourceFontSize = 0, targetFontSize = 0, riseRatio = 1 }) {
  if (!source || !target || !(source.width > 0) || !(target.width > 0)) return null
  // מרכז המילה במצב גלילה 0 (קואורדינטות מסמך), ומרכז שם האתר (קבוע ב-viewport)
  const sourceX = source.left + source.width / 2
  const sourceY = source.top + scrollY + source.height / 2
  const targetX = target.left + target.width / 2
  const targetY = target.top + target.height / 2
  return {
    dx: round(sourceX - targetX),
    dy: round(sourceY - targetY),
    restScale: Math.round((sourceFontSize > 0 && targetFontSize > 0
      ? targetFontSize / sourceFontSize
      : target.width / source.width) * 1000) / 1000,
    end: round(Math.max(MIN_HANDOFF_DISTANCE, (sourceY - targetY) * (riseRatio > 0 && riseRatio <= 1 ? riseRatio : 1)))
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
 * כמו ה-keyframes ב-animations.css, כדי ששני המסלולים ייראו זהים.
 * reduced-motion או בלי גיאומטריה: אין מעבר — המילה נשארת בגיבור, המעופף מוסתר ושם האתר
 * הסטטי שבכותרת מוצג.
 * @param {ReturnType<typeof computeHandoffGeometry>} geometry
 * @param {number} scrollY
 * @param {{ reducedMotion?: boolean }} [options]
 */
export function handoffFrame(geometry, scrollY, { reducedMotion = false } = {}) {
  if (!geometry || reducedMotion) return { transform: 'none', flyerOpacity: 0, sourceOpacity: 1, targetOpacity: 1, companionOpacity: 1 }

  const t = handoffProgress(scrollY, geometry.end)
  const swap = scrollY >= HANDOFF_SWAP_DISTANCE ? 1 : 0
  const x = round(lerp(geometry.dx, 0, driftEase(t)))
  const y = round(lerp(geometry.dy, 0, t))
  const scale = Math.round(lerp(1, geometry.restScale, t) * 1000) / 1000
  const settle = round(clamp01((t - CROSSFADE_START) / (1 - CROSSFADE_START)))
  return {
    transform: `translate(${x}px, ${y}px) scale(${scale})`,
    flyerOpacity: round(Math.min(swap, 1 - settle)),
    sourceOpacity: 1 - swap,
    targetOpacity: settle,
    companionOpacity: round(1 - clamp01(t / COMPANION_FADE_END))
  }
}
