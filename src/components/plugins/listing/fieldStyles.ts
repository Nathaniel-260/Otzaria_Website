import { cx } from '@/components/ui/cx'

/**
 * מראה שדה טקסט / בחירה בעמודי הרשימות (component-tokens.css → --field-*): מסגרת outline, ריחוף
 * כהה יותר, ובפוקוס מסגרת primary בעובי 2px — אותו מראה בדיוק כמו FIELD_BASE ב-PluginSearchBox
 * (שם הוא פנימי לרכיב ואינו מיוצא). כשייבנה ui/TextField — לעבור אליו ולמחוק את הקובץ הזה.
 *
 * withIcon — ריפוד ההתחלה גדל לאייקון (חיפוש) בצד ההתחלה.
 * trailing — ריפוד הסוף גדל לאייקון בצד הסוף (חץ של select).
 */
export type FieldSize = 'md' | 'lg'

const BASE = cx(
  'w-full rounded-(--field-radius) border border-(--field-border) bg-(--field-bg) text-(--field-fg)',
  'placeholder:text-(--field-placeholder) transition-colors hover:border-(--field-border-hover)',
  'focus:border-(--field-border-focus) focus:outline-1 focus:-outline-offset-2 focus:outline-(--field-border-focus)',
  'motion-reduce:transition-none'
)

const SIZE: Record<FieldSize, { box: string; plain: string; icon: string; end: string; trailing: string }> = {
  lg: { box: 'min-h-(--field-height-lg) text-body-lg', plain: 'ps-5', icon: 'ps-13', end: 'pe-5', trailing: 'pe-12' },
  md: { box: 'min-h-(--field-height-md) text-body-md', plain: 'ps-4', icon: 'ps-11', end: 'pe-4', trailing: 'pe-11' }
}

export function fieldClasses({
  size = 'md',
  withIcon = false,
  trailing = false,
  className
}: { size?: FieldSize; withIcon?: boolean; trailing?: boolean; className?: string } = {}) {
  const s = SIZE[size]
  return cx(BASE, s.box, withIcon ? s.icon : s.plain, trailing ? s.trailing : s.end, className)
}

/**
 * מיקום אייקון בתוך השדה (אבסולוטי, ממורכז אנכית) — start לאייקון חיפוש, end לחץ.
 * חשוב: המחלקות האלה הולכות על span עוטף ולא על הגליף עצמו — ל-.material-symbols-outlined יש
 * direction: ltr (base.css), ולכן start/end עליו מתהפכים (start-* = שמאל). העוטף יורש rtl מהדף.
 */
export function fieldIconClasses(size: FieldSize = 'md', side: 'start' | 'end' = 'start') {
  const pos = size === 'lg'
    ? (side === 'start' ? 'start-4 text-[1.5rem]' : 'end-4 text-[1.5rem]')
    : (side === 'start' ? 'start-3.5 text-[1.25rem]' : 'end-3.5 text-[1.25rem]')
  return cx('pointer-events-none absolute top-1/2 flex -translate-y-1/2 text-on-surface-variant', pos)
}

/** הגליף בתוך העוטף — יורש את הגודל מהעוטף (ה-24px של מחלקת הגופן נדרס) */
export const FIELD_ICON_GLYPH = '[font-size:inherit]'

/** תווית מעל שדה בסרגל המסננים — שקטה אך קריאה (Assistant, לא Vilna) */
export const FIELD_LABEL = 'mb-2 block text-label-md text-on-surface'
