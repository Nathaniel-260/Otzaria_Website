import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PluginTaxonomy from './PluginTaxonomy'

describe('PluginTaxonomy', () => {
  it('לא מרנדר דבר בלי קטגוריות ותגיות', () => {
    const { container } = render(<PluginTaxonomy />)
    expect(container).toBeEmptyDOMElement()
  })

  it('קטגוריות → דף הקטגוריה; תגיות → /plugins?tag=', () => {
    render(<PluginTaxonomy categories={[{ slug: 'tools', name: 'כלים' }]} tags={['לוח שנה']} />)
    expect(screen.getByRole('link', { name: /כלים/ })).toHaveAttribute('href', '/plugins/category/tools')
    expect(screen.getByRole('link', { name: 'לוח שנה' })).toHaveAttribute(
      'href',
      `/plugins?tag=${encodeURIComponent('לוח שנה')}`
    )
    expect(screen.getByText('מופיע בקטגוריות:')).toBeInTheDocument()
  })
})
