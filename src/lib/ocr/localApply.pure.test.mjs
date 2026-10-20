import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ackBody,
  closingStatusFields,
  failedOutcomeClasses,
  isValidAck,
  jobErrorText,
  MISSING_PAGE_MESSAGE,
  NON_TRIM_CHAR_PCRE,
  pageApplyFilter,
  pageApplySet,
  pageErrorMessage,
  RESUME_RETRY_MAX_MS,
  resumeFailureBacksOff,
  resumeFailureTransient,
  resumeRetryDelayMs,
  storedAckAnswer,
  storedPipelineVersion,
  STORED_ERROR_CHARS,
  STORED_PIPELINE_VERSION_CHARS,
  summarizeApply,
} from './localApply.pure.js';
import { stripUnsafe } from './localStatusReport.js';
import { buildPageUpdate, pageHasText } from './runOcrJob.pure.js';

const C = 'c'.repeat(64);

// contracts/examples/ack-*.json
const ACK_EXAMPLES = [
  { ack: 'accepted', jobId: 'job-0001', resultSha256: C, outcome: 'success' },
  { ack: 'already_received', jobId: 'job-0001', resultSha256: C, outcome: 'success' },
  { ack: 'cancelled', jobId: 'job-0001', resultSha256: C, outcome: 'cancelled' },
];

test('ackBody: בדיוק ארבעה שדות בסדר החוזה; דוגמאות החוזה תקינות', () => {
  assert.deepEqual(Object.keys(ackBody('accepted', 'job-0001', C, 'success')), ['ack', 'jobId', 'resultSha256', 'outcome']);
  assert.equal(ackBody('accepted', { toString: () => 'abc' }, C, 'success').jobId, 'abc');
  for (const a of ACK_EXAMPLES) assert.equal(isValidAck(a), true, a.ack);
});

test('isValidAck: חסר/עודף/null/אותיות גדולות/רשימה/cancelled עם outcome אחר — לא ack', () => {
  const base = ACK_EXAMPLES[0];
  const { outcome: _o, ...noOutcome } = base;
  for (const bad of [
    noOutcome,
    { ...base, extra: 1 },
    { ...base, outcome: null },
    { ...base, ack: 'Accepted' },
    { ...base, outcome: 'success, partial' },
    { ...base, resultSha256: C.toUpperCase() },
    { ...base, jobId: 'a/b' },
    { ...base, ack: 'cancelled', outcome: 'success' },
    null,
    [],
    'accepted',
  ]) {
    assert.equal(isValidAck(bad), false, JSON.stringify(bad));
  }
});

test('storedAckAnswer: accepted → already_received עם אותו outcome; cancelled נשאר cancelled', () => {
  assert.deepEqual(storedAckAnswer({ ack: 'accepted', jobId: 'j1', resultSha256: C, outcome: 'partial' }), {
    ack: 'already_received',
    jobId: 'j1',
    resultSha256: C,
    outcome: 'partial',
  });
  assert.deepEqual(storedAckAnswer({ ack: 'cancelled', jobId: 'j1', resultSha256: C, outcome: 'cancelled' }), {
    ack: 'cancelled',
    jobId: 'j1',
    resultSha256: C,
    outcome: 'cancelled',
  });
  assert.equal(storedAckAnswer(null), null);
  assert.equal(storedAckAnswer({ ack: null }), null);
});

test('pageApplyFilter: updatedAt + ספר + לא נכתב ע"י העבודה; skip מוסיף "ריק", overwrite לא', () => {
  const at = new Date('2026-10-01T00:00:00Z');
  const job = { _id: 'J', book: 'B', existingTextMode: 'skip' };
  const entry = { page: 'P', expectedUpdatedAt: at };
  const skip = pageApplyFilter(job, entry);
  assert.deepEqual(Object.keys(skip), ['_id', 'book', 'updatedAt', 'lastOcrJobId', 'content', 'rightColumn', 'leftColumn']);
  assert.equal(skip._id, 'P');
  assert.equal(skip.book, 'B');
  assert.equal(skip.updatedAt, at);
  assert.deepEqual(skip.lastOcrJobId, { $ne: 'J' });
  assert.deepEqual(skip.content, { $not: { $regex: NON_TRIM_CHAR_PCRE } });
  assert.deepEqual(skip.rightColumn, skip.content);
  assert.deepEqual(skip.leftColumn, skip.content);
  const over = pageApplyFilter({ ...job, existingTextMode: 'overwrite' }, entry);
  assert.deepEqual(Object.keys(over), ['_id', 'book', 'updatedAt', 'lastOcrJobId']);
  assert.equal(pageApplyFilter(job, { page: 'P' }).updatedAt, null);
});

