import { NextResponse } from 'next/server';
import { fetchLicenseText } from '@/lib/licenseSource';

export async function GET() {
  try {
    // מקור הרישיון (URL מוצמד ל-commit, timeout, מגבלת אורך ובדיקת שפיות) — src/lib/licenseSource.js
    const text = await fetchLicenseText();

    return new NextResponse(text, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        // ציבורי וזהה לכל המבקרים (לא תלוי session) — מותר במטמון CDN/דפדפן, TTL קצר.
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    console.error('License fetch error:', error);
    return new NextResponse('Error loading license', {
      status: 500,
      // גם שגיאה זהה לכל המבקרים — TTL קצר מאוד כדי לא להכביד על GitHub בכשל זמני.
      headers: { 'Cache-Control': 'public, max-age=60' },
    });
  }
}
