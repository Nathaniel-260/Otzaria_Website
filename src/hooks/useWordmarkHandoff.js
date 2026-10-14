'use client'

import { useEffect } from 'react'
import { computeHandoffGeometry, handoffFrame } from '@/lib/wordmarkHandoff'

// useWordmarkHandoff — מחבר את שם האתר שבכותרת העליונה למילה "אוצריא" שבכותרת הראשית של
// הגיבור (דף הבית בלבד). הלוגו עצמו קבוע בכותרת; רק המילה עוברת.
//
// שני מסלולים, אותה גיאומטריה (src/lib/wordmarkHandoff.js):
// 1. דפדפן עם CSS scroll-driven animations (Chrome/Edge, Safari 26): ה-hook רק מודד
//    ושומר את התוצאה כמשתני CSS על <html> (data-wordmark-handoff="css"). התנועה עצמה —
//    keyframes ב-animations.css עם animation-timeline: scroll(root) — רצה ב-compositor.
// 2. אחרת (Firefox): data-wordmark-handoff="js" — מאזין גלילה פסיבי שכותב transform/opacity
//    פעם אחת בכל requestAnimationFrame.
// מדידה מחדש בשינוי גודל החלון, בשינוי גודל של המילה או של אחד ממכליה (שבירות מסך, טעינת
// גופנים, נתונים שנטענים בסטרימינג), ואחרי טעינת הגופנים.

export const WORDMARK_HANDOFF_SOURCE_ATTR = 'data-wordmark-handoff-source'

const CSS_VARS = {
  dx: '--wordmark-handoff-dx',
  dy: '--wordmark-handoff-dy',
  restScale: '--wordmark-handoff-rest',
  end: '--wordmark-handoff-end'
}
// כמה מהר המילה עולה ביחס לדף (riseRatio ב-src/lib/wordmarkHandoff.js) — מוגדר על המקור
const RISE_VAR = '--wordmark-handoff-rise'
// גודל הגופן של המילה בגיבור — המעופף נכתב בגודל הזה ומוקטן, כדי להישאר חד
const FONT_SIZE_VAR = '--wordmark-handoff-font-size'

function supportsScrollTimeline() {
  return typeof CSS !== 'undefined' && typeof CSS.supports === 'function' &&
    CSS.supports('animation-timeline: scroll()')
}

function prefersReducedMotion() {
  return typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * @param {{ enabled: boolean, targetRef: import('react').RefObject<HTMLElement|null>,
 *           flyerRef: import('react').RefObject<HTMLElement|null> }} params
 *   targetRef — שם האתר הסטטי בכותרת (מקום הנחיתה), flyerRef — העותק שעובר.
 */
export default function useWordmarkHandoff({ enabled, targetRef, flyerRef }) {
  useEffect(() => {
    if (!enabled) return
    const target = targetRef.current
    const flyer = flyerRef.current
    const source = document.querySelector(`[${WORDMARK_HANDOFF_SOURCE_ATTR}]`)
    const root = document.documentElement
    if (!target || !flyer) return

    // אין כותרת ראשית בדף (למשל שגיאה ברינדור הגיבור) — שם אתר רגיל
    if (!source) {
      root.setAttribute('data-wordmark-handoff', 'off')
      return () => root.removeAttribute('data-wordmark-handoff')
    }

    // הקישוט שמתחת לכותרת — דועך עם עליית המילה (COMPANION_FADE_END)
    const companions = Array.from(document.querySelectorAll('[data-wordmark-handoff-companion]'))
    const useCss = supportsScrollTimeline()
    const reducedQuery = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null
    let geometry = null
    let frame = 0

    const paint = () => {
      frame = 0
      if (useCss) return
      const f = handoffFrame(geometry, window.scrollY, { reducedMotion: prefersReducedMotion() })
      flyer.style.transform = f.transform
      flyer.style.opacity = String(f.flyerOpacity)
      source.style.opacity = String(f.sourceOpacity)
      target.style.opacity = String(f.targetOpacity)
      for (const el of companions) el.style.opacity = String(f.companionOpacity)
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(paint) }

    const measure = () => {
      const sourceFontSize = parseFloat(getComputedStyle(source).fontSize)
      geometry = computeHandoffGeometry({
        source: source.getBoundingClientRect(),
        target: target.getBoundingClientRect(),
        scrollY: window.scrollY,
        sourceFontSize,
        targetFontSize: parseFloat(getComputedStyle(target).fontSize),
        // נקבע לפי הפריסה, ליד הכותרת עצמה (HeroSection)
        riseRatio: parseFloat(getComputedStyle(source).getPropertyValue(RISE_VAR)) || 1
      })
      if (!geometry) return
      for (const [key, name] of Object.entries(CSS_VARS)) {
        root.style.setProperty(name, key === 'restScale' ? String(geometry[key]) : `${geometry[key]}px`)
      }
      root.style.setProperty(FONT_SIZE_VAR, `${sourceFontSize}px`)
      root.setAttribute('data-wordmark-handoff', useCss ? 'css' : 'js')
      schedule()
    }

    measure()
    window.addEventListener('resize', measure)
    if (!useCss) window.addEventListener('scroll', schedule, { passive: true })
    reducedQuery?.addEventListener?.('change', schedule)

    // הכותרת ממורכזת אנכית בגיבור, ולכן גם שינוי גובה של מכל (גופן שנטען, נתון שהגיע
    // בסטרימינג) מזיז אותה — צופים בכל השרשרת עד <main>
    let resizeObserver = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(measure)
      for (let el = source; el && el !== document.body; el = el.parentElement) {
        resizeObserver.observe(el)
        if (el.tagName === 'MAIN') break
      }
      resizeObserver.observe(target)
    }
    document.fonts?.ready?.then(measure).catch(() => {})

    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', schedule)
      reducedQuery?.removeEventListener?.('change', schedule)
      resizeObserver?.disconnect()
      if (frame) cancelAnimationFrame(frame)
      root.removeAttribute('data-wordmark-handoff')
      for (const name of [...Object.values(CSS_VARS), FONT_SIZE_VAR]) root.style.removeProperty(name)
      for (const el of [flyer, source, target, ...companions]) {
        el.style.removeProperty('transform')
        el.style.removeProperty('opacity')
      }
    }
  }, [enabled, targetRef, flyerRef])
}
