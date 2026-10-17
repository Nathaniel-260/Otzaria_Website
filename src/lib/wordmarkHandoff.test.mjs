import { test } from 'node:test'
import assert from 'node:assert/strict'
import { handoffState, handoffRootMargin, HANDOFF_STATE } from './wordmarkHandoff.js'

test('handoffState: המילה עוד נראית מתחת לכותרת (גם פיקסל אחד) — hero', () => {
  assert.equal(handoffState({ sourceBottom: 300, headerBottom: 64 }), HANDOFF_STATE.hero)
  assert.equal(handoffState({ sourceBottom: 64.5, headerBottom: 64 }), HANDOFF_STATE.hero)
})

test('handoffState: המילה מוסתרת כולה מתחת לכותרת, או מעליה — docked', () => {
  assert.equal(handoffState({ sourceBottom: 64, headerBottom: 64 }), HANDOFF_STATE.docked)
  assert.equal(handoffState({ sourceBottom: -500, headerBottom: 64 }), HANDOFF_STATE.docked)
})

test('handoffState: מדידה לא תקינה — off (שם אתר רגיל, לא מוסתר לתמיד)', () => {
  assert.equal(handoffState({ sourceBottom: NaN, headerBottom: 64 }), HANDOFF_STATE.off)
  assert.equal(handoffState({ sourceBottom: 100, headerBottom: undefined }), HANDOFF_STATE.off)
})

test('handoffRootMargin: מוריד את גובה הכותרת מראש ה-viewport', () => {
  assert.equal(handoffRootMargin(64), '-64px 0px 0px 0px')
  assert.equal(handoffRootMargin(63.6), '-64px 0px 0px 0px')
  assert.equal(handoffRootMargin(NaN), '-0px 0px 0px 0px')
})
