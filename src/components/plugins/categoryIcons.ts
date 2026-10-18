import { hasIconGlyph } from '@/components/ui/iconGlyphs'

/**
 * אייקון של קטגוריית תוספים — כלל אחד לכל החנות (בית, קטגוריה, חיפוש, חלון האישור בניהול):
 *
 * 1. אייקון "תקף" = שם שקיים בגופן האייקונים (hasIconGlyph). שם ריק, או שם שאינו בגופן (מגיע מה-DB,
 *    למשל "translate") — כאילו אין אייקון. **אייקון לא תקף לעולם לא מוצג** (היה מוצג כמילה).
 * 2. קטגוריה בודדת (כותרת עמוד הקטגוריה, שבב בתוצאת חיפוש) — אייקון רק אם יש לה אייקון תקף; אחרת בלי.
 * 3. רשימה של קטגוריות (סרגל, שבבים בבית, חלון האישור) — אם לפחות לאחת יש אייקון תקף, לכולן מוצג
 *    אייקון (ברירת המחדל DEFAULT_CATEGORY_ICON למי שאין), כדי שהשמות יישארו בקו אחד; אם לאף אחת אין —
 *    לאף אחת לא (אותו גליף בכל שורה הוא רעש שלא עוזר להבחין).
 */
export const DEFAULT_CATEGORY_ICON = 'extension'

type CategoryIconSource = { icon?: string | null }

/** האייקון התקף של קטגוריה, או null (כלל 1–2) */
export function validCategoryIcon(category: CategoryIconSource): string | null {
  const name = category.icon?.trim()
  return hasIconGlyph(name) ? name : null
}

/** האם להציג עמודת אייקונים ברשימת קטגוריות (כלל 3) */
export function categoriesShowIcons(categories: readonly CategoryIconSource[]): boolean {
  return categories.some((category) => validCategoryIcon(category) !== null)
}

/** הגליף של קטגוריה ברשימה שמציגה אייקונים — התקף, או ברירת המחדל (כלל 3) */
export function categoryIcon(category: CategoryIconSource): string {
  return validCategoryIcon(category) ?? DEFAULT_CATEGORY_ICON
}
