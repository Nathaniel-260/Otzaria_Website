'use client'

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import dynamic from 'next/dynamic'
import AppIcon from '@/components/ui/AppIcon'
import { cx } from '@/components/ui/cx'
import { FOCUS_RING, FOCUS_RING_INSET } from '@/components/ui/focusRing'
import { REDUCED_MOTION_QUERY } from '@/lib/reducedMotion'
import {
  AUTOPLAY_INTERVAL_MS,
  MAX_DOTS,
  isAutoplayActive,
  slideLabel,
  slidesToLoad,
  stepIndex,
  swipeStep
} from './carouselModel'

// התצוגה המוגדלת נטענת רק בלחיצה
const ScreenshotLightbox = dynamic(() => import('./ScreenshotLightbox'), { ssr: false })

/**
 * קרוסלת צילומי המסך בראש עמוד התוסף (בלי ספרייה חיצונית — מסילה עם transform).
 *
 *   ┌──────────────────────────────┐
 *   │ ‹          [תמונה]         › │  ← מסגרת ביחס קבוע 16/10, התמונה object-contain על משטח —
 *   └──────────────────────────────┘    בלי קפיצת פריסה, גם כשיחס התמונות משתנה
 *          • ━ • • • •           ⏸     ← נקודות (או "3 / 14" מעל 10 תמונות) + השהיה/הפעלה
 *
 * - לחיצה על התמונה פותחת את התצוגה המוגדלת (ScreenshotLightbox), שממשיכה מאותה תמונה.
 * - חצים: "הקודם" בצד ההתחלה (ימין), "הבא" בצד הסוף (שמאל); בנייד — גם החלקה באצבע.
 * - מעבר אוטומטי כל 5 שניות (carouselModel.isAutoplayActive): נעצר ב-hover, בפוקוס בתוך הקרוסלה,
 *   בטאב מוסתר, מחוץ למסך (IntersectionObserver), כשהתצוגה המוגדלת פתוחה ובכפתור (WCAG 2.2.2).
 *   ב-prefers-reduced-motion — אין מעבר אוטומטי (וגם אין כפתור), והמעבר בין תמונות מיידי.
 * - נגישות (APG Carousel): section עם aria-roledescription="carousel"; כל שקופית group/"slide" עם
 *   "תמונה X מתוך N"; שקופיות מוסתרות inert; aria-live="off" בזמן ניגון ו-polite בניווט ידני.
 * - ביצועים: רק התמונה הראשונה (והבאה בתור) מקבלות src; כל השאר — כשמגיעים אליהן.
 * - תמונה אחת: בלי פקדים ובלי מעבר. אפס: לא מרנדר דבר.
 * - רשימה שהתחלפה (למשל אחרי עריכה בעמוד) — הקרוסלה מתחילה מחדש: key לפי התוכן מאפס את המיקום,
 *   התמונות שנטענו והשבורות, שהיו שייכים לרשימה הקודמת. אותו תוכן במערך חדש — בלי איפוס.
 */
type CarouselProps = {
  screenshots: string[]
  className?: string
}

export default function ScreenshotCarousel(props: CarouselProps) {
  return <Carousel key={props.screenshots.join('\n')} {...props} />
}

