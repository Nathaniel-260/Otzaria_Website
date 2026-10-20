/**
 * בדיקות אינטגרציה לקליטת תוצאה מהעובד המקומי (localResultIntake.js + localApply.js) מול MongoDB
 * אמיתי (standalone) ותיקיית אחסון זמנית. מכסה: accepted → already_received בלי כתיבה, 409 עם שמירה
 * לבירור (וה-ack המקורי נשמר, גם אחרי ניקוי הקבצים), קריסה באמצע ושליחה חוזרת, עריכה אנושית
 * (התנגשות נשמרת), skip/overwrite, עמוד שנמחק, partial/failed, ביטול לפני/אחרי ההחלה, lease,
 * דחיות 400/422 (נשמרות כ-rejected), עבודה סגורה, מקביליות, ו-resumeStalledApply.
 * הרצה: npm run test:node
 */
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import mongoose from 'mongoose';
import OcrJob from '../../models/OcrJob.js';
import Page from '../../models/Page.js';
import OcrConflict from '../../models/OcrConflict.js';
import { intakeResult } from './localResultIntake.js';
import { APPLY_LEASE_MS, resumeStalledApplies, resumeStalledApply } from './localApply.js';
import { isValidAck } from './localApply.pure.js';
import { cancelLocalJob } from './localCancel.js';
import { startMongo } from '../corrections/testing/mongo.js';

let db;
let root;
let env;
before(async () => {
  db = await startMongo();
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'ocr-apply-'));
  env = { OCR_LOCAL_STORAGE_DIR: root };
});
after(async () => {
  if (!db.skip) await db.stop();
  await fs.rm(root, { recursive: true, force: true });
});
beforeEach(async () => {
  if (!db.skip) await db.reset();
});

const oid = () => new mongoose.Types.ObjectId();
const A = 'a'.repeat(64);
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function makePages(book, n, texts = []) {
  const pages = [];
  for (let i = 1; i <= n; i++) {
    pages.push(
      await Page.create({ book, pageNumber: i, imagePath: `/uploads/books/x/page.${i}.jpg`, content: texts[i - 1] ?? '' })
    );
  }
  return pages;
}

// עבודת local שהעובד כבר מחזיק (delivery_pending), עם pageMap לפי העמודים ברגע היצירה
async function makeJob({ n = 3, mode = 'skip', texts = [], status = 'delivery_pending', extra = {} } = {}) {
  const book = oid();
  const pages = await makePages(book, n, texts);
  const job = await OcrJob.create({
    book,
    method: 'local',
    status,
    active: true,
    workerId: 'worker-1',
    requestId: `req-${oid()}`,
    existingTextMode: mode,
    inputPath: 'x/input.pdf',
    inputSha256: A,
    inputBytes: 1234,
    totalPages: n,
    pageMap: pages.map((p, i) => ({
      pdfPageIndex: i + 1,
      page: p._id,
      pageNumber: p.pageNumber,
      expectedUpdatedAt: p.updatedAt,
      imageSha256: A,
    })),
    ...extra,
  });
  await fs.mkdir(path.join(root, String(job._id)), { recursive: true });
  return { job, pages, book };
}

const resultDoc = (job, outcome = 'success', over = {}) => ({
  schemaVersion: 1,
  jobId: String(job._id),
  inputSha256: A,
  outcome,
  pipelineVersion: '0.1.0',
  pages: job.pageMap.map((e) => ({ pdfPageIndex: e.pdfPageIndex, text: `טקסט ${e.pdfPageIndex}` })),
  ...over,
});

// שליחה כמו הראוט: העבודה נטענת מחדש, הגוף בזרימה, הכותרת מנורמלת
async function send(jobId, doc, { sha, now, hooks, chunks } = {}) {
  const buf = Buffer.isBuffer(doc) ? doc : Buffer.from(typeof doc === 'string' ? doc : JSON.stringify(doc), 'utf8');
  const job = await OcrJob.findById(jobId).lean();
  const body = chunks ? Readable.from(chunks) : Readable.from([buf]);
  return intakeResult({ job, claimedSha: sha ?? sha256(buf), body, now: now ?? new Date(), env, hooks });
}

