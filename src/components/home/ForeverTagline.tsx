'use client'

// "חינם" → "חינם לנצח!" — השורה המונפשת שצמודה מתחת לספר בגיבור.
//
// לולאה רגועה: "חינם" מופיע לבד וממורכז, מחליק ימינה ומפנה מקום, "לנצח!" נכנס למקום שהתפנה
// (אות אחר אות), הצירוף מוצג ממורכז, ואז "לנצח!" דוהה ו"חינם" חוזר למרכז — וחוזר חלילה.
// התזמון וה-easing כולם ב-CSS (animations.css, "חינם → חינם לנצח!"), עם infinite: אין
// re-render של React במחזורים. כאן רק:
// - המבנה: השורה היא תמיד הצירוף המלא, כך שהמקום שמור ברוחבו ואין קפיצת layout;
// - מדידת --forever-shift (חצי רוחב "לנצח!" + חצי הרווח — foreverShift), מחדש בכל שינוי
//   גודל (גופן שנטען, שבירת מסך);
// - play שמתחיל את הלולאה פעם אחת, אחרי שהספר סיים להיפתח (HeroEmblem);
// - עצירה (data-paused, ישירות על ה-DOM) מחוץ למסך, בלשונית מוסתרת, ובריחוף/פוקוס על
//   הגיבור (WCAG 2.2.2 — תוכן שזז מעל 5 שניות).
//
// נגישות: לקורא מסך — טקסט קבוע אחד ("חינם לנצח"), בלי aria-live ובלי הכרזות חוזרות;
// האנימציה עצמה aria-hidden. reduced-motion: אין לולאה — "חינם לנצח!" סטטי (CSS).

import { useEffect, useRef, type CSSProperties } from 'react'
import { foreverShift, shouldPauseTagline } from './foreverTaglineLogic'

const FIRST = 'חינם'
const FINAL = 'לנצח!'

function useForeverShift(lineRef: React.RefObject<HTMLSpanElement | null>, finalRef: React.RefObject<HTMLSpanElement | null>) {
  useEffect(() => {
    const line = lineRef.current
    const final = finalRef.current
    if (!line || !final) return
    // offsetWidth — רוחב ה-layout, בלי ה-transform של האנימציה
    const measure = () => {
      const gap = parseFloat(getComputedStyle(line).columnGap) || 0
      line.style.setProperty('--forever-shift', `${foreverShift(final.offsetWidth, gap)}px`)
    }
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(final)
    return () => observer?.disconnect()
  }, [lineRef, finalRef])
}

function usePauseWhenIdle(play: boolean, ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = ref.current
    if (!play || !element) return
    const region = element.closest('section') ?? element
    const state = { inView: true, hidden: document.hidden, hovered: false, focused: false }
    const apply = () => element.toggleAttribute('data-paused', shouldPauseTagline(state))

    const observer = typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver(([entry]) => { state.inView = entry.isIntersecting; apply() })
    observer?.observe(element)
    const onVisibility = () => { state.hidden = document.hidden; apply() }
    const onEnter = () => { state.hovered = true; apply() }
    const onLeave = () => { state.hovered = false; apply() }
    const onFocusIn = () => { state.focused = true; apply() }
    const onFocusOut = (event: FocusEvent) => {
      state.focused = region.contains(event.relatedTarget as Node | null)
      apply()
    }
    document.addEventListener('visibilitychange', onVisibility)
    region.addEventListener('pointerenter', onEnter)
    region.addEventListener('pointerleave', onLeave)
    region.addEventListener('focusin', onFocusIn)
    region.addEventListener('focusout', onFocusOut as EventListener)
    apply()

    return () => {
      observer?.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      region.removeEventListener('pointerenter', onEnter)
      region.removeEventListener('pointerleave', onLeave)
      region.removeEventListener('focusin', onFocusIn)
      region.removeEventListener('focusout', onFocusOut as EventListener)
    }
  }, [play, ref])
}

export default function ForeverTagline({ play, className = '' }: { play: boolean; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const lineRef = useRef<HTMLSpanElement>(null)
  const finalRef = useRef<HTMLSpanElement>(null)
  useForeverShift(lineRef, finalRef)
  usePauseWhenIdle(play, ref)

  return (
    <p ref={ref} className={`text-center text-[1.75rem] leading-none lg:text-[2.125rem] 2xl:text-[2.5rem] short:lg:text-[1.875rem] ${className}`} data-state={play ? 'play' : 'idle'}>
      <span className="sr-only">{FIRST} {FINAL.replace('!', '')}</span>
      {/* השורה המלאה, ממורכזת — "חינם" ראשון ב-DOM, ולכן ב-RTL מימין ל"לנצח!" */}
      <span ref={lineRef} aria-hidden="true" className="forever-line inline-flex items-baseline gap-x-[0.28em] whitespace-nowrap">
        <span className="forever-first inline-block font-medium text-on-surface-variant">{FIRST}</span>
        <span ref={finalRef} className="forever-final relative inline-block pb-2 font-display font-bold text-primary" data-testid="forever-final">
          {Array.from(FINAL).map((letter, index) => (
            <span key={index} className="forever-letter" style={{ '--i': index } as CSSProperties}>{letter}</span>
          ))}
          {/* קו זהב דק, ברוח קישוט הכותרת (.title-ornament) */}
          <span className="forever-underline absolute inset-x-[4%] bottom-0 h-[2px] rounded-full bg-[linear-gradient(90deg,transparent,var(--color-glow)_25%,var(--color-glow)_75%,transparent)]" />
        </span>
      </span>
    </p>
  )
}
