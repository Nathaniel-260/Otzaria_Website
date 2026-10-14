import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  computeHandoffGeometry,
  handoffProgress,
  handoffFrame,
  MIN_HANDOFF_DISTANCE,
  HANDOFF_SWAP_DISTANCE,
  CROSSFADE_START,
  driftEase
} from './wordmarkHandoff.js'

// המילה בגיבור: 300×96 שמרכזה ב-(1000, 300) בגלילה 0; שם האתר בכותרת: 60×20 שמרכזו ב-(1300, 32)
const source = { left: 850, top: 252, width: 300, height: 96 }
const target = { left: 1270, top: 22, width: 60, height: 20 }

test('computeHandoffGeometry: הזזה, קנה מידה במנוחה ואורך המעבר', () => {
  assert.deepEqual(computeHandoffGeometry({ source, target, scrollY: 0 }), { dx: -300, dy: 268, restScale: 0.2, end: 268 })
})

test('computeHandoffGeometry: עם גדלי גופן — קנה המידה הוא יחסם (המשקלים שונים, ולכן גם הרוחב)', () => {
  const g = computeHandoffGeometry({ source, target, sourceFontSize: 96, targetFontSize: 24 })
  assert.equal(g.restScale, 0.25)
  assert.equal(g.dx, -300)
})

test('computeHandoffGeometry: מדידה בזמן גלילה מחזירה את אותה גיאומטריה (קואורדינטות מסמך)', () => {
  const scrolled = { ...source, top: source.top - 150 }
  assert.deepEqual(
    computeHandoffGeometry({ source: scrolled, target, scrollY: 150 }),
    computeHandoffGeometry({ source, target, scrollY: 0 })
  )
})

test('computeHandoffGeometry: מילה צמודה לכותרת — אורך מינימלי, לא אפס', () => {
  const near = { left: 850, top: 0, width: 120, height: 40 }
  assert.equal(computeHandoffGeometry({ source: near, target }).end, MIN_HANDOFF_DISTANCE)
})

test('computeHandoffGeometry: מלבן ריק/חסר → null', () => {
  assert.equal(computeHandoffGeometry({ source: { ...source, width: 0 }, target }), null)
  assert.equal(computeHandoffGeometry({ source, target: { ...target, width: 0 } }), null)
  assert.equal(computeHandoffGeometry({ source, target: null }), null)
})

test('handoffProgress: חסום בין 0 ל-1', () => {
  assert.equal(handoffProgress(-10, 200), 0)
  assert.equal(handoffProgress(50, 200), 0.25)
  assert.equal(handoffProgress(500, 200), 1)
  assert.equal(handoffProgress(10, 0), 1)
})

test('handoffFrame: התחלה — המעופף על המילה שבגיבור, בגודל מלא ושקוף', () => {
  const f = handoffFrame(computeHandoffGeometry({ source, target }), 0)
  assert.equal(f.transform, 'translate(-300px, 268px) scale(1)')
  assert.equal(f.flyerOpacity, 0)
  assert.equal(f.sourceOpacity, 1)
})

test('computeHandoffGeometry: riseRatio מקצר את המעבר — המילה עולה מהר מהדף', () => {
  assert.equal(computeHandoffGeometry({ source, target, riseRatio: 0.5 }).end, 134)
  // ערך לא תקין — 1:1
  assert.equal(computeHandoffGeometry({ source, target, riseRatio: 3 }).end, 268)
  assert.equal(computeHandoffGeometry({ source, target, riseRatio: 0 }).end, 268)
})

test('driftEase: t² — מתחיל לאט, מסתיים ב-1', () => {
  assert.equal(driftEase(0), 0)
  assert.equal(driftEase(0.5), 0.25)
  assert.equal(driftEase(1), 1)
})

test('handoffFrame: התנועה האנכית צמודה לגלילה 1:1, והסחיפה האופקית מואצת', () => {
  const f = handoffFrame(computeHandoffGeometry({ source, target }), 134)
  // באמצע: אנכית חצי הדרך (268→134), אופקית רק רבע (מ-300- ל-225-)
  assert.equal(f.transform, 'translate(-225px, 134px) scale(0.6)')
  assert.equal(f.flyerOpacity, 1)
  assert.equal(f.sourceOpacity, 0)
})

test('handoffFrame: ההחלפה חדה — תמיד בדיוק עותק אחד גלוי', () => {
  const g = computeHandoffGeometry({ source, target })
  for (const y of [0, HANDOFF_SWAP_DISTANCE - 0.5, HANDOFF_SWAP_DISTANCE, 40]) {
    const f = handoffFrame(g, y)
    assert.equal(f.flyerOpacity + f.sourceOpacity, 1)
    assert.ok([0, 1].includes(f.flyerOpacity))
  }
  assert.equal(handoffFrame(g, HANDOFF_SWAP_DISTANCE - 0.5).sourceOpacity, 1)
  assert.equal(handoffFrame(g, HANDOFF_SWAP_DISTANCE).flyerOpacity, 1)
})

test('handoffFrame: סוף — במקום שם האתר, מוקטן לגודלו, ומוחלף בטקסט הסטטי החד', () => {
  const f = handoffFrame(computeHandoffGeometry({ source, target }), 1000)
  assert.equal(f.transform, 'translate(0px, 0px) scale(0.2)')
  assert.equal(f.flyerOpacity, 0)
  assert.equal(f.targetOpacity, 1)
})

test('handoffFrame: ההצלבה לשם האתר הסטטי — רק בקטע האחרון, ובסכום קבוע', () => {
  const g = computeHandoffGeometry({ source, target })
  const before = handoffFrame(g, g.end * CROSSFADE_START)
  assert.equal(before.flyerOpacity, 1)
  assert.equal(before.targetOpacity, 0)
  const mid = handoffFrame(g, g.end * (CROSSFADE_START + 1) / 2)
  assert.equal(mid.flyerOpacity, 0.5)
  assert.equal(mid.targetOpacity, 0.5)
})

test('handoffFrame: reduced-motion — בלי מעבר: המילה נשארת בגיבור, המעופף מוסתר', () => {
  const g = computeHandoffGeometry({ source, target })
  for (const y of [0, 100, 1000]) {
    assert.deepEqual(handoffFrame(g, y, { reducedMotion: true }), { transform: 'none', flyerOpacity: 0, sourceOpacity: 1, targetOpacity: 1 })
  }
})

test('handoffFrame: בלי גיאומטריה — המילה בגיבור ושם האתר גלויים, המעופף מוסתר', () => {
  assert.deepEqual(handoffFrame(null, 0), { transform: 'none', flyerOpacity: 0, sourceOpacity: 1, targetOpacity: 1 })
})