const load = (id) => OcrJob.findById(id).lean();
const pageSnap = async (pages) =>
  Promise.all(pages.map(async (p) => Page.findById(p._id).lean()));
const filesOf = async (job) => (await fs.readdir(path.join(root, String(job._id))).catch(() => [])).sort();

const expectAck = (r, ack, job, sha, outcome) => {
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(r.body, { ack, jobId: String(job._id), resultSha256: sha, outcome });
  assert.equal(isValidAck(r.body), true);
};

test('החלה ראשונה → accepted; שליחה חוזרת באותו hash → already_received בלי שום כתיבה', async (t) => {
  if (db.skip) return t.skip(db.skip);
  const { job, pages } = await makeJob();
  const doc = resultDoc(job);
  const sha = sha256(Buffer.from(JSON.stringify(doc)));

  const r1 = await send(job._id, doc);
  expectAck(r1, 'accepted', job, sha, 'success');
  const j1 = await load(job._id);
  assert.equal(j1.status, 'completed');
  assert.equal(j1.active, false);
  assert.equal(j1.decision, 'apply');
  assert.equal(j1.resultSha256, sha);
  assert.equal(j1.resultOutcome, 'success');
  assert.equal(j1.pipelineVersion, '0.1.0');
  assert.equal(j1.resultPath, `${job._id}/result-${sha}.json`);
  assert.equal(j1.applyLeaseUntil, null);
  assert.deepEqual(j1.ack, { ack: 'accepted', jobId: String(job._id), resultSha256: sha, outcome: 'success' });
  assert.ok(j1.ackAt instanceof Date && j1.finishedAt instanceof Date);
  assert.equal(j1.successPages, 3);
  assert.equal(j1.processedPages, 3);
  assert.equal(j1.failedPages, 0);
  assert.equal(j1.conflictPages, 0);
  assert.equal(j1.missingPages, 0);
  assert.deepEqual(await filesOf(job), [`result-${sha}.json`]);

  const p1 = await pageSnap(pages);
  p1.forEach((p, i) => {
    assert.equal(p.content, `טקסט ${i + 1}`);
    assert.equal(p.rightColumn, '');
    assert.equal(p.isTwoColumns, false);
    assert.equal(String(p.lastOcrJobId), String(job._id));
    assert.equal(p.lastOcrResultSha256, sha);
    assert.equal(p.status, 'available'); // סטטוס העמוד לא משתנה (כמו gemini/ocrwin)
  });

  await sleep(5);
  const r2 = await send(job._id, doc);
  expectAck(r2, 'already_received', job, sha, 'success');
  const p2 = await pageSnap(pages);
  p2.forEach((p, i) => {
    assert.equal(p.updatedAt.getTime(), p1[i].updatedAt.getTime());
    assert.equal(p.content, p1[i].content);
  });
  const j2 = await load(job._id);
  assert.deepEqual(j2, j1); // גם המונים וה-ack — כלום לא נכתב
});

