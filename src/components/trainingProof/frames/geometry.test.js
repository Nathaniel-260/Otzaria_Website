import { describe, it, expect } from 'vitest'
import {
  hitTest,
  cursorFor,
  moveBox,
  resizeBox,
  withRole,
  streamSeq,
  nextFid,
  renumber,
  applyOrder,
  normRect,
  clampBox,
  roundBox,
} from './geometry'

// בדיקת-הקצוות (ה-8) ושאר הגיאומטריה של העורך — טהור

const F = (fid, box, extra = {}) => ({ fid, kind: 'text', role: 'body', box, stream: 's1', ord: null, cont: false, src: 'auto', ...extra })

describe('hitTest — קצוות, פינות, גוף ומקום ריק', () => {
  const frames = [F('big', [100, 100, 500, 700]), F('small', [200, 200, 300, 260])]
  const tol = 8

  it('מקום ריק — null, והסמן צלב (ציור, ה-9)', () => {
    const h = hitTest(frames, { x: 20, y: 20 }, tol)
    expect(h).toBeNull()
    expect(cursorFor(h)).toBe('crosshair')
  })

  it('גוף המסגרת — הזזה', () => {
    const h = hitTest(frames, { x: 400, y: 500 }, tol)
    expect(h).toMatchObject({ fid: 'big', edge: false })
    expect(cursorFor(h)).toBe('move')
  })

  it('כל צד — חץ בכיוון הנכון, גם מעט מבחוץ', () => {
    expect(cursorFor(hitTest(frames, { x: 96, y: 400 }, tol))).toBe('ew-resize') // שמאל, מבחוץ
    expect(cursorFor(hitTest(frames, { x: 505, y: 400 }, tol))).toBe('ew-resize') // ימין
    expect(cursorFor(hitTest(frames, { x: 300, y: 103 }, tol))).toBe('ns-resize') // למעלה, מבפנים
    expect(cursorFor(hitTest(frames, { x: 300, y: 706 }, tol))).toBe('ns-resize') // למטה
  })

  it('פינות — חצים אלכסוניים', () => {
    expect(cursorFor(hitTest(frames, { x: 101, y: 101 }, tol))).toBe('nwse-resize')
    expect(cursorFor(hitTest(frames, { x: 499, y: 699 }, tol))).toBe('nwse-resize')
    expect(cursorFor(hitTest(frames, { x: 499, y: 101 }, tol))).toBe('nesw-resize')
    expect(cursorFor(hitTest(frames, { x: 101, y: 699 }, tol))).toBe('nesw-resize')
    expect(hitTest(frames, { x: 101, y: 101 }, tol).ed).toEqual({ l: true, r: false, t: true, b: false })
  })

  it('מסגרת קטנה בתוך גדולה — הקטנה נתפסת', () => {
    expect(hitTest(frames, { x: 250, y: 230 }, tol).fid).toBe('small')
  })

  it('מסגרת צרה: הקצה הקרוב מנצח, ואמצעה נשאר להזזה', () => {
    const thin = [F('t', [100, 100, 112, 400])]
    expect(hitTest(thin, { x: 106, y: 250 }, tol).edge).toBe(false)
    expect(hitTest(thin, { x: 101, y: 250 }, tol).ed).toMatchObject({ l: true, r: false })
    expect(hitTest(thin, { x: 111, y: 250 }, tol).ed).toMatchObject({ l: false, r: true })
  })

  it('מצב סדר-הקריאה וקריאה-בלבד — בלי חיצים', () => {
    const h = hitTest(frames, { x: 101, y: 101 }, tol)
    expect(cursorFor(h, 'order')).toBe('pointer')
    expect(cursorFor(null, 'order')).toBe('default')
    expect(cursorFor(h, 'readOnly')).toBe('pointer')
  })
})

describe('גרירה', () => {
  it('הזזה נשארת בתוך העמוד', () => {
    expect(moveBox([10, 10, 110, 60], -50, 1000, 1000, 800)).toEqual([0, 750, 100, 800])
  })

  it('שינוי-גודל מכל צד, בלי לעבור את הצד שמולו', () => {
    const o = [100, 100, 300, 200]
    expect(resizeBox(o, { l: true }, -40, 0, 1000, 800)).toEqual([60, 100, 300, 200])
    expect(resizeBox(o, { r: true, b: true }, 50, 30, 1000, 800)).toEqual([100, 100, 350, 230])
    expect(resizeBox(o, { t: true }, 0, 500, 1000, 800)).toEqual([100, 192, 300, 200])
    expect(resizeBox(o, { r: true }, 5000, 0, 1000, 800)).toEqual([100, 100, 1000, 200])
  })

  it('normRect / clampBox / roundBox', () => {
    expect(normRect(50, 80, 10, 20)).toEqual([10, 20, 50, 80])
    expect(clampBox([-5, -1, 1005, 900], 1000, 800)).toEqual([0, 0, 1000, 800])
    expect(roundBox([1.234, 2.25, 3.96, 4])).toEqual([1.2, 2.3, 4, 4])
  })
})

describe('תפקיד, זרם וסדר', () => {
  it('אובייקט = kind object; ריהוט בלי זרם ובלי "ממשיך"', () => {
    const f = F('a', [0, 0, 10, 10], { cont: true })
    expect(withRole(f, 'object')).toMatchObject({ kind: 'object', obj: 'other', stream: null, cont: false, src: 'human' })
    expect(withRole(f, 'furniture')).toMatchObject({ kind: 'text', stream: null, cont: false })
    const back = withRole(withRole(f, 'object', { obj: 'table' }), 'commentary')
    expect(back.kind).toBe('text')
    expect(back.obj).toBeUndefined()
    expect(withRole(f, 'nonsense')).toBe(f)
  })

  it('המספר בתוך הזרם לפי סדר-הקריאה', () => {
    const fr = [F('a', [0, 0, 9, 9], { ord: 3 }), F('b', [0, 0, 9, 9], { ord: 1 }), F('c', [0, 0, 9, 9], { ord: 2, stream: 's2' })]
    const seq = streamSeq(fr)
    expect(seq.get('b')).toBe(1)
    expect(seq.get('a')).toBe(2)
    expect(seq.get('c')).toBe(1)
  })

  it('nextFid — n1, n2… ייחודי', () => {
    expect(nextFid([F('f1', [0, 0, 1, 1])])).toBe('n1')
    expect(nextFid([F('n1', [0, 0, 1, 1]), F('n7', [0, 0, 1, 1])])).toBe('n8')
  })

  it('renumber — רציף, בלי מספר נשאר בלי', () => {
    const r = renumber([F('a', [0, 0, 1, 1], { ord: 5 }), F('b', [0, 0, 1, 1], { ord: 2 }), F('c', [0, 0, 1, 1])])
    expect(r.map((f) => f.ord)).toEqual([2, 1, null])
  })

  it('applyOrder — הנלחצות קודם, השאר אחריהן בסדר הקודם', () => {
    const fr = [F('a', [0, 0, 9, 9], { ord: 1 }), F('b', [0, 50, 9, 59], { ord: 2 }), F('c', [0, 90, 9, 99], { ord: 3 }), F('d', [0, 5, 9, 9])]
    const r = applyOrder(fr, ['c', 'a'])
    expect(Object.fromEntries(r.map((f) => [f.fid, f.ord]))).toEqual({ c: 1, a: 2, b: 3, d: 4 })
    expect(applyOrder(fr, [])).toBe(fr)
  })
})
