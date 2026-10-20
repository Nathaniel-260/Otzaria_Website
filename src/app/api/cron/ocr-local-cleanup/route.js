import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { authorizeCron } from '@/lib/corrections/runtime';
import { runLocalOcrCleanup } from '@/lib/ocr/localCleanup';

// ניקוי שעתי של קבצי עבודות OCR מקומי (ספק local): השלמת קליטות תקועות (resumeStalledApplies),
// מחיקת קבצי קלט/תוצאה 24 שעות אחרי אישור המסירה (ackAt), קבצי קלט יתומים של עבודות שנכשלו/בוטלו
// בלי ack, דחיות ישנות (30 יום) וקבצים זמניים. רשומות ה-DB וה-ack לא נמחקים. ראו src/lib/ocr/localCleanup.js.
// מופעל מ-crontab ב-VPS (מוחרג משער השבת ב-src/proxy.js כמו כל /api/cron):
//   0 * * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/cron/ocr-local-cleanup
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const NO_STORE = { 'Cache-Control': 'no-store' };

async function run(request) {
  const auth = authorizeCron(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status, headers: NO_STORE });
  try {
    await connectDB();
    const now = new Date();
    const { resumed, purge } = await runLocalOcrCleanup({ now });
    return NextResponse.json(
      {
        ok: purge.errors === 0 && !purge.storageMissing && !resumed.error,
        ranAt: now.toISOString(),
        resumed: { count: resumed.count, ok: resumed.ok, results: resumed.results, ...(resumed.error ? { error: resumed.error } : {}) },
        purge,
      },
      { headers: NO_STORE }
    );
  } catch (err) {
    console.error('[ocr-local-cleanup] failed:', err?.code ?? err?.name ?? 'error');
    return NextResponse.json({ ok: false, error: 'cleanup_failed' }, { status: 500, headers: NO_STORE });
  }
}

export async function POST(request) {
  return run(request);
}

export async function GET(request) {
  return run(request);
}