function Carousel({ screenshots, className }: CarouselProps) {
  const count = screenshots.length
  const multiple = count > 1
  const [index, setIndex] = useState(0)
  const [seen, setSeen] = useState<Set<number>>(() => new Set([0]))
  const [playing, setPlaying] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focusWithin, setFocusWithin] = useState(false)
  const [documentHidden, setDocumentHidden] = useState(false)
  const [inView, setInView] = useState(true)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [broken, setBroken] = useState<Set<number>>(() => new Set())
  const rootRef = useRef<HTMLElement>(null)
  const slideButtons = useRef<Array<HTMLButtonElement | null>>([])
  const pointerStart = useRef<{ x: number; y: number } | null>(null)
  const suppressClick = useRef(false)
  const refocusAfterLightbox = useRef(false)

  const active = isAutoplayActive({
    playing, reducedMotion, count, hovered, focusWithin, documentHidden, inView, lightboxOpen
  })

  const goTo = useCallback((next: number) => {
    setIndex(next)
    setSeen((prev) => (prev.has(next) ? prev : new Set(prev).add(next)))
  }, [])

  // prefers-reduced-motion — גם שינוי בזמן הצפייה
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined
    const query = window.matchMedia(REDUCED_MOTION_QUERY)
    const update = () => setReducedMotion(query.matches)
    update()
    query.addEventListener?.('change', update)
    return () => query.removeEventListener?.('change', update)
  }, [])

  // טאב מוסתר
  useEffect(() => {
    const update = () => setDocumentHidden(document.visibilityState === 'hidden')
    update()
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])

  // מחוץ למסך
  useEffect(() => {
    const node = rootRef.current
    if (!node || typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.4 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  // המעבר האוטומטי — טיימר חדש אחרי כל מעבר (גם ידני), כך שתמונה שנבחרה מקבלת 5 שניות מלאות
  useEffect(() => {
    if (!active) return undefined
    const timer = setTimeout(() => goTo(stepIndex(index, 1, count)), AUTOPLAY_INTERVAL_MS)
    return () => clearTimeout(timer)
  }, [active, index, count, goTo])

  // אחרי סגירת התצוגה המוגדלת — הפוקוס חוזר לתמונה הנוכחית (ייתכן שאינה זו שנפתחה)
  useEffect(() => {
    if (lightboxOpen || !refocusAfterLightbox.current) return
    refocusAfterLightbox.current = false
    slideButtons.current[index]?.focus({ preventScroll: true })
  }, [lightboxOpen, index])

  if (count === 0) return null

  const loaded = slidesToLoad(index, count, seen)
  const showDots = count <= MAX_DOTS

  const onPointerDown = (event: ReactPointerEvent) => {
    if (event.pointerType === 'mouse') return
    pointerStart.current = { x: event.clientX, y: event.clientY }
  }
  const onPointerUp = (event: ReactPointerEvent) => {
    const from = pointerStart.current
    pointerStart.current = null
    if (!from || !multiple) return
    const step = swipeStep(event.clientX - from.x, event.clientY - from.y)
    if (step !== 0) {
      suppressClick.current = true
      goTo(stepIndex(index, step, count))
    }
  }

  return (
    <section
      ref={rootRef}
      aria-roledescription="carousel"
      aria-label="צילומי מסך"
      className={cx('min-w-0', className)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocusWithin(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocusWithin(false)
      }}
    >
      <div className="relative">
        <div
          className="relative aspect-[16/10] touch-pan-y overflow-hidden rounded-(--card-radius) bg-surface-container ring-1 ring-outline-variant"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => { pointerStart.current = null }}
        >
          <div
            aria-live={active ? 'off' : 'polite'}
            data-testid="carousel-track"
            // RTL: השקופית הבאה יושבת משמאל — הזזה חיובית (ימינה) מביאה אותה
            style={{ transform: `translateX(${index * 100}%)` }}
            className="flex h-full transition-transform duration-(--motion-duration-emphasis) ease-(--ease-standard) motion-reduce:transition-none"
          >
            {screenshots.map((src, i) => {
              const current = i === index
              return (
                <div
                  key={i}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={slideLabel(i, count)}
                  aria-hidden={!current || undefined}
                  inert={!current}
                  className="h-full w-full shrink-0"
                >
                  <button
                    ref={(node) => { slideButtons.current[i] = node }}
                    type="button"
                    aria-label={`צילום מסך ${i + 1}`}
                    onClick={() => {
                      if (suppressClick.current) {
                        suppressClick.current = false
                        return
                      }
                      setLightboxOpen(true)
                    }}
                    className={cx('group/shot relative flex size-full cursor-zoom-in items-center justify-center', FOCUS_RING_INSET)}
                  >
                    {broken.has(i) || !loaded.has(i) ? (
                      broken.has(i) && <AppIcon name="image" className="text-5xl text-on-surface-variant" />
                    ) : (
                      <img
                        src={src}
                        alt=""
                        loading={i === 0 ? 'eager' : undefined}
                        decoding="async"
                        draggable={false}
                        onError={() => setBroken((prev) => new Set(prev).add(i))}
                        className="size-full object-contain"
                      />
                    )}
                    <span
                      aria-hidden="true"
                      className="absolute bottom-2 end-2 flex size-9 items-center justify-center rounded-full bg-surface/85 text-on-surface opacity-0 shadow-(--card-raised-shadow) transition-opacity group-hover/shot:opacity-100 group-focus-visible/shot:opacity-100 motion-reduce:transition-none"
                    >
                      <AppIcon name="zoom_in" className="text-xl" />
                    </span>
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {multiple && (
          <>
            <ArrowButton side="prev" onClick={() => goTo(stepIndex(index, -1, count))} />
            <ArrowButton side="next" onClick={() => goTo(stepIndex(index, 1, count))} />
          </>
        )}
      </div>

      {multiple && (
        <div className="mt-2 flex min-h-(--touch-target) items-center justify-center gap-2">
          {showDots ? (
            <div className="flex items-center">
              {screenshots.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={slideLabel(i, count)}
                  aria-current={i === index ? 'true' : undefined}
                  onClick={() => goTo(i)}
                  className={cx('group/dot flex h-(--touch-target) w-7 items-center justify-center rounded-full', FOCUS_RING)}
                >
                  <span
                    aria-hidden="true"
                    className={cx(
                      'block h-2 rounded-full transition-[width,background-color] duration-(--motion-duration-standard) motion-reduce:transition-none',
                      i === index ? 'w-5 bg-primary' : 'w-2 bg-outline-variant group-hover/dot:bg-outline'
                    )}
                  />
                </button>
              ))}
            </div>
          ) : (
            <span className="text-label-md tabular-nums text-on-surface-variant">
              <span dir="ltr">{index + 1} / {count}</span>
            </span>
          )}

          {!reducedMotion && (
            <button
              type="button"
              onClick={() => setPlaying((value) => !value)}
              aria-label={playing ? 'השהיית המעבר האוטומטי' : 'הפעלת המעבר האוטומטי'}
              title={playing ? 'השהיית המעבר האוטומטי' : 'הפעלת המעבר האוטומטי'}
              className={cx(
                'flex size-(--touch-target) items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-selected hover:text-on-surface',
                FOCUS_RING
              )}
            >
              <AppIcon name={playing ? 'pause_circle' : 'play_circle'} className="text-2xl" />
            </button>
          )}
        </div>
      )}

      {lightboxOpen && (
        <ScreenshotLightbox
          screenshots={screenshots}
          index={index}
          onIndexChange={goTo}
          onClose={() => {
            refocusAfterLightbox.current = true
            setLightboxOpen(false)
          }}
        />
      )}
    </section>
  )
}

function ArrowButton({ side, onClick }: { side: 'prev' | 'next'; onClick: () => void }) {
  const prev = side === 'prev'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={prev ? 'הקודם' : 'הבא'}
      className={cx(
        'absolute top-1/2 flex size-(--touch-target) -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-on-surface shadow-(--card-raised-shadow) ring-1 ring-outline-variant transition-colors hover:bg-surface',
        prev ? 'start-2' : 'end-2',
        FOCUS_RING
      )}
    >
      <AppIcon name={prev ? 'chevron_right' : 'chevron_left'} className="text-2xl" />
    </button>
  )
}
