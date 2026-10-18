import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildSitemapEntries, SITE_URL, STATIC_PATHS } from './sitemapEntries.js'
import { isProtectedPath } from './protected-routes.js'

test('buildSitemapEntries: בלי נתונים — רק הדפים הקבועים', () => {
  const entries = buildSitemapEntries()
  assert.equal(entries.length, STATIC_PATHS.length)
  assert.equal(entries[0].url, SITE_URL)
  assert.ok(entries.every((entry) => entry.url.startsWith(`${SITE_URL}`)))
})

test('הדפים הקבועים אינם דורשים התחברות ואינם דפי noindex', () => {
  for (const path of STATIC_PATHS) {
    assert.equal(isProtectedPath(path), false, path)
  }
  assert.ok(!STATIC_PATHS.includes('/auth/login'))
  assert.ok(!STATIC_PATHS.includes('/plugins/search'))
})

test('buildSitemapEntries: מדריכים, קטגוריות ותוספים עם תאריך עדכון', () => {
  const entries = buildSitemapEntries({
    docSlugs: ['getting-started', '', 'getting-started'],
    categories: [{ slug: 'study', updatedAt: '2026-10-01T00:00:00.000Z' }, { slug: '' }],
    plugins: [
      { id: '6a00995054ae49eaed8d7033', updatedAt: new Date('2026-10-02T00:00:00.000Z') },
      { id: '6a01cd9954ae49eaed8dab2a', updatedAt: 'not-a-date' },
      { id: null }
    ]
  })
  const urls = entries.map((entry) => entry.url)

  assert.equal(urls.filter((url) => url === `${SITE_URL}/docs/getting-started`).length, 1)
  assert.ok(urls.includes(`${SITE_URL}/plugins/category/study`))
  assert.ok(urls.includes(`${SITE_URL}/plugins/6a00995054ae49eaed8d7033`))
  assert.equal(entries.length, STATIC_PATHS.length + 4)

  const plugin = entries.find((entry) => entry.url.endsWith('7033'))
  assert.equal(plugin.lastModified.toISOString(), '2026-10-02T00:00:00.000Z')
  // תאריך לא תקין → בלי lastModified (לא Invalid Date ב-XML)
  const badDate = entries.find((entry) => entry.url.endsWith('ab2a'))
  assert.ok(!('lastModified' in badDate))
})

test('buildSitemapEntries: slug עם תווים מיוחדים מקודד', () => {
  const [entry] = buildSitemapEntries({ docSlugs: ['a b&c'] }).slice(-1)
  assert.equal(entry.url, `${SITE_URL}/docs/a%20b%26c`)
})
