import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PluginStoreAppBanner from './PluginStoreAppBanner'

const fetchSpy = vi.fn()

beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia
  fetchSpy.mockReset()
  vi.stubGlobal('fetch', fetchSpy)
})
afterEach(() => vi.unstubAllGlobals())

describe('PluginStoreAppBanner', () => {
  it('הכפתור פותח ui/Dialog עם פרטי הגרסה; Esc סוגר והפוקוס חוזר לכפתור', async () => {
    fetchSpy.mockResolvedValue({ ok: true, json: () => Promise.resolve({ url: 'https://example.com/a.exe', size: 50 * 1024 * 1024, updatedAt: '2026-01-05' }) })
    render(<PluginStoreAppBanner />)
    const opener = screen.getByRole('button', { name: 'הורדת החנות למחשב' })
    opener.focus()
    fireEvent.click(opener)
    expect(screen.getByRole('dialog', { name: 'חנות התוספים למחשב' })).toBeInTheDocument()
    expect(await screen.findByText('גודל כ-50MB')).toBeInTheDocument()
    const download = screen.getByRole('link', { name: 'הורדה' })
    expect(download).toHaveAttribute('href', 'https://example.com/a.exe')
    expect(download).toHaveAttribute('target', '_blank')
    expect(download).toHaveAttribute('rel', 'noopener noreferrer')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(opener).toHaveFocus()
  })

  it('כשל בשליפת הגרסה — ההורדה מפנה לדף ההפצות, ו"קובץ הרצה אחד"', async () => {
    fetchSpy.mockRejectedValue(new Error('offline'))
    render(<PluginStoreAppBanner />)
    fireEvent.click(screen.getByRole('button', { name: 'הורדת החנות למחשב' }))
    expect(await screen.findByText('קובץ הרצה אחד')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'הורדה' })).toHaveAttribute('href', 'https://github.com/Otzaria/otzaria-plugin-store/releases')
    fireEvent.click(screen.getByRole('button', { name: 'ביטול' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
