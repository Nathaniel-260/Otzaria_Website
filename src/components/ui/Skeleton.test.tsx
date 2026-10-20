import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import Skeleton from './Skeleton'

describe('Skeleton', () => {
  it('דקורטיבי — מוסתר מקורא המסך', () => {
    const { container } = render(<Skeleton className="h-4 w-10" />)
    const el = container.firstElementChild as HTMLElement
    expect(el).toHaveAttribute('aria-hidden', 'true')
    expect(el).toHaveAttribute('data-skeleton')
  })

  it('מבטל את הפעימה ב-reduced-motion ומעביר את מחלקות המידה של הצרכן', () => {
    const { container } = render(<Skeleton shape="pill" className="w-16" />)
    const el = container.firstElementChild as HTMLElement
    expect(el.className).toContain('motion-reduce:animate-none')
    expect(el.className).toContain('w-16')
  })
})
