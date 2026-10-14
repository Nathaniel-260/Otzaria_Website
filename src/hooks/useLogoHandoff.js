'use client'

import { useEffect } from 'react'
import { computeHandoffGeometry, handoffFrame, FLYER_TO_LOGO_SCALE } from '@/lib/logoHandoff'

// useLogoHandoff — מחבר את משבצת הלוגו שבכותרת לספר הגדול שבמסך הפתיחה (דף הבית בלבד).
//
// שני מסלולים, אותה גיאומטריה (src/lib/logoHandoff.js):
// 1. דפדפן עם CSS scroll-driven animations (Chrome/Edge, Safari 26): ה-hook רק מודד
//    ושומר את התוצאה כמשתני CSS על <html> (data-logo-handoff="css"). כל התנועה עצמה —
//    keyframes ב-animations.css עם animation-timeline: scroll(root) — רצה ב-compositor,
//    בלי JS בכל פריים ובלי layout.
// 2. אחרת (Firefox): data-logo-handoff="js" — מאזין גלילה פסיבי שכותב transform/opacity
//    פעם אחת בכל requestAnimationFrame.
// מדידה מחדש בשינוי גודל החלון, בשינוי גודל של הספר או של אחד ממכליו (שבירות מסך, טעינת
// גופנים, נתונים שנטענים בסטרימינג), ואחרי טעינת הגופנים.

export const LOGO_HANDOFF_SOURCE_ATTR = 'data-logo-handoff-source'

const CSS_VARS = {
  dx: '--logo-handoff-dx',
  dy: '--logo-handoff-dy',
  size: '--logo-handoff-size',
  restScale: '--logo-handoff-rest',
  end: '--logo-handoff-end',
  exit: '--logo-handoff-exit'
}
// מרכז הספר ביחס לראש המלווה — ה-transform-origin שלו, כדי שיתכווץ סביב אותה נקודה כמו המעופף
const FOLLOW_ORIGIN_VAR = '--logo-handoff-follow-oy'

function supportsScrollTimeline() {
  return typeof CSS !== 'undefined' && typeof CSS.supports === 'function' &&
    CSS.supports('animation-timeline: scroll()')
}

function prefersReducedMotion() {
  return typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * @param {{ enabled: boolean, slotRef: import('react').RefObject<HTMLElement|null>,
 *           flyerRef: import('react').RefObject<HTMLElement|null>,
 *           wordmarkRef: import('react').RefObject<HTMLElement|null> }} params
 */
export default function useLogoHandoff({ enabled, slotRef, flyerRef, wordmarkRef }) {
  useEffect(() => {
    if (!enabled) return
    const slot = slotRef.current
    const flyer = flyerRef.current
    const wordmark = wordmarkRef.current
    const source = document.querySelector(`[${LOGO_HANDOFF_SOURCE_ATTR}]`)
    const root = document.documentElement
    if (!slot || !flyer) return

    // אין ספר בדף (למשל שגיאה ברינדור הגיבור) — לוגו רגיל
    if (!source) {
      root.setAttribute('data-logo-handoff', 'off')
      return () => root.removeAttribute('data-logo-handoff')
    }

    // ההילה שמאחורי הספר — עולה ומתכווצת איתו (כמו השורה), ודועכת לפני שהוא נוחת בכותרת
    const glows = Array.from(document.querySelectorAll('[data-logo-handoff-glow]'))
    // השורה שמתחת לספר ("חינם לנצח!") — עולה איתו כיחידה אחת ודועכת בדרך
    const followers = Array.from(document.querySelectorAll('[data-logo-handoff-follow]'))
    // הספר עצמו (GoldenBook) — המקור הוא העטיפה שבתוכו; offsetTop של שניהם יחסי לאותו הורה
    const bookBox = source.parentElement
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
      for (const el of glows) {
        el.style.transform = f.followTransform
        el.style.opacity = String(f.glowOpacity)
      }
      for (const el of followers) {
        el.style.transform = f.followTransform
        el.style.opacity = String(f.followOpacity)
      }
      if (wordmark) wordmark.style.opacity = String(f.wordmarkOpacity)
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(paint) }

    const measure = () => {
      geometry = computeHandoffGeometry({
        source: source.getBoundingClientRect(),
        target: slot.getBoundingClientRect(),
        scrollY: window.scrollY,
        targetScale: FLYER_TO_LOGO_SCALE
      })
      if (!geometry) return
      for (const [key, name] of Object.entries(CSS_VARS)) {
        root.style.setProperty(name, key === 'restScale' ? String(geometry[key]) : `${geometry[key]}px`)
      }
      // offsetTop ולא getBoundingClientRect: הוא מתעלם מה-transform שהמלווה כבר מקבל באמצע גלילה
      const follower = followers[0]
      if (follower && bookBox && follower.offsetParent === bookBox.offsetParent) {
        const originY = bookBox.offsetTop + bookBox.offsetHeight / 2 - follower.offsetTop
        root.style.setProperty(FOLLOW_ORIGIN_VAR, `${originY}px`)
      }
      root.setAttribute('data-logo-handoff', useCss ? 'css' : 'js')
      schedule()
    }

    measure()
    window.addEventListener('resize', measure)
    if (!useCss) window.addEventListener('scroll', schedule, { passive: true })
    reducedQuery?.addEventListener?.('change', schedule)

    // הספר ממורכז אנכית מול עמודת הטקסט, ולכן גם שינוי גובה של מכל (גופן שנטען, נתון
    // שהגיע בסטרימינג) מזיז אותו — צופים בכל השרשרת עד <main>
    let resizeObserver = null
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(measure)
      for (let el = source; el && el !== document.body; el = el.parentElement) {
        resizeObserver.observe(el)
        if (el.tagName === 'MAIN') break
      }
    }
    document.fonts?.ready?.then(measure).catch(() => {})

    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', schedule)
      reducedQuery?.removeEventListener?.('change', schedule)
      resizeObserver?.disconnect()
      if (frame) cancelAnimationFrame(frame)
      root.removeAttribute('data-logo-handoff')
      for (const name of [...Object.values(CSS_VARS), FOLLOW_ORIGIN_VAR]) root.style.removeProperty(name)
      for (const el of [flyer, source, wordmark, ...glows, ...followers]) {
        if (el) { el.style.removeProperty('transform'); el.style.removeProperty('opacity') }
      }
    }
  }, [enabled, slotRef, flyerRef, wordmarkRef])
}
