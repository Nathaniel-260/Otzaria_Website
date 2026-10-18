'use client'

// דף תוצאות החיפוש החכם (ראו docs/PLUGIN_STORE_REDESIGN_PLAN.md סעיף 7.4):
// נטען עם ?q= מה-URL (שיתופי), עריכה מריצה חיפוש מחדש (debounce 300ms + עדכון URL),
// רשימה אנכית לפי סדר הדירוג עם הדגשת מונחים, צ'יפי קטגוריות מקושרים,
// כפתורי הורדה/התקנה-ישירה ו"טען עוד" לפי offset.
//
// ביצועים: השאילתה מה-URL ועמוד התוצאות הראשון מגיעים כ-props מה-Server
// Component (page.tsx), כך שהתוצאות נמצאות ב-HTML הראשוני. קודם הדף היה
// סטטי עם useSearchParams — ה-HTML הכיל ספינר בלבד, ואחרי ה-hydration נשלחה
// בקשת חיפוש (מפל: HTML → JS → API → תמונות). initialResults=null (שגיאה או
// הגבלת קצב בשרת) → החיפוש הראשון נשלח מהדפדפן כמו קודם.
//
// עדכון ה-URL בזמן הקלדה נעשה ב-window.history.replaceState (שמשולב בנתב של
// Next) ולא ב-router.replace: הדף דינמי עכשיו, ו-router.replace היה מרנדר
// אותו מחדש בשרת בכל הקשה (חיפוש כפול, וצריכת אסימוני rate limit).

import { useState, useEffect, useRef } from 'react'
import { useDirectInstall } from '@/components/plugins/useDirectInstall'
import { useDialog } from '@/components/providers/DialogContext'
import StorePageHeader from '@/components/plugins/StorePageHeader'
import PluginResultRow, { PluginResultRowSkeleton } from '@/components/plugins/listing/PluginResultRow'
import { fieldClasses, fieldIconClasses } from '@/components/plugins/listing/fieldStyles'
import AppIcon from '@/components/ui/AppIcon'
import Button from '@/components/ui/Button'
import Chip from '@/components/ui/Chip'
import EmptyState from '@/components/ui/EmptyState'
import Section from '@/components/ui/Section'
import type { PluginSearchResult, PluginCategorySummary } from '@/components/plugins/types'
import { SEARCH_PAGE_SIZE, type PluginSearchResponse } from './searchConfig'

const SEARCH_DEBOUNCE_MS = 300
const PAGE_SIZE = SEARCH_PAGE_SIZE

interface PluginSearchClientProps {
  initialQuery: string
  initialResults: PluginSearchResponse | null
}

// עדכון ה-URL בלי ניווט (ראו ההערה בראש הקובץ)
function replaceUrl(url: string) {
  window.history.replaceState(null, '', url)
}