test('hash אחר → 409 result_conflict, נשמר לבירור; ה-ack המקורי נשמר — גם "ימים אחר כך" אחרי ניקוי', async (t) => {
  if (db.skip) return t.skip(db.skip);
  const { job } = await makeJob({ n: 2 });
  const doc = resultDoc(job);
  const sha = sha256(Buffer.from(JSON.stringify(doc)));
  expectAck(await send(job._id, doc), 'accepted', job, sha, 'success');

  const other = resultDoc(job, 'success', { pipelineVersion: '0.2.0' });
  const otherSha = sha256(Buffer.from(JSON.stringify(other)));
  for (let i = 0; i < 2; i++) {
    const r = await send(job._id, other);
    assert.equal(r.status, 409);
    assert.deepEqual(r.body, { error: 'result_conflict' });
  }
  const j = await load(job._id);
  assert.equal(j.resultSha256, sha);
  assert.equal(j.ack.ack, 'accepted');
  assert.equal(j.resultConflicts.length, 1); // פעם אחת לכל hash
  assert.equal(j.resultConflicts[0].sha256, otherSha);
  assert.equal(j.resultConflicts[0].path, `${job._id}/rejected-${otherSha}.json`);
  assert.deepEqual(await filesOf(job), [`rejected-${otherSha}.json`, `result-${sha}.json`]);

  // 24 שעות: הקבצים נוקו, ackAt ישן — שליחה חוזרת עדיין already_received, ושום קובץ לא נוצר מחדש
  await fs.rm(path.join(root, String(job._id)), { recursive: true, force: true });
  await OcrJob.updateOne({ _id: job._id }, { $set: { ackAt: new Date(Date.now() - 3 * 86400000), resultPurgedAt: new Date() } });
  expectAck(await send(job._id, doc), 'already_received', job, sha, 'success');
  assert.deepEqual(await filesOf(job), []);
  // גוף שלא תואם לכותרת באותו מסלול — hash_mismatch
  const bad = await send(job._id, other, { sha });
  assert.deepEqual([bad.status, bad.body], [400, { error: 'hash_mismatch' }]);
});

test('קריסה באמצע ההחלה → שליחה חוזרת ממשיכה (accepted), כל עמוד נכתב פעם אחת בדיוק', async (t) => {
  if (db.skip) return t.skip(db.skip);
  const { job, pages } = await makeJob({ n: 40 });
  const doc = resultDoc(job);
  const sha = sha256(Buffer.from(JSON.stringify(doc)));
  let writes = 0;
  const hooks = {
    afterPageWrite: () => {
      writes++;
      if (writes === 5) throw new Error('simulated crash');
    },
  };
  await assert.rejects(send(job._id, doc, { hooks }), /simulated crash/);
  const mid = await load(job._id);
  assert.equal(mid.status, 'applying');
  assert.equal(mid.decision, 'apply');
  assert.equal(mid.active, true);
  assert.equal(mid.ack, null);
  assert.equal(mid.applyLeaseUntil, null); // שוחרר — שליחה חוזרת לא ממתינה
  const before = await pageSnap(pages);
  const written = before.filter((p) => String(p.lastOcrJobId) === String(job._id));
  assert.ok(written.length >= 5 && written.length < 40, `written=${written.length}`);
  // ביטול אחרי שההחלה התחילה — נדחה ("הקליטה כבר החלה")
  assert.deepEqual(await cancelLocalJob(job._id, { reason: 'admin' }), { ok: false, code: 'apply_started' });

  await sleep(5);
  let rewrites = 0;
  const r = await send(job._id, doc, { hooks: { afterPageWrite: () => rewrites++ } });
  expectAck(r, 'accepted', job, sha, 'success');
  assert.equal(rewrites, 40 - written.length); // רק העמודים שלא נכתבו
  const after = await pageSnap(pages);
  after.forEach((p, i) => {
    assert.equal(String(p.lastOcrJobId), String(job._id));
    if (String(before[i].lastOcrJobId) === String(job._id)) {
      assert.equal(p.updatedAt.getTime(), before[i].updatedAt.getTime());
    }
  });
  const j = await load(job._id);
  assert.equal(j.successPages, 40);
  assert.equal(j.status, 'completed');
});