test('"ריק" במצב skip זהה בדיוק ל-pageHasText (trim) — כולל NBSP/BOM/רווחי Unicode', () => {
  assert.equal(NON_TRIM_CHAR_PCRE.includes('\\u'), false); // PCRE של MongoDB לא מכיר את התחביר \u
  // אותה תבנית ב-JS (\x{HH} → \uHHHH) — להשוואה מול trim על כל ה-BMP
  const re = new RegExp(NON_TRIM_CHAR_PCRE.replace(/\\x\{([0-9a-f]+)\}/g, (_, h) => `\\u${h.padStart(4, '0')}`));
  for (let c = 0; c <= 0xffff; c++) {
    if (c >= 0xd800 && c <= 0xdfff) continue;
    const s = String.fromCharCode(c);
    assert.equal(!re.test(s), !pageHasText({ content: s }), `U+${c.toString(16)}`);
  }
  assert.equal(re.test('\u00a0\ufeff\u3000 \n'), false);
  assert.equal(re.test('\u00a0א'), true);
  assert.deepEqual(pageApplyFilter({ _id: 'J', book: 'B' }, { page: 'P' }).content, { $not: { $regex: NON_TRIM_CHAR_PCRE } });
});

test('pageApplySet:אותם שדות טקסט כמו gemini/ocrwin + שדות המעקב', () => {
  const now = new Date();
  assert.deepEqual(pageApplySet('שלום', 'J', C, now), {
    ...buildPageUpdate('שלום'),
    lastOcrJobId: 'J',
    lastOcrResultSha256: C,
    lastOcrAt: now,
  });
});

test('pageErrorMessage: עברית, קוד והודעה מנוקים מתווי בקרה/כיווניות ומקוצרים', () => {
  assert.equal(pageErrorMessage({ code: 'layout_failed', message: 'layout failed' }), 'שגיאת OCR במחשב המקומי (layout_failed): layout failed');
  assert.equal(pageErrorMessage({ code: 'x' + String.fromCharCode(0x202e), message: '' }), 'שגיאת OCR במחשב המקומי (x)');
  assert.equal(pageErrorMessage({}), 'שגיאת OCR במחשב המקומי (unknown)');
  assert.ok(Array.from(pageErrorMessage({ code: 'c', message: 'מ'.repeat(2000) })).length <= 500);
});

test('jobErrorText: failed → "<code>: <message>"; כל העמודים נכשלו; אחר → ריק', () => {
  assert.equal(jobErrorText({ outcome: 'failed', error: { code: 'gpu_unavailable', message: 'AMD GPU not available' } }), 'gpu_unavailable: AMD GPU not available');
  assert.equal(jobErrorText({ outcome: 'failed', error: { code: 'x', message: '' } }), 'x');
  assert.equal(jobErrorText({ outcome: 'failed', pages: [] }), 'כל העמודים נכשלו בעיבוד במחשב המקומי');
  assert.equal(jobErrorText({ outcome: 'partial' }), '');
});

const MAP = [1, 2, 3, 4].map((i) => ({ pdfPageIndex: i, pageNumber: i * 10, page: `p${i}` }));

test('summarizeApply: success/partial — מונים לפי הסיווג ו-pageErrors ממוינים (failed+missing)', () => {
  const classes = [
    { entry: MAP[3], kind: 'missing', message: MISSING_PAGE_MESSAGE },
    { entry: MAP[0], kind: 'applied' },
    { entry: MAP[1], kind: 'failed', message: 'm' },
    { entry: MAP[2], kind: 'conflict' },
  ];
  assert.deepEqual(summarizeApply({ outcome: 'partial' }, MAP, classes), {
    successPages: 1,
    failedPages: 1,
    conflictPages: 1,
    missingPages: 1,
    processedPages: 4,
    pageErrors: [
      { pageNumber: 20, message: 'm' },
      { pageNumber: 40, message: MISSING_PAGE_MESSAGE },
    ],
    error: '',
  });
});

test('summarizeApply: failed — כל העמודים נכשלו, error; cancelled — אפסים בלי processedPages', () => {
  const doc = { outcome: 'failed', pages: [{ pdfPageIndex: 2, error: { code: 'e', message: '' } }], error: { code: 'gpu', message: 'no' } };
  const failed = summarizeApply(doc, MAP, failedOutcomeClasses(doc, MAP));
  assert.equal(failed.successPages, 0);
  assert.equal(failed.failedPages, 4);
  assert.equal(failed.processedPages, 4);
  assert.equal(failed.error, 'gpu: no');
  assert.deepEqual(failed.pageErrors, [{ pageNumber: 20, message: 'שגיאת OCR במחשב המקומי (e)' }]);
  const cancelled = summarizeApply({ outcome: 'cancelled' }, MAP, []);
  assert.equal('processedPages' in cancelled, false);
  assert.equal(cancelled.successPages, 0);
});

