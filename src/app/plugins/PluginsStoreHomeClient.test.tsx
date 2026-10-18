import { describe, it, expect, vi } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import type { StoreHomeData } from './storeHomeTypes'
import type { PluginCardData } from '@/components/plugins/types'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams()
}))
vi.mock('@/components/providers/DialogContext', () => ({ useDialog: () => ({ showAlert: vi.fn() }) }))
vi.mock('@/components/plugins/PluginSearchBox', () => ({ default: () => <input aria-label="חיפוש תוספים" /> }))
vi.mock('@/components/plugins/PluginStoreAppBanner', () => ({ default: () => <button type="button">הורדת החנות למחשב</button> }))

const { default: PluginsStoreHomeClient } = await import('./PluginsStoreHomeClient')

const plugin = (id: string): PluginCardData => ({
  id,
  name: `תוסף ${id}`,
  shortDescription: 'תיאור',
  version: '1.0.0',
  status: 'stable',
  image: '',
  updatedAt: '2026-01-01T00:00:00.000Z',
  downloadUrl: `/api/plugins/${id}/download`,
  supportsDirectInstall: false,
  tags: [],
  downloadCount: 10,
  ratingAvg: 0,
  ratingCount: 0
}) as PluginCardData

const data = (over: Partial<StoreHomeData> = {}): StoreHomeData => ({
  settings: { homeTitle: '', homeSubtitle: '' },
  featured: Array.from({ length: 8 }, (_, i) => plugin(`f${i}`)),
  categories: [
    { id: 'c1', slug: 'study-tools', name: 'כלי לימוד', description: 'כלי עזר', icon: '', pluginCount: 20, showOnHome: true, plugins: [plugin('a'), plugin('b')] },
    { id: 'c2', slug: 'prayer', name: 'תפילה', description: '', icon: '', pluginCount: 3, showOnHome: false, plugins: [] }
  ],
  totalPublicPlugins: 65,
  ...over
})

describe('PluginsStoreHomeClient', () => {
  it('main יחיד, h1 ברירת מחדל, אזורים עם h2 וכרטיסים h3', () => {
    render(<PluginsStoreHomeClient data={data()} loadError={false} />)
    expect(document.querySelectorAll('main#main-content')).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'חנות התוספים של אוצריא' })).toBeInTheDocument()
    // אזור אחד לכל החנות, מחובר ל-h1; הסרגל והפתיחה בתוכו
    const store = screen.getByRole('region', { name: 'חנות התוספים של אוצריא' })
    expect(within(store).getByRole('textbox', { name: 'חיפוש תוספים' })).toBeInTheDocument()
    const featured = screen.getByRole('region', { name: 'תוספים נבחרים' })
    expect(within(featured).getAllByRole('heading', { level: 3 })).toHaveLength(6)
    const row = screen.getByRole('region', { name: 'כלי לימוד' })
    expect(within(row).getByRole('link', { name: /לכל הקטגוריה/ })).toHaveAttribute('href', '/plugins/category/study-tools')
    // תפילה לא מוצגת כשורה (showOnHome=false), אבל כן בניווט
    expect(screen.queryByRole('region', { name: 'תפילה' })).toBeNull()
    expect(screen.getAllByRole('navigation', { name: 'קטגוריות' })).toHaveLength(2)
  })

  it('"הצג עוד נבחרים" חושף את כל הנבחרים ונעלם', () => {
    render(<PluginsStoreHomeClient data={data()} loadError={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'הצג עוד נבחרים' }))
    const featured = screen.getByRole('region', { name: 'תוספים נבחרים' })
    expect(within(featured).getAllByRole('heading', { level: 3 })).toHaveLength(8)
    expect(screen.queryByRole('button', { name: 'הצג עוד נבחרים' })).toBeNull()
  })

  it('שגיאת טעינה: מצב שגיאה עם קישור לכל התוספים, בלי ניווט קטגוריות', () => {
    render(<PluginsStoreHomeClient data={null} loadError />)
    expect(screen.getByRole('heading', { level: 2, name: 'אירעה שגיאה בטעינת החנות' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /לכל התוספים/ })).toHaveAttribute('href', '/plugins/all')
    expect(screen.queryByRole('navigation', { name: 'קטגוריות' })).toBeNull()
    expect(document.querySelectorAll('main#main-content')).toHaveLength(1)
  })

  it('בית ריק: מצב ריק עם המונה', () => {
    render(
      <PluginsStoreHomeClient
        data={data({ featured: [], categories: [{ ...data().categories[1] }] })}
        loadError={false}
      />
    )
    expect(screen.getByRole('heading', { level: 2, name: /החנות בבנייה/ })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /לכל התוספים/ })[0]).toHaveTextContent('(65)')
  })
})