test('עריכה אנושית בזמן ה-OCR → העמוד לא נדרס, OcrConflict עם טקסט ה-OCR, conflictPages=1', async (t) => {
  if (db.skip) return t.skip(db.skip);
  const { job, pages, book } = await makeJob({ n: 3 });
  await sleep(5);
  await Page.updateOne({ _id: pages[1]._id }, { $set: { content: 'עריכה של מתנדב', status: 'in-progress' } });
  const edited = await Page.findById(pages[1]._id).lean();

  const doc = resultDoc(job);
  const sha = sha256(Buffer.from(JSON.stringify(doc)));
  expectAck(await send(job._id, doc), 'accepted', job, sha, 'success');
  const p = await Page.findById(pages[1]._id).lean();
  assert.equal(p.content, 'עריכה של מתנדב');
  assert.equal(p.updatedAt.getTime(), edited.updatedAt.getTime());
  assert.equal(p.lastOcrJobId, undefined);
  const conflicts = await OcrConflict.find({ job: job._id }).lean();
  assert.equal(conflicts.length, 1);
  assert.equal(String(conflicts[0].page), String(pages[1]._id));
  assert.equal(String(conflicts[0].book), String(book));
  assert.equal(conflicts[0].ocrText, 'טקסט 2');
  assert.equal(conflicts[0].pdfPageIndex, 2);
  assert.equal(conflicts[0].pageNumber, 2);
  assert.equal(conflicts[0].resultSha256, sha);
  assert.equal(conflicts[0].status, 'open');
  assert.equal(conflicts[0].expectedUpdatedAt.getTime(), pages[1].updatedAt.getTime());
  assert.equal(conflicts[0].foundUpdatedAt.getTime(), edited.updatedAt.getTime());
  const j = await load(job._id);
  assert.equal(j.conflictPages, 1);
  assert.equal(j.successPages, 2);
  // שליחה חוזרת: אין התנגשות כפולה ואין שינוי מונים
  expectAck(await send(job._id, doc), 'already_received', job, sha, 'success');
  assert.equal(await OcrConflict.countDocuments({ job: job._id }), 1);
});

test('skip מול overwrite: skip לא דורס טקסט קיים (גם בלי שינוי updatedAt); overwrite דורס', async (t) => {
  if (db.skip) return t.skip(db.skip);
  // skip: טקסט שנכנס בלי לעדכן updatedAt (כתיבה ישירה) — עדיין לא נדרס
  const s = await makeJob({ n: 2, mode: 'skip' });
  await Page.collection.updateOne({ _id: s.pages[0]._id }, { $set: { leftColumn: 'טור קיים' } });
  const docS = resultDoc(s.job);
  expectAck(await send(s.job._id, docS), 'accepted', s.job, sha256(Buffer.from(JSON.stringify(docS))), 'success');
  const ps = await Page.findById(s.pages[0]._id).lean();
  assert.equal(ps.leftColumn, 'טור קיים');
  assert.equal(ps.content, '');
  assert.equal((await load(s.job._id)).conflictPages, 1);
  assert.equal((await Page.findById(s.pages[1]._id).lean()).content, 'טקסט 2');

  // overwrite: עמוד עם טקסט ברגע היצירה — מוחלף, והטורים מתאפסים
  const o = await makeJob({ n: 2, mode: 'overwrite', texts: ['טקסט ישן', ''] });
  const docO = resultDoc(o.job);
  expectAck(await send(o.job._id, docO), 'accepted', o.job, sha256(Buffer.from(JSON.stringify(docO))), 'success');
  assert.equal((await Page.findById(o.pages[0]._id).lean()).content, 'טקסט 1');
  assert.equal((await load(o.job._id)).successPages, 2);
});

test('skip: עמוד שתוכנו רק NBSP/BOM/רווח Unicode (ריק לפי pageHasText, נכנס ל-PDF) מוחל — לא התנגשות שווא', async (t) => {
  if (db.skip) return t.skip(db.skip);
  const blanks = ['\u00a0', '\ufeff\n', '\u3000 \u2003'];
  const { job, pages } = await makeJob({ n: 4, mode: 'skip', texts: [...blanks, '\u00a0א'] });
  // העמוד הרביעי מכיל טקסט אמיתי — הוא נכנס כאן למיפוי רק כדי לוודא שהוא עדיין לא נדרס
  const doc = resultDoc(job);
  expectAck(await send(job._id, doc), 'accepted', job, sha256(Buffer.from(JSON.stringify(doc))), 'success');
  const ps = await pageSnap(pages);
  assert.deepEqual(ps.map((p) => p.content), ['טקסט 1', 'טקסט 2', 'טקסט 3', '\u00a0א']);
  const j = await load(job._id);
  assert.equal(j.successPages, 3);
  assert.equal(j.conflictPages, 1);
});

