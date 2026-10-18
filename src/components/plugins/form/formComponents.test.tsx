import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, createEvent } from '@testing-library/react'
import FormField from './FormField'
import FileDropZone, { dragHasFiles } from './FileDropZone'
import CheckboxField from './CheckboxField'
import FormNote from './FormNote'
import { SelectedFile, ScreenshotPreviews } from './FilePreviews'
import { fieldA11yProps } from '@/components/ui/fieldStyles'

describe('FormField', () => {
  it('תווית מחוברת, כוכבית חובה דקורטיבית, הסבר ושגיאה מקושרים לשדה', () => {
    render(
      <FormField id="d" label="תיאור מלא" required hint="עד 10,000 תווים" error="שדה חובה">
        <textarea {...fieldA11yProps('d', { required: true, hint: true, error: 'שדה חובה' })} />
      </FormField>
    )
    const field = screen.getByRole('textbox', { name: 'תיאור מלא' })
    expect(field).toHaveAttribute('aria-required', 'true')
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(field).toHaveAccessibleDescription('עד 10,000 תווים שדה חובה')
    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('FileDropZone', () => {
  const file = new File(['x'], 'a.otzplugin')

  it('תווית מחוברת לשדה הקובץ; required ו-aria-required; children ושגיאה', () => {
    const { container } = render(
      <FileDropZone id="pf" icon="folder_zip" label="קובץ תוסף" required onChange={() => {}} hint={<p>הסבר</p>} error="שגיאה">
        <p>נבחר</p>
      </FileDropZone>
    )
    const input = screen.getByLabelText(/קובץ תוסף/)
    expect(input).toHaveAttribute('type', 'file')
    expect(input).toBeRequired()
    expect(input).toHaveAccessibleDescription('הסבר שגיאה')
    expect(screen.getByText('נבחר')).toBeInTheDocument()
    expect(container.firstElementChild?.className).toContain('border-error')
  })

  it('inputRequired={false} — מסומן חובה אך בלי required של הדפדפן (כבר נבחרו קבצים)', () => {
    render(<FileDropZone id="s" icon="image" label="צילומי מסך" required inputRequired={false} onChange={() => {}} />)
    const input = screen.getByLabelText(/צילומי מסך/) as HTMLInputElement
    expect(input.required).toBe(false)
    expect(input).toHaveAttribute('aria-required', 'true')
  })

  it('גרירה: מצב מודגש בזמן גרירת קבצים, ושחרור מעביר את הקבצים', () => {
    const onDropFiles = vi.fn()
    const { container } = render(<FileDropZone id="pf" icon="folder_zip" label="קובץ" onChange={() => {}} onDropFiles={onDropFiles} />)
    const zone = container.firstElementChild as HTMLElement
    const dataTransfer = { types: ['Files'], files: [file], dropEffect: '' }
    fireEvent.dragEnter(zone, { dataTransfer })
    expect(zone).toHaveAttribute('data-dragging')
    expect(zone.className).toContain('bg-surface-selected')
    const drop = createEvent.drop(zone)
    Object.defineProperty(drop, 'dataTransfer', { value: dataTransfer })
    fireEvent(zone, drop)
    expect(zone).not.toHaveAttribute('data-dragging')
    expect(onDropFiles).toHaveBeenCalledWith([file])
  })

  it('בלי onDropFiles — אין מצב גרירה', () => {
    const { container } = render(<FileDropZone id="pf" icon="folder_zip" label="קובץ" onChange={() => {}} />)
    const zone = container.firstElementChild as HTMLElement
    fireEvent.dragEnter(zone, { dataTransfer: { types: ['Files'] } })
    expect(zone).not.toHaveAttribute('data-dragging')
  })

  it('dragHasFiles מבחין בין קבצים לטקסט', () => {
    expect(dragHasFiles({ dataTransfer: { types: ['Files'] } } as never)).toBe(true)
    expect(dragHasFiles({ dataTransfer: { types: ['text/plain'] } } as never)).toBe(false)
    expect(dragHasFiles({ dataTransfer: null } as never)).toBe(false)
  })
})

describe('CheckboxField', () => {
  it('תווית לחיצה, הסבר מקושר, required ושגיאה', () => {
    const onChange = vi.fn()
    render(<CheckboxField id="c" checked={false} onChange={onChange} label="אני מאשר" description="(הסבר)" required error="יש לאשר" />)
    const box = screen.getByRole('checkbox', { name: /אני מאשר/ })
    expect(box).toBeRequired()
    expect(box).toHaveAttribute('aria-invalid', 'true')
    expect(box).toHaveAccessibleDescription('(הסבר) יש לאשר')
    fireEvent.click(box)
    expect(onChange).toHaveBeenCalledWith(true)
  })
})

describe('FormNote / FilePreviews', () => {
  it('FormNote — role="note"', () => {
    render(<FormNote>שים לב</FormNote>)
    expect(screen.getByRole('note')).toHaveTextContent('שים לב')
  })

  it('SelectedFile ו-ScreenshotPreviews', () => {
    render(<><SelectedFile>נבחר: a.otzplugin</SelectedFile><ScreenshotPreviews srcs={['data:a', 'data:b']} /></>)
    expect(screen.getByText('נבחר: a.otzplugin')).toBeInTheDocument()
    expect(screen.getByAltText('צילום מסך 2')).toBeInTheDocument()
  })

  it('ScreenshotPreviews ריק — לא מרונדר', () => {
    const { container } = render(<ScreenshotPreviews srcs={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
