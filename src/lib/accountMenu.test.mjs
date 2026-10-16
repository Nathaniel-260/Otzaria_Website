/**
 * בדיקות ללוגיקה של אזור החשבון בכותרות (src/lib/accountMenu.js). הרצה: npm test
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  accountButtonLabel,
  accountMenuLinks,
  adminHref,
  loginHref,
  shortName,
  unreadMessagesLabel,
  userInitial
} from './accountMenu.js'

test('loginHref: callbackUrl מקודד, ובלעדיו — דף ההתחברות בלבד', () => {
  assert.equal(loginHref('/plugins/a b'), '/auth/login?callbackUrl=%2Fplugins%2Fa%20b')
  assert.equal(loginHref(), '/auth/login')
})

test('adminHref: מפתח לדיווחי התוכנה, כל סוגי המנהלים ללוח הניהול, משתמש רגיל — אין', () => {
  assert.equal(adminHref('developer'), '/library/admin/app-reports')
  for (const role of ['admin', 'admin_plugins', 'admin_books', 'admin_books_only', 'admin_ocr', 'model_trainer']) {
    assert.equal(adminHref(role), '/library/admin', role)
  }
  assert.equal(adminHref('user'), null)
  assert.equal(adminHref(undefined), null)
})

test('userInitial / shortName: אות ראשונה ומילה ראשונה, עם ברירת מחדל בלי שם', () => {
  assert.equal(userInitial('  ישראל ישראלי '), 'י')
  assert.equal(userInitial('dan'), 'D')
  assert.equal(userInitial(''), null)
  assert.equal(shortName('ישראל ישראלי'), 'ישראל')
  assert.equal(shortName(null), 'החשבון שלי')
})

test('accountButtonLabel: השם המלא, ומונה ההודעות כשיש', () => {
  assert.equal(accountButtonLabel('ישראל ישראלי'), 'החשבון של ישראל ישראלי')
  assert.equal(accountButtonLabel(''), 'החשבון שלי')
  assert.equal(accountButtonLabel('דן', 1), 'החשבון של דן, הודעה חדשה אחת')
  assert.equal(unreadMessagesLabel(4), ', 4 הודעות חדשות')
})

test('accountMenuLinks: לוח בקרה לכולם; ניהול רק למורשים, עם מונה', () => {
  assert.deepEqual(accountMenuLinks('user').map(l => l.href), ['/library/dashboard'])
  const admin = accountMenuLinks('admin', 3)
  assert.deepEqual(admin.map(l => l.href), ['/library/dashboard', '/library/admin'])
  assert.equal(admin[1].badge, 3)
  assert.equal(accountMenuLinks('admin', 0)[1].badge, undefined)
  assert.equal(accountMenuLinks('developer')[1].href, '/library/admin/app-reports')
})
