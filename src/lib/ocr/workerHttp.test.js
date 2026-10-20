// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { updateOne, connectDB } = vi.hoisted(() => ({ updateOne: vi.fn(), connectDB: vi.fn() }));
vi.mock('@/models/OcrWorkerState', () => ({ default: { updateOne } }));
vi.mock('@/lib/db', () => ({ default: connectDB }));

import { workerJson, workerError, withWorker, isJobIdParam } from './workerHttp';

const SECRET = 'A'.repeat(48);
const mk = (auth) => new Request('http://x/api/worker/v1/jobs', { headers: auth ? { authorization: auth } : {} });

describe('workerHttp', () => {
  beforeEach(() => {
    updateOne.mockReset().mockResolvedValue({});
    connectDB.mockReset().mockResolvedValue();
    process.env.OCR_WORKER_SECRET = SECRET;
    process.env.OCR_WORKER_ID = 'w1';
  });

  it('workerJson/workerError: JSON ו-no-store', async () => {
    for (const r of [workerJson(200, { a: 1 }), workerError(404, 'not_found'), workerError(401, 'unauthorized'), workerError(503, 'worker_api_disabled')]) {
      expect(r.headers.get('content-type')).toBe('application/json; charset=utf-8');
      expect(r.headers.get('cache-control')).toBe('no-store');
    }
    expect(workerError(401, 'unauthorized').headers.get('www-authenticate')).toBe('Bearer realm="otzaria-worker"');
    expect(await workerError(409, 'x', { foo: 1 }).json()).toEqual({ foo: 1, error: 'x' });
  });

  it('withWorker: בלי Bearer 401 JSON ובלי DB', async () => {
    const h = vi.fn();
    const r = await withWorker(h)(mk());
    expect(r.status).toBe(401);
    expect(await r.json()).toEqual({ error: 'unauthorized' });
    expect(h).not.toHaveBeenCalled();
    expect(updateOne).not.toHaveBeenCalled();
  });

  it('withWorker: תצורה חסרה — 503 worker_api_disabled', async () => {
    delete process.env.OCR_WORKER_SECRET;
    const r = await withWorker(vi.fn())(mk(`Bearer ${SECRET}`));
    expect(r.status).toBe(503);
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect(await r.json()).toEqual({ error: 'worker_api_disabled' });
  });

  it('withWorker: הצלחה — מעדכן lastSeenAt וקורא ל-handler עם params', async () => {
    const h = vi.fn(async (_r, ctx) => workerJson(200, { id: ctx.params.id, w: ctx.workerId }));
    const r = await withWorker(h)(mk(`Bearer ${SECRET}`), { params: Promise.resolve({ id: 'z' }) });
    expect(await r.json()).toEqual({ id: 'z', w: 'w1' });
    const [filter, update, opts] = updateOne.mock.calls[0];
    expect(filter).toEqual({ workerId: 'w1' });
    expect(update.$max.lastSeenAt).toBeInstanceOf(Date);
    expect(opts).toEqual({ upsert: true });
  });

  it('withWorker: חריגה — 500 internal_error בלי טקסט החריגה', async () => {
    const r = await withWorker(async () => { throw new Error('פרט-פנימי'); })(mk(`Bearer ${SECRET}`));
    expect(r.status).toBe(500);
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect(await r.text()).toBe('{"error":"internal_error"}');
  });

  it('isJobIdParam', () => {
    expect(isJobIdParam('64b7f0c2a1b2c3d4e5f60001')).toBe(true);
    for (const v of ['64B7F0C2A1B2C3D4E5F60001', 'abc', '', undefined, '64b7f0c2a1b2c3d4e5f6000g']) expect(isJobIdParam(v)).toBe(false);
  });
});
