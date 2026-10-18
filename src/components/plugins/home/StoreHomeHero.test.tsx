import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('@/components/plugins/PluginSearchBox', () => ({
  default: ({ placeholder }: { placeholder?: string }) => <input aria-label="חיפוש תוספים" placeholder={placeholder} />
}))
vi.mock('@/components/plugins/PluginStoreAppBanner', () => ({ default: () => <button type="button">הורדת החנות למחשב</button> }))

const { default: StoreHomeHero } = await import('./StoreHomeHero')

describe('StoreHomeHero', () => {
  it('h1 שמחובר ל-section, שורת משנה, חיפוש ופעולות', () => {
    render(<StoreHomeHero titleId="t" title="חנות התוספים של אוצריא" subtitle="שורת משנה" />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveAttribute('id', 't')
    expect(screen.getByRole('region', { name: 'חנות התוספים של אוצריא' })).toBeInTheDocument()
    expect(screen.getByText('שורת משנה')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'חיפוש תוספים' })).toHaveAttribute('placeholder', 'חפש תוסף לפי שם, תיאור או נושא...')
    expect(screen.getByRole('link', { name: 'העלה תוסף חדש' })).toHaveAttribute('href', '/plugins/upload')
    expect(screen.getByRole('button', { name: 'הורדת החנות למחשב' })).toBeInTheDocument()
  })
})
