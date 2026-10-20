import manifest from '../../../scripts/icon-font.manifest.json'

/**
 * האייקונים שקיימים בפועל בגופן המוקטן (scripts/icon-font.manifest.json — נוצר ע"י build-icon-font).
 * שם קבוע בקוד נבדק כבר ב-build (check:icons); אבל שם שמגיע מנתונים (אייקון קטגוריה מה-DB) לא נסרק,
 * וגליף שאינו בגופן מוצג כמילה ("translate") במקום אייקון. לכן כל אייקון דינמי עובר כאן.
 */
const GLYPHS: ReadonlySet<string> = new Set((manifest as { icons: string[] }).icons)

export function hasIconGlyph(name: string | null | undefined): name is string {
  return typeof name === 'string' && GLYPHS.has(name.trim())
}
