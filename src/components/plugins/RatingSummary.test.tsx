import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import RatingSummary from './RatingSummary'

describe('RatingSummary', () => {
  it('לא מרנדר דבר כשאין מדרגים', () => {
    const { container } = render(<RatingSummary avg={0} count={0} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('מציג ממוצע ומספר מדרגים, ומשפט אחד לקורא המסך', () => {
    render(<RatingSummary avg={4.6} count={12} />)
    expect(screen.getByText('4.6')).toBeInTheDocument()
    expect(screen.getByText('דירוג ממוצע 4.6 מתוך 5, מתוך 12 מדרגים')).toHaveClass('sr-only')
    // הכוכבים דקורטיביים — המשפט הוא ההכרזה היחידה
    expect(screen.queryByRole('img')).toBeNull()
  })
})
