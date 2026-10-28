'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiCall } from './adminApi'

// טעינת נתונים ממסך הניהול: GET לנתיב (יחסי ל-API), מחדש בכל שינוי בנתיב או ב-reload().
// מחזיר {data, error, loading, reload, setData}; setData — עדכון מקומי אחרי פעולה (בלי טעינה מחדש).
// הנתיב null — לא טוענים. refreshKey — שינוי שלו (מבחוץ) טוען מחדש.

export default function useAdminData(path, refreshKey = 0) {
  const [state, setState] = useState({ data: null, error: null, loading: !!path })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!path) return undefined
    let on = true
    apiCall(path).then((r) => {
      if (!on) return
      setState((s) => (r.ok ? { data: r.data, error: null, loading: false } : { ...s, error: r.error, loading: false }))
    })
    return () => {
      on = false
    }
  }, [path, tick, refreshKey])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  const setData = useCallback((fn) => setState((s) => ({ ...s, data: typeof fn === 'function' ? fn(s.data) : fn })), [])

  return { data: state.data, error: state.error, loading: state.loading, reload, setData }
}