test('עמוד שנמחק → missing (מתועד ב-pageErrors, לא הצלחה)', async (t) => {
  if (db.skip) return t.skip(db.skip);
  const { job, pages } = await makeJob({ n: 3 });
  await Page.deleteOne({ _id: pages[2]._id });
  const doc = resultDoc(job);
  expectAck(await send(job._id, doc), 'accepted', job, sha256(Buffer.from(JSON.stringify(doc))), 'success');
  const j = await load(job._id);
  assert.equal(j.missingPages, 1);
  assert.equal(j.successPages, 2);
  assert.equal(j.pageErrors.length, 1);
  assert.equal(j.pageErrors[0].pageNumber, 3);
  assert.match(j.pageErrors[0].message, /לא נמצא/);
  assert.equal(await Page.countDocuments({ _id: pages[2]._id }), 0); // לא נוצר מחדש
});

test('partial עם עמוד שנכשל: הטקסט לא נכתב לעמוד ההוא, failedPages=1, status completed', async (t) => {
  if (db.skip) return t.skip(db.skip);
  const { job, pages } = await makeJob({ n: 2 });
  const doc = resultDoc(job, 'partial', {
    pages: [
      { pdfPageIndex: 1, text: 'שלום' },
      { pdfPageIndex: 2, error: { code: 'layout_failed', message: 'layout failed' } },
    ],
  });
  expectAck(await send(job._id, doc), 'accepted', job, sha256(Buffer.from(JSON.stringify(doc))), 'partial');
  const j = await load(job._id);
  assert.equal(j.status, 'completed');
  assert.equal(j.successPages, 1);
  assert.equal(j.failedPages, 1);
  assert.deepEqual(j.pageErrors.map((e) => e.pageNumber), [2]);
  assert.match(j.pageErrors[0].message, /layout_failed/);
  const p2 = await Page.findById(pages[1]._id).lean();
  assert.equal(p2.content, '');
  assert.equal(p2.updatedAt.getTime(), pages[1].updatedAt.getTime());
  assert.equal((await Page.findById(pages[0]._id).lean()).content, 'שלום');
});

test('failed: שום עמוד לא נכתב, status failed, error מהתוצאה', async (t) => {
  if (db.skip) return t.skip(db.skip);
  const { job, pages } = await makeJob({ n: 2 });
  const doc = resultDoc(job, 'failed', {
    pipelineVersion: '',
    pages: [],
    error: { code: 'gpu_unavailable', message: 'AMD GPU not available' },
  });
  expectAck(await send(job._id, doc), 'accepted', job, sha256(Buffer.from(JSON.stringify(doc))), 'failed');
  const j = await load(job._id);
  assert.equal(j.status, 'failed');
  assert.equal(j.active, false);
  assert.equal(j.error, 'gpu_unavailable: AMD GPU not available');
  assert.equal(j.failedPages, 2);
  assert.equal(j.successPages, 0);
  for (const p of await pageSnap(pages)) {
    assert.equal(p.content, '');
    assert.equal(p.lastOcrJobId, undefined);
  }
});

