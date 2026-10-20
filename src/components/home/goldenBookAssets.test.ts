// @vitest-environment node
// התאמה בין הקבועים ב-TS, ה-CSS והקבצים בפועל: הנתיבים וספירת הפריימים מופיעים בכמה מקומות
// (GoldenBook.tsx, animations.css, scripts/optimize-assets.mjs) וחייבים להישאר זהים — אחרת
// הרצועה תרד פעמיים או שהאנימציה תקפוץ.
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import {
  BOOK_SIZES, CLOSED_SRC, CLOSED_SRCSET, OPEN_SRC, OPEN_SRCSET, SPRITE_AVIF_SRC, SPRITE_FRAMES, SPRITE_WEBP_SRC,
} from './goldenBookAssets'

const root = path.resolve(__dirname, '../../..')
const css = readFileSync(path.join(root, 'src/app/styles/animations.css'), 'utf8')
const onDisk = (url: string) => existsSync(path.join(root, 'public', url))

describe('נכסי הספר המוזהב', () => {
  it('כל הקבצים קיימים ב-public/home, ושמם כולל גרסה (הם מוגשים כ-immutable)', () => {
    const urls = [SPRITE_AVIF_SRC, SPRITE_WEBP_SRC, CLOSED_SRC, OPEN_SRC, ...CLOSED_SRCSET.split(', ').map((c) => c.split(' ')[0]), ...OPEN_SRCSET.split(', ').map((c) => c.split(' ')[0])]
    for (const url of urls) {
      expect(onDisk(url), url).toBe(true)
      expect(url).toMatch(/\.v\d+[.-]/)
    }
  })

  it('ה-CSS של הרצועה תואם למספר הפריימים (והתמונה נקבעת ב-JS, לא ב-CSS)', () => {
    expect(css).not.toContain('golden-book-sprite.v')
    expect(css).not.toMatch(/.golden-book-sprite[^}]*image-set/)
    expect(css).toContain(`background-size: ${SPRITE_FRAMES * 100}% 100%`)
    expect(css).toContain(`steps(${SPRITE_FRAMES - 1})`)
  })

  it('srcset ו-sizes: 320w ו-560w, וה-src הוא המועמד הגדול', () => {
    expect(CLOSED_SRCSET).toMatch(/-320\.webp 320w, .*-560\.webp 560w$/)
    expect(OPEN_SRCSET).toMatch(/-320\.webp 320w, .*-560\.webp 560w$/)
    expect(CLOSED_SRC).toContain('-560.webp')
    expect(BOOK_SIZES).toMatch(/144px$/)
  })
})
