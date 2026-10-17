// wordmarkHandoff — "מעבר שם האתר" בדף הבית, כלוגיקה טהורה (בלי DOM).
//
// הדפוס: כותרת גדולה שנגללת אל מתחת לסרגל (כמו ה-large title של iOS). המילה "אוצריא" שבכותרת
// הראשית של הגיבור לא זזה ולא משנה גודל — היא נגללת עם הדף כמו כל טקסט, ונעלמת מתחת לכותרת
// העליונה הדביקה (שהרקע שלה אטום). ברגע שהיא מוסתרת כולה שם, שם האתר שבכותרת העליונה
// (ליד הלוגו הקבוע) נכנס בתנועה קצרה — דהייה ועלייה של כמה פיקסלים, בזמן ולא לפי הגלילה
// (CSS transition, ראו animations.css). כשהמילה חוזרת ומציצה מתחת לכותרת, שם האתר יוצא.
//
// למה לא "מעופף" שעולה ומתכווץ לפי הגלילה (המימוש הקודם): הוא נסחף באלכסון מעל הספר, יצא
// מגבולות הכותרת, והצלבה בין שני עותקים שעוד לא היו באותו מקום יצרה "רוח רפאים" כפולה.
// כאן שם האתר מופיע רק כשהמילה כבר לא נראית — אף פעם לא שני עותקים, ותמיד במקום הסופי שלו.
//
// ה-hook (src/hooks/useWordmarkHandoff.js) מודד ב-IntersectionObserver (בלי מאזין גלילה) וכותב
// את המצב ל-<html data-wordmark-handoff="...">:

/** המצבים של data-wordmark-handoff על <html> */
export const HANDOFF_STATE = Object.freeze({
  /** המילה בגיבור נראית (גם חלקית) מתחת לכותרת — שם האתר בכותרת מוסתר */
  hero: 'hero',
  /** המילה מוסתרת כולה מתחת לכותרת (או מעליה) — שם האתר בכותרת מוצג */
  docked: 'docked',
  /** אין מעבר (אין כותרת ראשית בדף, או שאי אפשר למדוד) — שם אתר רגיל */
  off: 'off'
})

/**
 * המצב לפי המדידה: המילה "עגנה" כשהתחתית שלה כבר לא מתחת לתחתית הכותרת העליונה.
 * @param {{ sourceBottom: number, headerBottom: number }} rects  קואורדינטות viewport
 * @returns {'hero' | 'docked' | 'off'}
 */
export function handoffState({ sourceBottom, headerBottom }) {
  if (!Number.isFinite(sourceBottom) || !Number.isFinite(headerBottom)) return HANDOFF_STATE.off
  return sourceBottom <= headerBottom ? HANDOFF_STATE.docked : HANDOFF_STATE.hero
}

/**
 * rootMargin ל-IntersectionObserver: ה-viewport בלי הרצועה שהכותרת העליונה מכסה. המילה
 * "חותכת" את הקצה העליון שלו בדיוק כשהיא נעלמת מתחת לכותרת.
 * @param {number} headerBottom
 */
export function handoffRootMargin(headerBottom) {
  const top = Number.isFinite(headerBottom) && headerBottom > 0 ? Math.round(headerBottom) : 0
  return `-${top}px 0px 0px 0px`
}