test('outcome cancelled בלי ביטול באתר → accepted עם outcome cancelled, status cancelled, בלי כתיבה', async (t) => {
  if (db.skip) return t.skip(db.skip);
  const { job, pages } = await makeJob({ n: 2, status: 'needs_attention' });
  const doc = resultDoc(job, 'cancelled', { pipelineVersion: '', pages: [] });
  expectAck(await send(job._id, doc), 'accepted', job, sha256(Buffer.from(JSON.stringify(doc))), 'cancelled');
  const j = await load(job._id);
  assert.equal(j.status, 'cancelled');
  assert.equal(j.active, false);
  assert.equal((await Page.findById(pages[0]._id).lean()).content, '');
});

test('ביטול לפני התוצאה → ack=cancelled (outcome cancelled) בלי כתיבה; שליחה חוזרת → שוב cancelled', async (t) => {
  if (db.skip) return t.skip(db.skip);
  const { job, pages } = await makeJob({ n: 2 });
  assert.deepEqual(await cancelLocalJob(job._id, { reason: 'admin' }), { ok: true });
  const doc = resultDoc(job); // התוצאה עצמה success — לא משנה
  const sha = sha256(Buffer.from(JSON.stringify(doc)));
  expectAck(await send(job._id, doc), 'cancelled', job, sha, 'cancelled');
  expectAck(await send(job._id, doc), 'cancelled', job, sha, 'cancelled');
  const j = await load(job._id);
  assert.equal(j.status, 'cancelled');
  assert.equal(j.active, false);
  assert.equal(j.decision, 'cancel');
  assert.equal(j.resultSha256, sha);
  assert.deepEqual(j.ack, { ack: 'cancelled', jobId: String(job._id), resultSha256: sha, outcome: 'cancelled' });
  for (const p of await pageSnap(pages)) assert.equal(p.content, '');
  // תוצאה אחרת אחרי זה → 409
  const r = await send(job._id, resultDoc(job, 'cancelled', { pipelineVersion: '', pages: [] }));
  assert.equal(r.status, 409);
});

test('lease תפוס → 503 apply_in_progress עם Retry-After; אחרי פקיעה — ממשיך', async (t) => {
  if (db.skip) return t.skip(db.skip);
  const { job } = await makeJob({ n: 2 });
  const doc = resultDoc(job);
  const sha = sha256(Buffer.from(JSON.stringify(doc)));
  const now = new Date();
  await assert.rejects(send(job._id, doc, { now, hooks: { afterPageWrite: () => { throw new Error('crash'); } } }));
  // קריסת תהליך אמיתית לא משחררת את ה-lease
  await OcrJob.updateOne({ _id: job._id }, { $set: { applyLeaseUntil: new Date(now.getTime() + APPLY_LEASE_MS) } });
  const busy = await send(job._id, doc, { now });
  assert.equal(busy.status, 503);
  assert.deepEqual(busy.body, { error: 'apply_in_progress' });
  assert.deepEqual(busy.headers, { 'Retry-After': '30' });
  const later = new Date(now.getTime() + APPLY_LEASE_MS + 1000);
  expectAck(await send(job._id, doc, { now: later }), 'accepted', job, sha, 'success');
});

test('שתי שליחות מקבילות של אותה תוצאה: אחת accepted, השנייה ack תקין או 503 — כל עמוד נכתב פעם אחת', async (t) => {
  if (db.skip) return t.skip(db.skip);
  const { job, pages } = await makeJob({ n: 30 });
  const doc = resultDoc(job);
  const sha = sha256(Buffer.from(JSON.stringify(doc)));
  let writes = 0;
  const hooks = { afterPageWrite: () => writes++ };
  const [a, b] = await Promise.all([send(job._id, doc, { hooks }), send(job._id, doc, { hooks })]);
  const kinds = [a, b].map((r) => (r.status === 200 ? r.body.ack : r.status)).sort();
  assert.ok(kinds.includes('accepted') || kinds.includes('already_received'), JSON.stringify(kinds));
  for (const r of [a, b]) if (r.status === 200) assert.equal(isValidAck(r.body), true);
  assert.equal(writes, 30);
  for (const p of await pageSnap(pages)) assert.equal(p.lastOcrResultSha256, sha);
  if (kinds.includes(503)) expectAck(await send(job._id, doc), 'already_received', job, sha, 'success');
});

