import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONFLICT_APPLY_LEASE_MS,
  CONFLICTS_PAGE_DEFAULT,
  CONFLICTS_PAGE_MAX,
  conflictApplyLanded,
  conflictApplyStale,
  parseClientDate,
  parsePaging,
  serializeConflict,
} from './ocrConflictView.js';

const at = new Date('2026-10-20T08:00:00.123Z');

test('serializeConflict: טקסט OCR מול הטקסט הנוכחי ו-updatedAt של העמוד', () => {
  const out = serializeConflict(
    { _id: 'c1', job: 'j1', page: 'p1', pageNumber: 4, ocrText: 'אוצר', status: 'open', createdAt: at, expectedUpdatedAt: at },
    { _id: 'p1', content: 'אנושי', isTwoColumns: false, updatedAt: at }
  );
  assert.equal(out.id, 'c1');
  assert.equal(out.pageNumber, 4);
  assert.equal(out.reason, 'page_changed');
  assert.equal(out.ocrText, 'אוצר');
  assert.equal(out.pageContent, 'אנושי');
  assert.equal(out.pageExists, true);
  assert.equal(out.pageUpdatedAt, at.toISOString());
  assert.equal(out.resolvedAt, null);
});

test('serializeConflict: עמוד שנמחק', () => {
  const out = serializeConflict({ _id: 'c', job: 'j', page: 'p' }, null);
  assert.equal(out.pageExists, false);
  assert.equal(out.pageUpdatedAt, null);
  assert.equal(out.pageContent, '');
  assert.equal(out.status, 'open');
});

test('parsePaging: ברירות מחדל, תקרה וערכים שגויים', () => {
  const p = (qs) => parsePaging(new URLSearchParams(qs));
  assert.deepEqual(p(''), { limit: CONFLICTS_PAGE_DEFAULT, offset: 0 });
  assert.deepEqual(p('limit=10&offset=20'), { limit: 10, offset: 20 });
  assert.deepEqual(p('limit=100000'), { limit: CONFLICTS_PAGE_MAX, offset: 0 });
  assert.deepEqual(p('limit=-3&offset=abc'), { limit: CONFLICTS_PAGE_DEFAULT, offset: 0 });
});

test('parseClientDate', () => {
  assert.equal(parseClientDate(at.toISOString()).getTime(), at.getTime());
  assert.equal(parseClientDate('nope'), null);
  assert.equal(parseClientDate(123), null);
  assert.equal(parseClientDate('x'.repeat(100)), null);
});

test('conflictApplyStale: רק applying שה-lease שלו פג או חסר', () => {
  const until = new Date(at.getTime() + CONFLICT_APPLY_LEASE_MS);
  assert.equal(conflictApplyStale({ status: 'open', applyLeaseUntil: at }, until), false);
  assert.equal(conflictApplyStale({ status: 'applying', applyLeaseUntil: until }, at), false);
  assert.equal(conflictApplyStale({ status: 'applying', applyLeaseUntil: until }, until), true);
  assert.equal(conflictApplyStale({ status: 'applying' }, at), true);
});

test('conflictApplyLanded: סימון העבודה וה-sha, ו-lastOcrAt זהה בדיוק למועד תחילת האימוץ', () => {
  const conflict = { job: 'j1', resultSha256: 's', applyStartedAt: at };
  const page = { lastOcrJobId: 'j1', lastOcrResultSha256: 's', lastOcrAt: new Date(at.getTime()) };
  assert.equal(conflictApplyLanded(page, conflict), true);
  assert.equal(conflictApplyLanded({ ...page, lastOcrAt: new Date(at.getTime() + 1) }, conflict), false);
  assert.equal(conflictApplyLanded({ ...page, lastOcrJobId: 'j2' }, conflict), false);
  assert.equal(conflictApplyLanded({ ...page, lastOcrResultSha256: 'x' }, conflict), false);
  assert.equal(conflictApplyLanded({ ...page, lastOcrAt: null }, conflict), false);
  assert.equal(conflictApplyLanded(null, conflict), false);
  assert.equal(conflictApplyLanded(page, { ...conflict, applyStartedAt: null }), false);
});
