import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  computeHandoffGeometry,
  handoffProgress,
  handoffFrame,
  MIN_HANDOFF_DISTANCE,
  HANDOFF_SWAP_DISTANCE,
  FOLLOW_FADE_END,
  GLOW_FADE_END
} from './logoHandoff.js'

// ספר 256px שמרכזו ב-(1000, 300) במסך בגלילה 0; משבצת לוגו 32px שמרכזה ב-(1300, 32)
const source = { left: 872, top: 172, width: 256, height: 256 }
const target = { left: 1284, top: 16, width: 32, height: 32 }

test('computeHandoffGeometry: הזזה, גודל, קנה מידה במנוחה ואורך המעבר', () => {
  const g = computeHandoffGeometry({ source, target, scrollY: 0 })
  assert.deepEqual(g, { dx: -300, dy: 268, size: 256, restScale: 0.125, end: 268, exit: 380 })
})

test('computeHandoffGeometry: מדידה בזמן גלילה מחזירה את אותה גיאומטריה (קואורדינטות מסמך)', () => {
  const scrolled = { ...source, top: source.top - 150 }
  assert.deepEqual(
    computeHandoffGeometry({ source: scrolled, target, scrollY: 150 }),
    computeHandoffGeometry({ source, target, scrollY: 0 })
  )
})

test('computeHandoffGeometry: targetScale מגדיל רק את קנה המידה במנוחה', () => {
  const g = computeHandoffGeometry({ source, target, targetScale: 1.15 })
  assert.equal(g.restScale, 0.144)
  assert.equal(g.dx, -300)
})

test('computeHandoffGeometry: ספר צמוד לכותרת — אורך מינימלי, לא אפס', () => {
  const near = { left: 872, top: 0, width: 64, height: 64 }
  assert.equal(computeHandoffGeometry({ source: near, target }).end, MIN_HANDOFF_DISTANCE)
})

test('computeHandoffGeometry: מלבן ריק/חסר → null', () => {
  assert.equal(computeHandoffGeometry({ source: { ...source, width: 0 }, target }), null)
  assert.equal(computeHandoffGeometry({ source, target: null }), null)
})

test('handoffProgress: חסום בין 0 ל-1', () => {
  assert.equal(handoffProgress(-10, 200), 0)
  assert.equal(handoffProgress(50, 200), 0.25)
  assert.equal(handoffProgress(500, 200), 1)
  assert.equal(handoffProgress(10, 0), 1)
})

test('handoffFrame: התחלה — המעופף על הספר הגדול, בגודל מלא ושקוף', () => {
  const g = computeHandoffGeometry({ source, target })
  const f = handoffFrame(g, 0)
  assert.equal(f.transform, 'translate(-300px, 268px) scale(1)')
  assert.equal(f.flyerOpacity, 0)
  assert.equal(f.sourceOpacity, 1)
  assert.equal(f.wordmarkOpacity, 0)
})

test('handoffFrame: התנועה האנכית צמודה לגלילה 1:1', () => {
  const g = computeHandoffGeometry({ source, target })
  const f = handoffFrame(g, 100)
  // מרכז הספר הגדול היה נגלל ל-300-100=200; מרכז המשבצת 32 → הזזה 168
  assert.match(f.transform, /translate\(-188\.06px, 168px\)/)
  assert.equal(f.flyerOpacity, 1)
  assert.equal(f.sourceOpacity, 0)
})

test('handoffFrame: חלון ההחלפה הקצר — הצלבה הדרגתית', () => {
  const f = handoffFrame(computeHandoffGeometry({ source, target }), HANDOFF_SWAP_DISTANCE / 2)
  assert.equal(f.flyerOpacity, 0.5)
  assert.equal(f.sourceOpacity, 0.5)
})

test('handoffFrame: סוף — במשבצת, מוקטן, שם האתר מוצג', () => {
  const g = computeHandoffGeometry({ source, target })
  const f = handoffFrame(g, 1000)
  assert.equal(f.transform, 'translate(0px, 0px) scale(0.125)')
  assert.equal(f.wordmarkOpacity, 1)
  assert.equal(f.glowOpacity, 0)
})

test('handoffFrame: reduced-motion — בלי תנועה, הופעה רק אחרי שהספר יצא מהמסך', () => {
  const g = computeHandoffGeometry({ source, target })
  const before = handoffFrame(g, g.exit - 1, { reducedMotion: true })
  const after = handoffFrame(g, g.exit, { reducedMotion: true })
  assert.equal(before.transform, 'scale(0.125)')
  assert.equal(before.flyerOpacity, 0)
  assert.equal(before.sourceOpacity, 1)
  assert.equal(after.flyerOpacity, 1)
  assert.equal(after.wordmarkOpacity, 1)
})

test('handoffFrame: המלווה ("חינם לנצח!") צמוד למעופף — אותה סחיפה ואותו קנה מידה', () => {
  const g = computeHandoffGeometry({ source, target })
  const start = handoffFrame(g, 0)
  assert.equal(start.followTransform, 'translate(0px, 0px) scale(1)')
  assert.equal(start.followOpacity, 1)
  // באמצע: מרכז המעופף זז אופקית ב-dx/2 מהמקום שבו הספר שבדף נמצא — וכך גם המלווה
  const mid = handoffFrame(g, g.end / 2)
  assert.equal(mid.followTransform, 'translate(150px, 0px) scale(0.563)')
  assert.equal(mid.transform.split(' scale')[1], mid.followTransform.split(' scale')[1])
  assert.equal(mid.followOpacity, 0)
})

test('handoffFrame: המלווה דועך בהדרגה ונעלם ב-FOLLOW_FADE_END', () => {
  const g = computeHandoffGeometry({ source, target })
  assert.equal(handoffFrame(g, g.end * FOLLOW_FADE_END / 2).followOpacity, 0.5)
  assert.equal(handoffFrame(g, g.end * FOLLOW_FADE_END).followOpacity, 0)
})

test('handoffFrame: ההילה דועכת לאט מהשורה ונעלמת ב-GLOW_FADE_END — לפני הנחיתה בכותרת', () => {
  const g = computeHandoffGeometry({ source, target })
  assert.ok(GLOW_FADE_END > FOLLOW_FADE_END && GLOW_FADE_END < 1)
  assert.equal(handoffFrame(g, 0).glowOpacity, 1)
  assert.equal(handoffFrame(g, g.end * GLOW_FADE_END / 2).glowOpacity, 0.5)
  assert.equal(handoffFrame(g, g.end * GLOW_FADE_END).glowOpacity, 0)
})

test('handoffFrame: מלווה כש-end ארוך מהמרחק — מפצה אנכית', () => {
  const near = computeHandoffGeometry({ source: { left: 872, top: 0, width: 64, height: 64 }, target })
  const f = handoffFrame(near, near.end)
  assert.equal(f.followTransform, `translate(${-near.dx}px, ${near.end - near.dy}px) scale(${near.restScale})`)
})

test('handoffFrame: reduced-motion — המלווה לא זז ולא דועך', () => {
  const g = computeHandoffGeometry({ source, target })
  const f = handoffFrame(g, 100, { reducedMotion: true })
  assert.equal(f.followTransform, 'none')
  assert.equal(f.followOpacity, 1)
  assert.equal(f.glowOpacity, 1)
})

test('handoffFrame: בלי גיאומטריה — לוגו רגיל, גלוי', () => {
  const f = handoffFrame(null, 0)
  assert.equal(f.transform, 'none')
  assert.equal(f.flyerOpacity, 1)
})
