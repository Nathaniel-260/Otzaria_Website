import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/components/plugins/PluginSearchBox', () => ({
  default: ({ placeholder }: { placeholder?: string }) => <input aria-label="חיפוש תוספים" placeholder={placeholder} />
}))
vi.mock('@/components/plugins/PluginStoreAppBanner', () => ({
  default: ({ variant }: { variant?: string }) => <button type="button" data-variant={variant}>הורדת החנות למחשב</button>
}))

const { default: StoreHomeHero } = await import('./StoreHomeHero')

describe('StoreHomeHero', () => {
  it('h1 עם id, שורת משנה, חיפוש ופעולות משניות שקטות', () => {
    const { container } = render(<StoreHomeHero titleId="t" title="חנות התוספים של אוצריא" subtitle="שורת משנה" />)
    expect(screen.getByRole('heading', { level: 1, name: 'חנות התוספים של אוצריא' })).toHaveAttribute('id', 't')
    expect(screen.getByText('שורת משנה')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'חיפוש תוספים' })).toHaveAttribute('placeholder', 'חפש תוסף לפי שם, תיאור או נושא...')
    expect(screen.getByRole('link', { name: 'העלה תוסף חדש' })).toHaveAttribute('href', '/plugins/upload')
    // הפעולות המשניות — כפתורי טקסט, לא במסגרת (החיפוש הוא הפקד הבולט היחיד)
    expect(screen.getByRole('button', { name: 'הורדת החנות למחשב' })).toHaveAttribute('data-variant', 'text')
    // אינה <section> משלה — האזור העוטף בעמוד מחובר ל-h1
    expect(container.querySelector('section')).toBeNull()
  })
})
