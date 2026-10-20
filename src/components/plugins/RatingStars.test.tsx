import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import RatingStars, { clampRating, formatRatingValue } from './RatingStars'

describe('RatingStars', () => {
  it('מכריז את הדירוג כתמונה עם תווית', () => {
    render(<RatingStars value={4.6} />)
    expect(screen.getByRole('img', { name: /4\.6 מתוך 5/ })).toBeInTheDocument()
  })

  it('המילוי ביחס לממוצע, ונחתך לטווח 0–5', () => {
    const { container, rerender } = render(<RatingStars value={2.5} />)
    expect(container.querySelector('[data-filled-ratio]')).toHaveAttribute('data-filled-ratio', '0.5')
    rerender(<RatingStars value={9} />)
    expect(container.querySelector('[data-filled-ratio]')).toHaveAttribute('data-filled-ratio', '1')
  })

  it('דירוג 0 — בלי שכבת מילוי', () => {
    const { container } = render(<RatingStars value={0} />)
    expect(container.querySelector('[data-filled-ratio]')).toBeNull()
  })

  it('decorative — מוסתר מקורא המסך ובלי role', () => {
    const { container } = render(<RatingStars value={3} decorative />)
    expect(screen.queryByRole('img')).toBeNull()
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  })

  it('clampRating / formatRatingValue', () => {
    expect(clampRating(-1)).toBe(0)
    expect(clampRating(Number.NaN)).toBe(0)
    expect(formatRatingValue(4)).toBe('4.0')
    expect(formatRatingValue(4.66)).toBe('4.7')
  })
})
