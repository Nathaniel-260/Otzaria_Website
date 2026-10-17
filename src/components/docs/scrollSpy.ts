/**
 * הלוגיקה הטהורה של scroll-spy בתוכן העניינים (useScrollSpy): איזה סעיף "נוכחי".
 *
 * IntersectionObserver צופה בכותרות דרך "רצועה" בראש המסך (מתחת לכותרת הדביקה, עד כ-40% מגובה
 * המסך). הסעיף הנוכחי:
 *   1. יש כותרות ברצועה — העליונה שבהן (הקורא בדיוק התחיל אותה).
 *   2. אין כותרת ברצועה (באמצע סעיף ארוך) — נשאר הקודם; אבל כותרת שיצאה מהרצועה כלפי מטה
 *      (גלילה למעלה) מחזירה את הסעיף שלפניה.
 *   3. סוף המאמר גלוי — הכותרת האחרונה שכבר נראית במסך, כדי שסעיפים קצרים בסוף הדף (שלעולם
 *      לא יגיעו לרצועה) יסומנו גם הם.
 */

/** הסעיף הנוכחי לפי הכותרות שברצועה וכותרות שיצאו ממנה למטה. -1 = לפני הכותרת הראשונה. */
export function pickActiveHeading(prev: number, { inBand, exitedBelow }: { inBand: readonly number[]; exitedBelow: readonly number[] }): number {
  if (inBand.length > 0) return Math.min(...inBand)
  const exited = exitedBelow.filter((index) => index <= prev)
  if (exited.length > 0) return Math.min(...exited) - 1
  return prev
}

/** האינדקס של הכותרת האחרונה שהחלק העליון שלה מעל limit (בפיקסלים מראש המסך); -1 אם אין. */
export function lastHeadingAbove(tops: readonly number[], limit: number): number {
  let last = -1
  tops.forEach((top, index) => {
    if (top < limit) last = index
  })
  return last
}

/**
 * כמה לגלול מכל עם גלילה פנימית כדי שפריט יהיה גלוי בו (בשוליים margin), או null אם הוא כבר גלוי.
 * הכל במונחי getBoundingClientRect — כך לא גוללים את החלון עצמו (כמו scrollIntoView).
 */
export function scrollDeltaToReveal(
  item: { top: number; bottom: number },
  container: { top: number; bottom: number },
  margin = 24
): number | null {
  if (item.top < container.top + margin) return item.top - container.top - margin
  if (item.bottom > container.bottom - margin) return item.bottom - container.bottom + margin
  return null
}

/** מזהה העוגן מתוך href של פריט תוכן עניינים ("#intro" → "intro") */
export function anchorId(href: string): string {
  const hash = href.indexOf('#')
  if (hash < 0) return ''
  const raw = href.slice(hash + 1)
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}
