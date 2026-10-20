import { describe, it, expect, vi, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { DocsScrollSpyProvider } from './DocsScrollSpyProvider'
import DocsToc from './DocsToc'

const ITEMS = [{ href: '#a', label: 'א' }, { href: '#b', label: 'ב' }]

afterEach(() => vi.unstubAllGlobals())

function stubObserver() {
  const created: unknown[] = []
  class IO {
    constructor() { created.push(this) }
    observe() {}
    disconnect() {}
  }
  vi.stubGlobal('IntersectionObserver', IO)
  return created
}

function Page({ shared }: { shared: boolean }) {
  const toc = (
    <>
      <DocsToc title="בעמוד זה" items={ITEMS} variant="panel" />
      <DocsToc title="בעמוד זה" items={ITEMS} variant="folded" />
    </>
  )
  return (
    <>
      <article><h2 id="a">א</h2><h2 id="b">ב</h2></article>
      <div data-docs-end="" />
      {shared ? <DocsScrollSpyProvider items={ITEMS}>{toc}</DocsScrollSpyProvider> : toc}
    </>
  )
}

describe('DocsScrollSpyProvider', () => {
  it('שתי תצוגות TOC בתוך ספק — spy אחד (band + end observers בלבד)', () => {
    const created = stubObserver()
    render(<Page shared />)
    expect(created).toHaveLength(2)
  })

  it('בלי ספק — כל רשימה מפעילה spy משלה (תאימות)', () => {
    const created = stubObserver()
    render(<Page shared={false} />)
    expect(created).toHaveLength(4)
  })
})
