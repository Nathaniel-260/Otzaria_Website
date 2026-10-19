// דף תוסף בודד בחנות — Server Component. פרטי התוסף נשלפים בזמן הרינדור
// (אותה לוגיקה בדיוק כמו GET /api/plugins/[id], דרך src/lib/pluginDetail.js)
// ומועברים לחלק הלקוח, כך שהתוכן נמצא ב-HTML הראשוני. קודם הדף כולו היה
// 'use client' ושלף את התוסף ב-fetch אחרי ה-hydration: ספינר, ואז קפיצת
// פריסה גדולה (CLS 0.84) כשהתוכן דחף את הפוטר למטה.
//
// הדף דינמי (בכל בקשה, בלי מטמון) — בדיוק כמו ה-API שהחליף: מונה ההורדות
// והדירוג מוצגים טריים, כפי שהיו.
//
// תוסף שאינו קיים (מזהה/גרסה לא תקינים, נמחק, לא אושר) → 404 אמיתי
// (notFound). קודם הוחזר 200 עם הפניית JS ל-/plugins, ו-Google סימן את הדפים
// כ"Page with redirect".
//
// תוסף מושהה נגיש רק למעלה ולמנהלי תוספים (בדיקת session). כדי לא לערב
// session ברינדור-השרת, במקרה כזה (וגם בשגיאת DB זמנית) initialPlugin=null,
// וחלק הלקוח טוען מה-API כמו קודם — כולל ההפניה ל-/plugins כשהתוסף אינו
// נגיש. לתוסף מושהה מוצמד noindex, כדי שלא יישאר באינדקס של Google.
import { cache } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import dbConnect from '@/lib/db'
import { findPluginForDetail, buildPluginDetailPayload } from '@/lib/pluginDetail'
import { parsePluginRef } from '@/lib/pluginRef'
import { isPluginSuspended } from '@/lib/pluginVisibility'
import { pluginPageMetadata } from '@/lib/seoMetadata'
import PluginDetailClient, { type Plugin } from './PluginDetailClient'

export const dynamic = 'force-dynamic'

type LoadResult =
  | { kind: 'ok'; plugin: Plugin }
  | { kind: 'missing' }
  | { kind: 'suspended' }
  | { kind: 'error' }

// cache: generateMetadata והדף קוראים לאותה פונקציה באותה בקשה — שליפה אחת מה-DB
const loadPlugin = cache(async (rawId: string): Promise<LoadResult> => {
  try {
    const { id, version } = parsePluginRef(rawId)
    if (!id || version === false) return { kind: 'missing' }

    await dbConnect()
    const plugin = await findPluginForDetail(id)
    if (!plugin) return { kind: 'missing' }
    if (isPluginSuspended(plugin)) return { kind: 'suspended' }

    const payload = await buildPluginDetailPayload(plugin, id, version)
    if (!payload) return { kind: 'missing' }
    // סבב JSON — אותו מבנה בדיוק שהלקוח קיבל מה-API (תאריכים כמחרוזות וכו')
    return { kind: 'ok', plugin: JSON.parse(JSON.stringify(payload)) as Plugin }
  } catch (error) {
    console.error('Error loading plugin page:', error)
    return { kind: 'error' }
  }
})

function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const result = await loadPlugin(decodeParam(id))
  if (result.kind === 'missing') notFound()
  if (result.kind === 'suspended') return { title: 'תוסף לאוצריא', robots: { index: false } }
  if (result.kind === 'ok') {
    // גרסה ארכיונית (<id>@<version>) — תוכן כמעט זהה לדף התוסף החי; לא לאינדקס
    return result.plugin.isHistoricalVersion
      ? { ...pluginPageMetadata(result.plugin), robots: { index: false } }
      : pluginPageMetadata(result.plugin)
  }
  return { title: 'תוסף לאוצריא' }
}

export default async function PluginPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await loadPlugin(decodeParam(id))
  if (result.kind === 'missing') notFound()
  const initialPlugin = result.kind === 'ok' ? result.plugin : null
  return <PluginDetailClient key={id} initialPlugin={initialPlugin} />
}