test('storedPipelineVersion: מקוצר ל-200 תווים ומנוקה (הסכמה לא מגבילה — לא 422, ולא 500 על ערך ענק)', () => {
  assert.equal(storedPipelineVersion('0.1.0'), '0.1.0');
  assert.equal(storedPipelineVersion(' tess' + String.fromCharCode(0x202e) + '-5 \t'), 'tess-5');
  assert.equal(storedPipelineVersion(''), '');
  assert.equal(storedPipelineVersion(undefined), '');
  const huge = 'v'.repeat(20 * 1024 * 1024);
  const t0 = Date.now();
  const out = storedPipelineVersion(huge);
  assert.equal(out.length, STORED_PIPELINE_VERSION_CHARS);
  assert.ok(Date.now() - t0 < 1000, 'לא סורק/מעתיק את כל הקלט');
  // קיצור לפי נקודות קוד — לא חוצה זוג surrogate
  assert.equal(Array.from(storedPipelineVersion('😀'.repeat(300))).length, STORED_PIPELINE_VERSION_CHARS);
});

test('stripUnsafe: עוצר אחרי maxChars (זיכרון חסום), אותה תוצאה כמו קודם', () => {
  assert.equal(stripUnsafe('a\u0000b\u200fc', 2), 'ab');
  assert.equal(stripUnsafe('abc', 0), '');
  assert.equal(stripUnsafe('😀x', 1), '😀');
  const out = stripUnsafe('\u0001'.repeat(1000) + 'x'.repeat(30 * 1024 * 1024), 5);
  assert.equal(out, 'xxxxx');
});

test('jobErrorText/pageErrorMessage: הודעת שגיאה ענקית מהעובד מקוצרת בלי לנפח זיכרון', () => {
  const message = 'm'.repeat(30 * 1024 * 1024);
  const text = jobErrorText({ outcome: 'failed', error: { code: 'x', message } });
  assert.ok(Array.from(text).length <= STORED_ERROR_CHARS);
  assert.ok(Array.from(pageErrorMessage({ code: 'c'.repeat(1e6), message })).length <= STORED_ERROR_CHARS);
});

test('closingStatusFields: partial בלי שום עמוד שנקלט ובלי התנגשות → failed עם errorCode; אחרת לפי ה-outcome', () => {
  const none = { successPages: 0, conflictPages: 0 };
  assert.deepEqual(Object.keys(closingStatusFields('partial', none)).sort(), ['error', 'errorCode', 'status']);
  assert.equal(closingStatusFields('partial', none).status, 'failed');
  assert.equal(closingStatusFields('partial', none).errorCode, 'no_pages_succeeded');
  assert.match(closingStatusFields('partial', none).error, /אף עמוד/);
  assert.deepEqual(closingStatusFields('partial', { successPages: 1, conflictPages: 0 }), { status: 'completed' });
  assert.deepEqual(closingStatusFields('partial', { successPages: 0, conflictPages: 2 }), { status: 'completed' });
  assert.deepEqual(closingStatusFields('success', none), { status: 'completed' });
  assert.deepEqual(closingStatusFields('failed', none), { status: 'failed' });
  assert.deepEqual(closingStatusFields('cancelled', none), { status: 'cancelled' });
});

test('resumeRetryDelayMs: שעה, ומוכפל עד תקרה של יממה (ממשיך לנסות לעד)', () => {
  const H = 60 * 60 * 1000;
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 100].map(resumeRetryDelayMs), [H, 2 * H, 4 * H, 8 * H, 16 * H, 24 * H, 24 * H, 24 * H]);
  assert.equal(resumeRetryDelayMs(0), H);
  assert.equal(resumeRetryDelayMs(undefined), H);
  assert.equal(resumeRetryDelayMs(1e9), RESUME_RETRY_MAX_MS);
});

test('resumeFailureBacksOff: קובץ חסר/פגום/חריגה → דוחים; החלה חיה / עבודה שנסגרה → לא', () => {
  for (const c of ['result_unavailable', 'result_corrupt', 'result_invalid', 'job_closed', 'internal_error', 'EACCES']) {
    assert.equal(resumeFailureBacksOff(c), true, c);
  }
  for (const c of ['applied', 'cancelled', 'already_closed', 'not_stalled', 'not_found', 'apply_in_progress']) {
    assert.equal(resumeFailureBacksOff(c), false, c);
  }
});

test('resumeRetryDelayMs transient: 5 דקות ומוכפל עד יממה; resumeFailureTransient — קובץ חסר/פגום קבוע, חריגות זמניות', () => {
  const M = 60 * 1000;
  assert.deepEqual([1, 2, 3, 4, 5].map((n) => resumeRetryDelayMs(n, { transient: true })), [5 * M, 10 * M, 20 * M, 40 * M, 80 * M]);
  assert.equal(resumeRetryDelayMs(100, { transient: true }), RESUME_RETRY_MAX_MS);
  for (const c of ['result_unavailable', 'result_corrupt', 'result_invalid', 'job_closed']) {
    assert.equal(resumeFailureTransient(c), false, c);
  }
  for (const c of ['internal_error', 'EACCES', 'EISDIR', 'MongoNetworkError', 'error']) {
    assert.equal(resumeFailureTransient(c), true, c);
  }
});
