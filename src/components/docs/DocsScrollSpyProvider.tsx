'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { anchorId } from './scrollSpy'
import { useScrollSpy } from './useScrollSpy'
import type { TocItem } from './docsNav'

type ScrollSpy = ReturnType<typeof useScrollSpy>

const ScrollSpyContext = createContext<ScrollSpy | null>(null)

/**
 * scroll-spy אחד לדף (IntersectionObserver אחד), משותף לשתי תצוגות תוכן העניינים — הרשימה בסרגל
 * והמקפל בנייד (DocsLayout מרנדר את שתיהן). בלי ספק (שימוש עצמאי ב-DocsTocLinks) — כל רשימה
 * מפעילה spy משלה.
 */
export function DocsScrollSpyProvider({ items, children }: { items: TocItem[]; children: ReactNode }) {
  const ids = useMemo(() => items.map((item) => anchorId(item.href)), [items])
  const spy = useScrollSpy(ids)
  const value = useMemo(() => spy, [spy.active, spy.select]) // eslint-disable-line react-hooks/exhaustive-deps -- spy הוא אובייקט חדש בכל רינדור
  return <ScrollSpyContext.Provider value={value}>{children}</ScrollSpyContext.Provider>
}

export function useSharedScrollSpy(): ScrollSpy | null {
  return useContext(ScrollSpyContext)
}
