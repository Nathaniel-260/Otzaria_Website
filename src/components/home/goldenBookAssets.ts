// נכסי הספר המוזהב (public/home) — הנתיבים ומידות ה-srcset במקום אחד.
// הקבצים נוצרים ב-scripts/optimize-assets.mjs (--home); שמם כולל גרסה (.vN) כי הם מוגשים
// כ-immutable לשנה (next.config.ts). שינוי תוכן = גרסה חדשה בשם, ובכל מקום כאן וב-animations.css.

const V = 'v2'

/** הרצועה: AVIF (עיקרי) ו-WebP (גיבוי). 12 פריימים — animations.css חייב להתאים ל-SPRITE_FRAMES. */
export const SPRITE_AVIF_SRC = `/home/golden-book-sprite.${V}.avif`
export const SPRITE_WEBP_SRC = `/home/golden-book-sprite.${V}.webp`
export const SPRITE_FRAMES = 12

/** הספר הסגור (הפריים הראשון, תמונת ה-LCP) והפתוח — WebP ב-320w (DPR1) וב-560w (DPR2/מקור) */
export const CLOSED_SRC = `/home/golden-book-closed.${V}-560.webp`
export const CLOSED_SRCSET = `/home/golden-book-closed.${V}-320.webp 320w, ${CLOSED_SRC} 560w`
export const OPEN_SRC = `/home/golden-book.${V}-560.webp`
export const OPEN_SRCSET = `/home/golden-book.${V}-320.webp 320w, ${OPEN_SRC} 560w`

/**
 * רוחב הספר המוצג (--book-w ב-HeroSection): 144px בנייד עד 320px מ-2xl. מסכי short/tall
 * סוטים מעט מהערכים — זה רמז לדפדפן בלבד, ו-width/height בתג נשארים 560 למניעת CLS.
 */
export const BOOK_SIZES =
  '(min-width: 1536px) 320px, (min-width: 1280px) 256px, (min-width: 1024px) 224px, (min-width: 768px) 192px, (min-width: 640px) 176px, 144px'
