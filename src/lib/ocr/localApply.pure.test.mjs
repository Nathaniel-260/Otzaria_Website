import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ackBody,
  failedOutcomeClasses,
  isValidAck,
  jobErrorText,
  MISSING_PAGE_MESSAGE,
  pageApplyFilter,
  pageApplySet,
  pageErrorMessage,
  storedAckAnswer,
  summarizeApply,
} from './localApply.pure.js';
import { buildPageUpdate } from './runOcrJob.pure.js';

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
  const re = skip.content.$not;
  assert.equal(re.test('  \n'), false);
  assert.equal(re.test('טקסט'), true);
  const over = pageApplyFilter({ ...job, existingTextMode: 'overwrite' }, entry);
  assert.deepEqual(Object.keys(over), ['_id', 'book', 'updatedAt', 'lastOcrJobId']);
  assert.equal(pageApplyFilter(job, { page: 'P' }).updatedAt, null);
});

test('pageApplySet: אותם שדות טקסט כמו gemini/ocrwin + שדות המעקב', () => {
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
