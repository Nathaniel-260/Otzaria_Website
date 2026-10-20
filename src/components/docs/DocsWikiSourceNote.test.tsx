import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import DocsWikiSourceNote from './DocsWikiSourceNote'

describe('DocsWikiSourceNote', () => {
  it('שם הדף מקודד בקישור לוויקי', () => {
    render(<DocsWikiSourceNote pageName="User-A b?c" />)
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://github.com/Otzaria/otzaria/wiki/User-A%20b%3Fc')
  })
})
