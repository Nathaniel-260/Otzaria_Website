// תגובות HTTP ועטיפת אימות לראוטי /api/worker/v1. כל תגובה (גם שגיאה) היא JSON עם no-store,
// בלי redirects — הלקוח מפרש HTML/3xx כבעיית אימות.
import connectDB from '@/lib/db';
import OcrWorkerState from '@/models/OcrWorkerState';
import { authenticateWorker } from './workerAuth';

export function workerJson(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...extraHeaders,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export function workerError(status, code, extra = {}) {
  const headers = {};
  if (status === 401) headers['WWW-Authenticate'] = 'Bearer realm="otzaria-worker"';
  if (status === 503) headers['Retry-After'] = '60';
  return workerJson(status, { ...extra, error: code }, headers);
}

export const isJobIdParam = (id) => typeof id === 'string' && /^[a-f0-9]{24}$/.test(id);

// handler(request, { workerId, params }) — חריגה מחזירה 500 internal_error בלי טקסט החריגה.
export function withWorker(handler) {
  return async (request, routeCtx) => {
    try {
      const auth = authenticateWorker(request);
      if (!auth.ok) {
        console.warn(`[ocr-worker] auth rejected: ${auth.code}`);
        return workerError(auth.status, auth.code);
      }
      await connectDB();
      await OcrWorkerState.updateOne(
        { workerId: auth.workerId },
        { $max: { lastSeenAt: new Date() }, $set: { lastRoute: `${request.method} ${new URL(request.url).pathname}` } },
        { upsert: true }
      );
      const params = routeCtx?.params ? await routeCtx.params : {};
      return await handler(request, { workerId: auth.workerId, params });
    } catch {
      console.error('[ocr-worker] internal error');
      return workerError(500, 'internal_error');
    }
  };
}
