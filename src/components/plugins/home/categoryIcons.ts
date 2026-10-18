import type { PluginCategorySummary } from '@/components/plugins/types'

/** גליף ברירת המחדל לקטגוריה בלי אייקון (אייקוני הקטגוריות מגיעים מה-DB) */
export const DEFAULT_CATEGORY_ICON = 'extension'

type CategoryIconSource = Pick<PluginCategorySummary, 'icon'>

/**
 * האם להציג עמודת אייקונים ברשימת הקטגוריות (סרגל, שבבים, כותרות השורות).
 * כשלאף קטגוריה אין אייקון משלה — כל השורות היו מקבלות את אותו גליף ברירת מחדל, וזה רעש
 * שלא עוזר להבחין בין קטגוריות. ברגע שלאחת יש — מציגים לכולן (עם ברירת מחדל), כדי שהשמות
 * יישארו מיושרים לאותו קו.
 */
export function categoriesShowIcons(categories: readonly CategoryIconSource[]): boolean {
  return categories.some((category) => Boolean(category.icon?.trim()))
}

/** הגליף של קטגוריה, או ברירת המחדל */
export function categoryIcon(category: CategoryIconSource): string {
  return category.icon?.trim() || DEFAULT_CATEGORY_ICON
}
