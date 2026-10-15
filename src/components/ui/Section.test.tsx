import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Section from './Section'
import Container, { containerClasses } from './Container'

describe('Section', () => {
  it('section עם שם נגיש מהכותרת (aria-labelledby) → landmark מסוג region', () => {
    render(
      <Section id="features" labelledBy="features-heading" anchor>
        <h2 id="features-heading">יכולות</h2>
      </Section>
    )
    const region = screen.getByRole('region', { name: 'יכולות' })
    expect(region).toHaveAttribute('id', 'features')
    expect(region).toHaveClass('anchor-section')
    expect(region.className).toContain('py-14')
  })

  it('container — מכל ברוחב התוכן כברירת מחדל; false — בלי מכל', () => {
    const { container, rerender } = render(<Section><p>א</p></Section>)
    expect(container.querySelector('section > div')?.className).toContain('max-w-content')
    rerender(<Section container={false}><p>א</p></Section>)
    expect(container.querySelector('section > p')).not.toBeNull()
  })

  it('spacing="top" — ריפוד עליון בלבד', () => {
    const { container } = render(<Section spacing="top" />)
    const section = container.querySelector('section')!
    expect(section.className).toContain('pt-14')
    expect(section.className).not.toContain('py-14')
  })
})

describe('Container', () => {
  it('רוחבים מטוקני layout.css', () => {
    expect(containerClasses('content')).toBe('mx-auto w-full max-w-content 2xl:max-w-content-wide')
    expect(containerClasses('narrow')).toBe('mx-auto w-full max-w-narrow')
  })

  it('as — אלמנט אחר', () => {
    render(<Container as="main" data-testid="m" />)
    expect(screen.getByTestId('m').tagName).toBe('MAIN')
  })
})
