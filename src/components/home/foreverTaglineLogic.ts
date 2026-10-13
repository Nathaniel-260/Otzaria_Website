// לוגיקה טהורה לשורה "חינם ← לנצח!" (ForeverTagline).
// מתי לולאת "חינם ← לנצח!" עוצרת (WCAG 2.2.2): כשאין מי שרואה אותה (מחוץ למסך, לשונית
// מוסתרת), או כשהמשתמש מתעניין בגיבור (ריחוף / פוקוס מקלדת בתוכו) ותנועה רק מסיחה.
export type TaglinePauseState = {
  inView: boolean
  hidden: boolean
  hovered: boolean
  focused: boolean
}

export function shouldPauseTagline({ inView, hidden, hovered, focused }: TaglinePauseState): boolean {
  return !inView || hidden || hovered || focused
}

/**
 * כמה להזיז את "חינם" שמאלה כדי שיהיה ממורכז לבד בתוך השורה "חינם לנצח!" הממורכזת:
 * חצי מהרוחב שנוסף לו בצירוף — "לנצח!" והרווח שביניהם. מעוגל לחצי פיקסל.
 */
export function foreverShift(finalWidth: number, gap: number): number {
  if (!(finalWidth > 0)) return 0
  return Math.round((finalWidth + Math.max(0, gap)) / 2 * 2) / 2
}
