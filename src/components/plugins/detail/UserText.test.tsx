import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import UserText from './UserText'

describe('UserText', () => {
  it('<p> לכל פסקה ושורה-בלוק עם dir="auto" ויישור לימין לכל שורה', () => {
    const { container } = render(
      <UserText text={"Jastrow English Aramaic dictionary.\r\nמילון ג'סטרוב\r\n\r\nפסקה שנייה"} />
    )
    const paragraphs = container.querySelectorAll('p')
    expect(paragraphs).toHaveLength(2)
    const lines = paragraphs[0].querySelectorAll('span')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toHaveAttribute('dir', 'auto')
    expect(lines[0]).toHaveClass('block', 'text-right')
    expect(lines[0].textContent).toBe('Jastrow English Aramaic dictionary.')
    expect(container.textContent).not.toContain('\r')
  })

  it('ריק — לא מרנדר דבר', () => {
    const { container } = render(<UserText text="  " />)
    expect(container).toBeEmptyDOMElement()
  })
})
