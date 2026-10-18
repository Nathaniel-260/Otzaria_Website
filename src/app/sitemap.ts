// /sitemap.xml — רשימת הדפים הציבוריים ל-Google, נבנית אוטומטית מה-DB:
// דפים קבועים + דפי המדריך (מהוויקי) + קטגוריות ותוספים ציבוריים בחנות.
// תוסף שאושר / קטגוריה שנוספה נכנסים לבד; הבנייה עצמה ב-src/lib/sitemapEntries.js.
//
// מטמון: Data Cache עם תגיות החנות (כמו plugins/all/page.tsx) — revalidateNow
// הקיים בכל route שמשנה תוסף/קטגוריה מרענן גם את ה-sitemap. הנתיב דינמי כדי
// שה-build לא ייגש ל-DB; בשגיאת DB/וויקי מוחזרים לפחות הדפים הקבועים.
//
// ה-proxy (src/proxy.js) לא רץ על /sitemap.xml — ה-matcher מדלג על נתיבים עם נקודה.
import type { MetadataRoute } from 'next'
import { unstable_cache as nextCache } from 'next/cache'
import dbConnect from '@/lib/db'
import PluginModel from '@/models/Plugin'
import PluginCategory from '@/models/PluginCategory'
import { PUBLIC_PLUGIN_FILTER } from '@/lib/pluginStore'
import { getUserGuideNav } from '@/lib/wiki'
import { buildSitemapEntries } from '@/lib/sitemapEntries'
import { CACHE_TAGS, REVALIDATE_SECONDS } from '@/lib/cacheTags'

export const dynamic = 'force-dynamic'

type StoreEntries = {
  plugins: { id: string; updatedAt: string | null }[]
  categories: { slug: string; updatedAt: string | null }[]
}

async function loadStoreEntriesUncached(): Promise<StoreEntries> {
  await dbConnect()
  const [plugins, categories] = await Promise.all([
    PluginModel.find(PUBLIC_PLUGIN_FILTER).select('_id fileUpdatedAt createdAt').lean(),
    PluginCategory.find({ isVisible: true }).select('slug updatedAt').lean()
  ])
  // ערכים פשוטים (מחרוזות) — כדי שיישמרו כמו שהם במטמון
  return {
    plugins: plugins.map((plugin) => ({
      id: plugin._id.toString(),
      // fileUpdatedAt ולא updatedAt: updatedAt מתעדכן בכל הורדה (מונה ההורדות)
      updatedAt: plugin.fileUpdatedAt
        ? new Date(plugin.fileUpdatedAt).toISOString()
        : plugin.createdAt
          ? new Date(plugin.createdAt).toISOString()
          : null
    })),
    categories: categories.map((category) => ({
      slug: category.slug,
      updatedAt: category.updatedAt ? new Date(category.updatedAt).toISOString() : null
    }))
  }
}

const loadStoreEntries = nextCache(loadStoreEntriesUncached, ['sitemap-store'], {
  tags: [CACHE_TAGS.PLUGINS_PUBLIC, CACHE_TAGS.PLUGIN_CATEGORIES],
  revalidate: REVALIDATE_SECONDS.PLUGINS_PUBLIC
})

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [store, nav] = await Promise.all([
    loadStoreEntries().catch((error) => {
      console.error('sitemap: failed to load plugin store entries:', error)
      return { plugins: [], categories: [] } as StoreEntries
    }),
    getUserGuideNav().catch((error) => {
      console.error('sitemap: failed to load user guide nav:', error)
      return [] as { slug: string }[]
    })
  ])

  return buildSitemapEntries({
    docSlugs: nav.map((item: { slug: string }) => item.slug),
    plugins: store.plugins,
    categories: store.categories
  })
}
