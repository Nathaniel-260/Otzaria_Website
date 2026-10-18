import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ManifestSummary, { manifestSummaryRows } from './ManifestSummary'
import { EMPTY_UPLOAD_FORM } from './uploadLogic'

const FORM = { ...EMPTY_UPLOAD_FORM, name: 'מילון', author: 'א', version: '1.2.0', status: 'beta' as const, compatibleWith: '0.9.0', shortDescription: 'קצר' }

describe('ManifestSummary', () => {
  it('שורה לכל ערך שזוהה, סטטוס בעברית, ובלי שורות ריקות (אתר בית)', () => {
    expect(manifestSummaryRows(FORM).map((r) => [r.label, r.value])).toEqual([
      ['שם התוסף', 'מילון'], ['מפתח', 'א'], ['גרסה', '1.2.0'], ['סטטוס', 'בטא'], ['גרסת מינימום', '0.9.0'], ['תיאור קצר', 'קצר']
    ])
  })

  it('רשימת הגדרות (dl); ריק — לא מרונדר', () => {
    const { container, rerender } = render(<ManifestSummary formData={FORM} />)
    expect(container.querySelector('dl')).not.toBeNull()
    expect(screen.getByText('שם התוסף').tagName).toBe('DT')
    rerender(<ManifestSummary formData={{ ...EMPTY_UPLOAD_FORM, status: '' as never }} />)
    expect(container.querySelector('dl')).toBeNull()
  })
})