test('דחיות: 422 ו-400 נשמרות כ-rejected ולא נועלות; hash_mismatch לא משאיר קובץ; עבודה סגורה → 410', async (t) => {
  if (db.skip) return t.skip(db.skip);
  const { job } = await makeJob({ n: 2 });
  const invalid = resultDoc(job, 'success', { pages: [{ pdfPageIndex: 1, text: 'x' }, { pdfPageIndex: 9, text: 'y' }] });
  const invalidSha = sha256(Buffer.from(JSON.stringify(invalid)));
  const r422 = await send(job._id, invalid);
  assert.equal(r422.status, 422);
  assert.deepEqual(r422.body, { error: 'validation_failed', details: 'unrequested page 9; missing page 2' });

  const r400 = await send(job._id, '{"schemaVersion":1,');
  assert.deepEqual([r400.status, r400.body], [400, { error: 'invalid_result' }]);

  const good = resultDoc(job);
  const mismatch = await send(job._id, good, { sha: 'f'.repeat(64) });
  assert.deepEqual([mismatch.status, mismatch.body], [400, { error: 'hash_mismatch' }]);

  const j = await load(job._id);
  assert.equal(j.resultSha256, undefined);
  assert.equal(j.status, 'delivery_pending');
  assert.deepEqual(j.resultRejections.map((x) => x.reason), ['validation_failed', 'invalid_result']);
  assert.equal(j.resultRejections[0].sha256, invalidSha);
  assert.equal(j.resultRejections[0].details, 'unrequested page 9; missing page 2');
  const files = await filesOf(job);
  assert.equal(files.length, 2);
  assert.ok(files.every((f) => f.startsWith('rejected-')));

  // אחרי הדחיות — תוצאה תקינה עדיין מתקבלת
  expectAck(await send(job._id, good), 'accepted', job, sha256(Buffer.from(JSON.stringify(good))), 'success');

  // עבודה שנסגרה בלי ack ובלי ביטול (למשל נכשלה בהכנה) — לא נפתחת מחדש
  const closed = await makeJob({ n: 1, extra: { status: 'failed', active: false } });
  const rc = await send(closed.job._id, resultDoc(closed.job));
  assert.deepEqual([rc.status, rc.body], [410, { error: 'job_closed' }]);
  const jc = await load(closed.job._id);
  assert.equal(jc.resultSha256, undefined);
  assert.equal(jc.resultRejections[0].reason, 'job_closed');
});

test('גוף מעל התקרה → 413 בלי קובץ ובלי נעילה; גוף בחתיכות מתקבל', async (t) => {
  if (db.skip) return t.skip(db.skip);
  const { job } = await makeJob({ n: 1 });
  const big = { job: await load(job._id), claimedSha: A, body: Readable.from([Buffer.alloc(600), Buffer.alloc(600)]), env, maxBytes: 1000 };
  const r = await intakeResult(big);
  assert.deepEqual([r.status, r.body], [413, { error: 'result_too_large' }]);
  assert.deepEqual(await filesOf(job), []);
  const doc = Buffer.from(JSON.stringify(resultDoc(job)));
  const chunks = [doc.subarray(0, 7), doc.subarray(7, 50), doc.subarray(50)];
  expectAck(await send(job._id, doc, { chunks }), 'accepted', job, sha256(doc), 'success');
});

