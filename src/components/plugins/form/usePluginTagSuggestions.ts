'use client'

import { useCallback, useState } from 'react'
import { buildTagSuggestionPool } from '@/lib/pluginTags'
import type { TagCount } from '@/components/plugins/listing/TagFilterChips'

/** מקור ההצעות לשדה התגיות: המאגר (לפי שכיחות) ופונקציה שטוענת אותו בפעם הראשונה שצריך */
export interface TagSuggestionSource {
  pool: TagCount[]
  load: () => void
}

// טעינה אחת לכל הדף: גם כשהחלון נסגר ונפתח שוב, או כשיש שני שדות — בקשה אחת.
// כישלון (רשת/שרת) לא נשמר, כדי שהפוקוס הבא ינסה שוב; עד אז פשוט אין הצעות.
let poolPromise: Promise<TagCount[]> | null = null

function fetchPool(): Promise<TagCount[]> {
  if (!poolPromise) {
    // GET /api/plugins — רשימת התוספים הציבוריים הקיימת (ציבורית, עם Cache-Control). לא נתיב חדש:
    // ההצעות מחושבות מהתגיות שבה, באותו נרמול שהשרת מחיל בשמירה.
    // Promise.resolve().then — גם חריגה סינכרונית (fetch לא זמין) נהפכת לכישלון שקט
    poolPromise = Promise.resolve()
      .then(() => fetch('/api/plugins'))
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((plugins: unknown) => buildTagSuggestionPool(Array.isArray(plugins) ? plugins : []) as TagCount[])
      .catch((error: unknown) => {
        poolPromise = null
        throw error
      })
  }
  return poolPromise
}

/** לבדיקות בלבד — איפוס המטמון בין טסטים */
export function resetTagSuggestionCache() {
  poolPromise = null
}

/**
 * התגיות הקיימות בחנות, להצעה בזמן ההקלדה. נטען בעצלתיים — רק כשהמשתמש מגיע לשדה (load מ-onFocus),
 * לא בטעינת הדף.
 */
export function usePluginTagSuggestions(): TagSuggestionSource {
  const [pool, setPool] = useState<TagCount[]>([])
  const load = useCallback(() => {
    fetchPool().then(setPool, () => {})
  }, [])
  return { pool, load }
}
