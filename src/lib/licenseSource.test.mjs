import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  LICENSE_COMMIT_SHA,
  LICENSE_RAW_URL,
  LICENSE_BLOB_URL,
  LICENSE_MAX_LENGTH,
  isValidLicenseText,
  fetchLicenseText,
} from './licenseSource.js';

test('ה-URL מוצמד ל-commit SHA מלא ולא לענף', () => {
  assert.match(LICENSE_COMMIT_SHA, /^[0-9a-f]{40}$/);
  assert.equal(LICENSE_RAW_URL, `https://raw.githubusercontent.com/Otzaria/otzaria/${LICENSE_COMMIT_SHA}/LICENSE`);
  assert.ok(LICENSE_BLOB_URL.includes(LICENSE_COMMIT_SHA));
  assert.ok(!LICENSE_RAW_URL.includes('/dev/'));
});

test('isValidLicenseText: תוכן תקין', () => {
  assert.equal(isValidLicenseText('Personal Use License\nVersion 1.0'), true);
});

test('isValidLicenseText: דוחה HTML, חסר ביטוי, ריק, ארוך מדי ולא-מחרוזת', () => {
  assert.equal(isValidLicenseText('<!DOCTYPE html><html>Personal Use License</html>'), false);
  assert.equal(isValidLicenseText('  <html><body>Personal Use License'), false);
  assert.equal(isValidLicenseText('GNU GENERAL PUBLIC LICENSE'), false);
  assert.equal(isValidLicenseText(''), false);
  assert.equal(isValidLicenseText('Personal Use License' + 'x'.repeat(LICENSE_MAX_LENGTH)), false);
  assert.equal(isValidLicenseText(null), false);
});

test('fetchLicenseText: הצלחה, סטטוס שגוי ותוכן לא תקין', async () => {
  const orig = globalThis.fetch;
  try {
    let seen;
    globalThis.fetch = async (url, opts) => { seen = { url, opts }; return new Response('Personal Use License 1.0'); };
    assert.equal(await fetchLicenseText(), 'Personal Use License 1.0');
    assert.equal(seen.url, LICENSE_RAW_URL);
    assert.ok(seen.opts.signal instanceof AbortSignal);

    globalThis.fetch = async () => new Response('nope', { status: 404 });
    await assert.rejects(fetchLicenseText());

    globalThis.fetch = async () => new Response('<html>Personal Use License</html>');
    await assert.rejects(fetchLicenseText());
  } finally {
    globalThis.fetch = orig;
  }
});