test('resumeStalledApply: עבודה שנתקעה ב-applying (המחשב כבוי) מושלמת מהקובץ השמור; העובד מקבל אחר כך already_received', async (t) => {
  if (db.skip) return t.skip(db.skip);
  const { job, pages } = await makeJob({ n: 4 });
  const doc = resultDoc(job, 'partial', {
    pages: [
      { pdfPageIndex: 1, text: 'א' },
      { pdfPageIndex: 2, text: 'ב' },
      { pdfPageIndex: 3, error: { code: 'e', message: '' } },
      { pdfPageIndex: 4, text: 'ד' },
    ],
  });
  const sha = sha256(Buffer.from(JSON.stringify(doc)));
  const t0 = new Date();
  let n = 0;
  await assert.rejects(send(job._id, doc, { now: t0, hooks: { afterPageWrite: () => { if (++n === 1) throw new Error('crash'); } } }));
  await OcrJob.updateOne({ _id: job._id }, { $set: { applyLeaseUntil: new Date(t0.getTime() + APPLY_LEASE_MS) } });

  // ה-lease עדיין חי — לא נוגעים
  assert.deepEqual(await resumeStalledApply(job._id, { now: new Date(t0.getTime() + 1000), env }), { ok: false, code: 'not_stalled' });
  const later = new Date(t0.getTime() + APPLY_LEASE_MS + 60000);
  assert.deepEqual(await resumeStalledApplies({ now: later, env }), [{ jobId: String(job._id), ok: true, code: 'applied' }]);
  const j = await load(job._id);
  assert.equal(j.status, 'completed');
  assert.equal(j.active, false);
  assert.equal(j.successPages, 3);
  assert.equal(j.failedPages, 1);
  assert.deepEqual(j.ack, { ack: 'accepted', jobId: String(job._id), resultSha256: sha, outcome: 'partial' });
  assert.deepEqual((await pageSnap(pages)).map((p) => p.content), ['א', 'ב', '', 'ד']);
  // העובד חוזר לחיים ושולח שוב
  expectAck(await send(job._id, doc), 'already_received', job, sha, 'partial');
  assert.deepEqual(await resumeStalledApply(job._id, { now: later, env }), { ok: true, code: 'already_closed', ack: j.ack });
});

test('resumeStalledApply: תוצאה ננעלה בלי החלטה / בוטלה בלי ack / קובץ חסר', async (t) => {
  if (db.skip) return t.skip(db.skip);
  const t0 = new Date(Date.now() - APPLY_LEASE_MS - 60000);
  // ננעלה (resultSha256) ואז קריסה לפני נעילת ההחלטה
  const a = await makeJob({ n: 2 });
  const docA = resultDoc(a.job);
  const bufA = Buffer.from(JSON.stringify(docA));
  const shaA = sha256(bufA);
  await fs.writeFile(path.join(root, String(a.job._id), `result-${shaA}.json`), bufA);
  await OcrJob.updateOne(
    { _id: a.job._id },
    { $set: { resultSha256: shaA, resultOutcome: 'success', resultPath: `${a.job._id}/result-${shaA}.json`, resultReceivedAt: t0 } }
  );
  assert.equal((await resumeStalledApply(a.job._id, { env })).code, 'applied');
  assert.equal((await load(a.job._id)).successPages, 2);

  // בוטלה אחרי נעילת ה-hash, וה-ack לא נשמר
  const b = await makeJob({ n: 1 });
  await OcrJob.updateOne({ _id: b.job._id }, { $set: { resultSha256: A, resultReceivedAt: t0, resultPath: 'nope/x.json' } });
  await cancelLocalJob(b.job._id, { reason: 'admin' });
  const rb = await resumeStalledApply(b.job._id, { env });
  assert.equal(rb.code, 'cancelled');
  assert.equal((await load(b.job._id)).ack.ack, 'cancelled');

  // הקובץ השמור חסר — לא ממציאים כלום
  const c = await makeJob({ n: 1 });
  await OcrJob.updateOne(
    { _id: c.job._id },
    { $set: { resultSha256: A, resultReceivedAt: t0, resultPath: `${c.job._id}/result-${A}.json`, decision: 'apply', status: 'applying' } }
  );
  assert.deepEqual(await resumeStalledApply(c.job._id, { env }), { ok: false, code: 'result_unavailable' });
  assert.equal((await load(c.job._id)).status, 'applying');
});
