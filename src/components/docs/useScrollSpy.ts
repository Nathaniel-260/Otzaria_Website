'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { anchorId, lastHeadingAbove, pickActiveHeading } from './scrollSpy'

/** ברירת המחדל לגובה הכותרת הדביקה — כמו scroll-mt-24 של הכותרות (proseClasses) */
const FALLBACK_OFFSET = 96

/**
 * scroll-spy לתוכן העניינים: האינדקס (ב-ids) של הסעיף שהקורא נמצא בו (בראש הדף — הראשון;
 * -1 רק לפני שהמדידה הראשונה רצה).
 * IntersectionObserver בלבד — בלי מאזין scroll: רצועה בראש המסך (מתחת לכותרת הדביקה, עד 40%
 * מגובהו) קובעת את הסעיף (ראו scrollSpy.ts), ו-[data-docs-end] בסוף המאמר מסמן סעיפים קצרים
 * בסוף הדף שלא יגיעו לרצועה.
 *
 * select(index) — לחיצה בתוכן העניינים: מסמן מיד, ומקפיא את ה-spy עד שהקפיצה נגמרת (scrollend),
 * כדי שסעיף קצר שאליו קפצו לא "יברח" לסעיף שלפניו.
 */
export function useScrollSpy(ids: readonly string[]) {
  const [active, setActive] = useState(-1)
  const currentRef = useRef(-1)
  const lockRef = useRef(false)
  const releaseRef = useRef<(() => void) | null>(null)
  const key = ids.join('\n')

  // לפני הכותרת הראשונה (ראש הדף) — הסעיף הראשון מסומן, כדי שתמיד יהיה סימון "אתם כאן"
  const commit = useCallback((raw: number) => {
    const index = Math.max(0, raw)
    if (index === currentRef.current) return
    currentRef.current = index
    setActive(index)
  }, [])

  const select = useCallback(
    (index: number) => {
      releaseRef.current?.()
      commit(index)
      lockRef.current = true
      const release = () => {
        lockRef.current = false
        window.removeEventListener('scrollend', release)
        window.clearTimeout(timer)
        if (releaseRef.current === release) releaseRef.current = null
      }
      window.addEventListener('scrollend', release)
      // דפדפן בלי scrollend, או קפיצה שלא גללה (היעד כבר במקום)
      const timer = window.setTimeout(release, 1000)
      releaseRef.current = release
    },
    [commit]
  )

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const list = key ? key.split('\n') : []
    const headings = list.map((id) => document.getElementById(id))
    const present = headings.filter((el): el is HTMLElement => el !== null)
    if (present.length === 0) return

    const offset = parseFloat(getComputedStyle(present[0]).scrollMarginTop) || FALLBACK_OFFSET
    const tops = () => headings.map((el) => (el ? el.getBoundingClientRect().top : Number.POSITIVE_INFINITY))
    const inBand = new Set<number>()
    let atEnd = false

    const update = (exitedBelow: number[] = []) => {
      if (lockRef.current) return
      let next = pickActiveHeading(currentRef.current, { inBand: [...inBand], exitedBelow })
      // סוף המאמר גלוי: גם סעיף קצר שכותרתו בחצי העליון של המסך נחשב נוכחי
      if (atEnd) next = Math.max(next, lastHeadingAbove(tops(), window.innerHeight / 2))
      commit(next)
    }

    // מצב פתיחה: קפיצה לעוגן מה-URL, או רענון באמצע הדף
    commit(lastHeadingAbove(tops(), offset + 1))

    const band = new IntersectionObserver(
      (entries) => {
        const exitedBelow: number[] = []
        for (const entry of entries) {
          const index = headings.indexOf(entry.target as HTMLElement)
          if (entry.isIntersecting) {
            inBand.add(index)
          } else {
            inBand.delete(index)
            if (entry.rootBounds && entry.boundingClientRect.top >= entry.rootBounds.bottom) exitedBelow.push(index)
          }
        }
        update(exitedBelow)
      },
      { rootMargin: `-${Math.round(offset)}px 0px -60% 0px` }
    )
    present.forEach((el) => band.observe(el))

    const end = document.querySelector('[data-docs-end]')
    const endObserver = new IntersectionObserver(([entry]) => {
      atEnd = entry.isIntersecting
      update()
    })
    if (end) endObserver.observe(end)

    // חזרה/קדימה בדפדפן בין עוגנים
    const onHash = () => {
      const index = list.indexOf(anchorId(window.location.hash))
      if (index !== -1) commit(index)
    }
    window.addEventListener('hashchange', onHash)

    return () => {
      band.disconnect()
      endObserver.disconnect()
      window.removeEventListener('hashchange', onHash)
    }
  }, [key, commit])

  return { active, select }
}

