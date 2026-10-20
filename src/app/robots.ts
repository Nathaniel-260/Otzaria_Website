import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

// robots.txt: האתר הציבורי פתוח לסריקה; /api/ וכלי חנות שדורשים התחברות — לא. בכוונה לא חוסמים כאן
// /auth/, /library/ ו-/plugins/search: דף שחסום ב-robots לא נסרק ולכן ה-noindex שלו לא נקרא
// (התחברות וחיפוש בחנות מסומנים noindex ב-metadata; תחת /library יש דפים ציבוריים שב-sitemap).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/plugins/upload'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
