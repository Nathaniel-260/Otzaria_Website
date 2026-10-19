// עזרים טהורים לבניית <title>/<meta description> של דפים ציבוריים.

// Google חותך תיאור בתוצאות החיפוש סביב 155–160 תווים; חיתוך משלנו בגבול מילה
// עדיף על חיתוך באמצע מילה.
export const META_DESCRIPTION_MAX = 155

// פירוק לגרפמות (אות + ניקוד/טעמים, אמוג'י) — כדי שחיתוך לא יפריד ניקוד מהאות
// שלו ולא ישאיר חצי אמוג'י
// (בלי Intl.Segmenter — Node עם small-icu — נופלים לנקודות קוד, כמו ב-pageProof/flowEdit.js)
const graphemeSegmenter =
  typeof Intl !== 'undefined' && Intl.Segmenter
    ? new Intl.Segmenter('he', { granularity: 'grapheme' })
    : null

function toGraphemes(text) {
  return graphemeSegmenter
    ? Array.from(graphemeSegmenter.segment(text), (part) => part.segment)
    : Array.from(text)
}

// מנקה רווחים/שורות ומקצר בגבול מילה, עם "…" בסוף אם קוצר. קלט ריק → ''.
// האורך נמדד בגרפמות (תווים כפי שהם נראים).
export function toMetaDescription(text, max = META_DESCRIPTION_MAX) {
  const clean = (text ?? '').toString().replace(/\s+/g, ' ').trim()
  const graphemes = toGraphemes(clean)
  if (graphemes.length <= max) return clean

  const cut = graphemes.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  // אם אין רווח סביר (מילה אחת ארוכה מאוד) — חותכים באמצע
  const base = (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).join('')
  return `${base.replace(/[\s,.;:־–—-]+$/, '')}…`
}

// כותרת ותיאור לדף תוסף בודד בחנות
export function pluginPageMetadata(plugin) {
  const name = (plugin?.name ?? '').toString().trim()
  const description =
    toMetaDescription(plugin?.shortDescription) ||
    toMetaDescription(plugin?.description) ||
    (name ? `${name} – תוסף לתוכנת אוצריא.` : 'תוסף לתוכנת אוצריא.')
  return {
    title: name ? `${name} – תוסף לאוצריא` : 'תוסף לאוצריא',
    description
  }
}

// כותרת ותיאור לדף קטגוריה בחנות התוספים
export function pluginCategoryMetadata(category) {
  const name = (category?.name ?? '').toString().trim()
  return {
    title: name ? `${name} | חנות התוספים של אוצריא` : 'חנות התוספים של אוצריא',
    description:
      toMetaDescription(category?.description) ||
      (name ? `תוספים לתוכנת אוצריא בקטגוריה: ${name}.` : 'תוספים לתוכנת אוצריא.')
  }
}