export default function PluginSearchClient({ initialQuery, initialResults }: PluginSearchClientProps) {
  const [inputValue, setInputValue] = useState(initialQuery)
  const [executedQuery, setExecutedQuery] = useState(() =>
    initialResults ? initialResults.query || initialQuery.trim() : ''
  )
  const [results, setResults] = useState<PluginSearchResult[]>(() =>
    initialResults && Array.isArray(initialResults.results) ? initialResults.results : []
  )
  const [total, setTotal] = useState(initialResults?.total || 0)
  const [relaxed, setRelaxed] = useState(initialResults?.relaxed === true)
  const [searching, setSearching] = useState(!initialResults && Boolean(initialQuery.trim()))
  const [loadingMore, setLoadingMore] = useState(false)
  const [categories, setCategories] = useState<PluginCategorySummary[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const firstRunRef = useRef(true)
  // החיפוש הבא יישלח מיד (בלי debounce ובלי עדכון URL) — לשחזור מה-history
  const immediateRef = useRef(false)
  // השאילתה העדכנית — תשובה של בקשה ישנה שאינה תואמת אותה נזרקת (מניעת race)
  const currentQueryRef = useRef(initialQuery.trim())
  const { showAlert } = useDialog() as { showAlert: (title: string, message: string) => void }
  const { installState, install } = useDirectInstall(showAlert)

  const trimmedInput = inputValue.trim()

  // קטגוריות להצעה במצב אפס-תוצאות (עד 3)
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch('/api/plugins/categories')
        if (!response.ok) return
        const data = await response.json()
        if (Array.isArray(data)) setCategories(data)
      } catch {
        // לא קריטי — פשוט לא יוצגו הצעות קטגוריה
      }
    }
    loadCategories()
  }, [])

  // שינוי בתיבה: ביטול מיידי של בקשה באוויר (שתשובתה כבר לא רלוונטית);
  // ריקון מנקה את התוצאות מיד, שינוי אמיתי מדליק מצב "מחפש"
  const handleInputChange = (next: string) => {
    setInputValue(next)
    const nextTrimmed = next.trim()
    currentQueryRef.current = nextTrimmed
    if (nextTrimmed !== trimmedInput) {
      abortRef.current?.abort()
    }
    if (!nextTrimmed) {
      setResults([])
      setTotal(0)
      setRelaxed(false)
      setExecutedQuery('')
      setSearching(false)
      replaceUrl('/plugins/search')
    } else if (nextTrimmed !== trimmedInput) {
      setSearching(true)
    }
  }

  // חיפוש עם debounce + עדכון ה-URL (replace) כדי שהקישור יישאר שיתופי.
  // בטעינה ראשונה עם ?q= — חיפוש מיידי בלי debounce ובלי עדכון URL.
  useEffect(() => {
    const isFirstRun = firstRunRef.current
    firstRunRef.current = false
    const immediate = isFirstRun || immediateRef.current
    immediateRef.current = false
    if (!trimmedInput) return
    // עמוד התוצאות הראשון כבר רונדר בשרת
    if (isFirstRun && initialResults) return

    const timer = setTimeout(async () => {
      if (!immediate) {
        replaceUrl(`/plugins/search?q=${encodeURIComponent(trimmedInput)}`)
      }
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      const requestQuery = trimmedInput
      try {
        const response = await fetch(
          `/api/plugins/search?q=${encodeURIComponent(requestQuery)}&limit=${PAGE_SIZE}&offset=0`,
          { signal: controller.signal }
        )
        // תשובה שהגיעה אחרי שהקלט השתנה — נזרקת (הבקשה העדכנית כבר בדרך)
        if (controller.signal.aborted || requestQuery !== currentQueryRef.current) return
        if (!response.ok) {
          setSearching(false)
          return
        }
        const data = await response.json()
        if (requestQuery !== currentQueryRef.current) return
        setResults(Array.isArray(data.results) ? data.results : [])
        setTotal(data.total || 0)
        setRelaxed(data.relaxed === true)
        setExecutedQuery(data.query || trimmedInput)
        setSearching(false)
      } catch (error) {
        // בקשה שבוטלה — החיפוש הבא כבר בדרך; שגיאת רשת — מפסיקים את מצב הטעינה
        if ((error as Error)?.name !== 'AbortError') setSearching(false)
      }
    }, immediate ? 0 : SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmedInput])

  // חזרה לדף ב-Back/Forward: ה-URL כבר עודכן בזמן ההקלדה (replaceState), אבל
  // הנתב משחזר את הרינדור השמור מהשרת — עם השאילתה המקורית של הדף. כמו קודם
  // (כשהשאילתה נקראה מ-useSearchParams), הקובע הוא ה-URL: אם הוא שונה מה-props,
  // התיבה מתעדכנת לפיו והחיפוש נשלח מיד.
  useEffect(() => {
    const urlQuery = new URLSearchParams(window.location.search).get('q') || ''
    if (urlQuery === initialQuery) return
    if (urlQuery.trim() !== initialQuery.trim()) immediateRef.current = true
    handleInputChange(urlQuery)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // "טען עוד" — המשך התוצאות לפי offset
  const loadMore = async () => {
    if (loadingMore || !executedQuery) return
    setLoadingMore(true)
    const requestQuery = executedQuery
    try {
      const response = await fetch(
        `/api/plugins/search?q=${encodeURIComponent(requestQuery)}&limit=${PAGE_SIZE}&offset=${results.length}`
      )
      if (!response.ok) return
      const data = await response.json()
      // הקלט השתנה בזמן הטעינה — לא מצרפים תוצאות של השאילתה הישנה
      if (requestQuery !== currentQueryRef.current) return
      if (Array.isArray(data.results)) {
        setResults(prev => [...prev, ...data.results])
        setTotal(data.total || 0)
      }
    } catch (error) {
      console.error('Error loading more results:', error)
    } finally {
      setLoadingMore(false)
    }
  }

  const hasQuery = Boolean(trimmedInput)
  const showZeroResults = hasQuery && !searching && executedQuery && results.length === 0
  const titleId = 'plugin-search-title'

  return (
    <div className="flex flex-1 flex-col">

      <main id="main-content" className="flex-1">
        <StorePageHeader
          titleId={titleId}
          container="narrow"
          breadcrumbs={[{ label: 'חנות התוספים', href: '/plugins' }, { label: 'חיפוש' }]}
          title="חיפוש תוספים"
        >
          {/* לא PluginSearchBox: כאן אין הצעות — התוצאות עצמן מתעדכנות מתחת (debounce משלו).
              השם הנגיש — כותרת העמוד ("חיפוש תוספים"), שצמודה לשדה */}
          <div className="relative">
            <AppIcon name="search" className={fieldIconClasses('lg', 'start')} />
            <input
              type="search"
              aria-labelledby={titleId}
              enterKeyHint="search"
              placeholder="חפש תוסף לפי שם, תיאור או נושא..."
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              autoFocus={!initialQuery}
              className={fieldClasses({ size: 'lg', withIcon: true })}
            />
          </div>
        </StorePageHeader>

        {/* Results */}
        <Section spacing="none" container="narrow" className="pb-14 md:pb-20">
          {!hasQuery ? (
            <EmptyState
              icon="search"
              title="מה מחפשים?"
              description="הקלד למעלה שם תוסף, תיאור או נושא — התוצאות יופיעו כאן מיד."
            />
          ) : searching && results.length === 0 ? (
            // שלד טעינה — שורות באותו מבנה כמו שורת תוצאה
            <div role="status">
              <span className="sr-only">טוען...</span>
              <div className="flex flex-col gap-3 md:gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <PluginResultRowSkeleton key={i} />
                ))}
              </div>
            </div>
          ) : showZeroResults ? (
            <EmptyState
              role="status"
              icon="search_off"
              title={<>לא נמצאו תוספים עבור &apos;{executedQuery}&apos;</>}
              description="נסה ניסוח אחר, או עיין ברשימה המלאה של כל התוספים."
              actions={
                <Button href="/plugins/all" variant="tonal" iconEnd="chevron_left">
                  לכל התוספים
                </Button>
              }
            >
              {categories.length > 0 && (
                <div className="border-t border-outline-variant pt-6">
                  <p className="mb-3 text-label-md text-on-surface-variant">או עיין לפי קטגוריה:</p>
                  <div className="flex flex-wrap justify-center gap-x-2 gap-y-2.5">
                    {categories.slice(0, 3).map(category => (
                      <Chip
                        key={category.id}
                        href={`/plugins/category/${category.slug}`}
                        icon={category.icon || undefined}
                        count={category.pluginCount}
                      >
                        {category.name}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
            </EmptyState>
          ) : (
            <>
              {/* מונה תוצאות — שורה שקטה מעל הרשימה; מוכרז בכל חיפוש */}
              {executedQuery && (
                <div className="mb-5 md:mb-6" aria-live="polite">
                  <p className="text-body-md text-on-surface-variant">
                    נמצאו <span className="font-bold text-on-surface tabular-nums">{total.toLocaleString('he-IL')}</span> תוספים עבור &apos;<span className="text-on-surface">{executedQuery}</span>&apos;
                  </p>
                  {relaxed && (
                    <p className="mt-1 text-body-sm text-on-surface-variant">
                      לא נמצאו התאמות מדויקות לכל המילים — תוצאות קרובות:
                    </p>
                  )}
                </div>
              )}

              {/* רשימה אנכית — סדר הדירוג חשוב */}
              <ol aria-labelledby={titleId} aria-busy={searching || undefined} className="flex flex-col gap-3 md:gap-4">
                {results.map((plugin, resultIndex) => (
                  <li key={plugin.id}>
                    <PluginResultRow
                      plugin={plugin}
                      query={executedQuery}
                      installState={installState}
                      onInstall={install}
                      // התוצאה הראשונה (בדרך כלל ה-LCP) — מיד ובעדיפות גבוהה, לא lazy
                      priority={resultIndex === 0}
                    />
                  </li>
                ))}
              </ol>

              {/* טען עוד */}
              {results.length < total && (
                <div className="mt-8 flex justify-center">
                  <Button variant="tonal" onClick={loadMore} loading={loadingMore}>
                    {loadingMore ? 'טוען...' : `טען עוד (${(total - results.length).toLocaleString('he-IL')} נוספים)`}
                  </Button>
                </div>
              )}
            </>
          )}
        </Section>
      </main>
    </div>
  )
}
