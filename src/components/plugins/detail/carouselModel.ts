// לוגיקה טהורה של קרוסלת צילומי המסך (בלי React/DOM) — אינדקס מעגלי, החלקה ב-RTL, מתי מעבר אוטומטי
// פעיל, אילו תמונות לטעון. טסט: carouselModel.test.ts. הרכיב — ScreenshotCarousel.tsx.

/** מעבר אוטומטי כל 5 שניות */
export const AUTOPLAY_INTERVAL_MS = 5000

/** תנועת אצבע מינימלית (px) שנחשבת החלקה ולא נגיעה */
export const SWIPE_THRESHOLD_PX = 40

/** מעל מספר כזה של תמונות — מונה "3 / 14" במקום נקודות (שורת נקודות ארוכה לא נכנסת בנייד) */
export const MAX_DOTS = 10

/** אינדקס בטווח [0, count) עם חזרה מעגלית (גם לשליליים) */
export function wrapIndex(index: number, count: number): number {
  if (count <= 0) return 0
  return ((index % count) + count) % count
}

/** צעד קדימה (+1) או אחורה (-1) מהתמונה הנוכחית, מעגלי */
export function stepIndex(current: number, delta: number, count: number): number {
  return wrapIndex(current + delta, count)
}

/**
 * החלקת אצבע → צעד. בעמוד RTL התמונה הבאה יושבת משמאל, ולכן גרירה ימינה (dx חיובי) מביאה אותה: +1.
 * תנועה אנכית בעיקרה (גלילת הדף) או קצרה מהסף — 0.
 */
export function swipeStep(dx: number, dy: number, threshold = SWIPE_THRESHOLD_PX): -1 | 0 | 1 {
  if (Math.abs(dx) < threshold || Math.abs(dy) > Math.abs(dx)) return 0
  return dx > 0 ? 1 : -1
}

export interface AutoplayConditions {
  /** המשתמש לא השהה בכפתור */
  playing: boolean
  reducedMotion: boolean
  count: number
  hovered: boolean
  focusWithin: boolean
  documentHidden: boolean
  inView: boolean
  lightboxOpen: boolean
}

/**
 * האם המעבר האוטומטי רץ עכשיו. נעצר כשהעכבר מעל הקרוסלה, כשהפוקוס בתוכה, כשהטאב מוסתר, כשהיא מחוץ
 * למסך, כשהתצוגה המוגדלת פתוחה, ב-prefers-reduced-motion, וכשיש תמונה אחת בלבד.
 */
export function isAutoplayActive(c: AutoplayConditions): boolean {
  return (
    c.playing &&
    !c.reducedMotion &&
    c.count > 1 &&
    !c.hovered &&
    !c.focusWithin &&
    !c.documentHidden &&
    c.inView &&
    !c.lightboxOpen
  )
}

/**
 * אילו תמונות מקבלות src: כל מה שכבר הוצג (נשאר בזיכרון הדפדפן), הנוכחית, והבאה בתור (טעינה מוקדמת
 * — כך המעבר אליה חלק). כל השאר — בלי src עד שמגיעים אליהן.
 */
export function slidesToLoad(current: number, count: number, seen: Iterable<number> = []): Set<number> {
  const result = new Set<number>(seen)
  if (count <= 0) return result
  result.add(wrapIndex(current, count))
  if (count > 1) result.add(wrapIndex(current + 1, count))
  return result
}

/** התווית של תמונה בקרוסלה ושל הנקודה שלה */
export function slideLabel(index: number, count: number): string {
  return `תמונה ${index + 1} מתוך ${count}`
}
