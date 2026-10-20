import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PluginKeyFacts, { buildKeyFacts } from './PluginKeyFacts'

const base = { ratingAvg: 4.6, ratingCount: 12, downloadCount: 2473, version: '1.2.0', compatibleWith: '0.9.97', author: 'מפתח א' }

describe('PluginKeyFacts', () => {
  it('דירוג · הורדות · גרסה · תאימות · מפתח — בסדר קבוע, כ-dl', () => {
    const { container } = render(<PluginKeyFacts plugin={base} />)
    const labels = Array.from(container.querySelectorAll('dt')).map((dt) => dt.textContent)
    expect(labels).toEqual(['דירוג', 'הורדות', 'גרסה', 'תאימות', 'מפתח'])
    expect(screen.getByText((2473).toLocaleString('he-IL'))).toBeInTheDocument()
    expect(screen.getByText('1.2.0').closest('bdi')).toHaveAttribute('dir', 'ltr')
    // הדירוג מוכרז במשפט אחד לקורא המסך
    expect(screen.getByText(/דירוג ממוצע 4\.6 מתוך 5, מתוך 12 מדרגים/)).toHaveClass('sr-only')
    expect(container.querySelector('dl')).toHaveClass('sm:grid-cols-5')
  })

  it('בלי דירוגים — אין תא דירוג (לא "0 כוכבים")', () => {
    const facts = buildKeyFacts({ ...base, ratingCount: 0 })
    expect(facts.map((f) => f.key)).toEqual(['downloads', 'version', 'compat', 'author'])
  })

  it('התא האחרון מתמתח על השארית בשורת הנייד', () => {
    const { container } = render(<PluginKeyFacts plugin={base} />)
    const cells = container.querySelectorAll('[data-fact]')
    expect(cells[4]).toHaveClass('col-span-2')
    const four = render(<PluginKeyFacts plugin={{ ...base, ratingCount: 0 }} />)
    expect(four.container.querySelectorAll('[data-fact]')[3]).toHaveClass('col-span-3')
  })
})
