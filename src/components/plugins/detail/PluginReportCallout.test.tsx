import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PluginReportCallout from './PluginReportCallout'

describe('PluginReportCallout', () => {
  it('הסבר + כפתור "דיווח למפתח" שפותח את החלון', async () => {
    const user = userEvent.setup()
    const onReport = vi.fn()
    render(<PluginReportCallout onReport={onReport} />)
    expect(screen.getByText('דיווח על תקלה או בעיה למפתח התוסף')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /דיווח למפתח/ }))
    expect(onReport).toHaveBeenCalledOnce()
  })
})
