import { describe, it, expect, vi, afterEach } from 'vitest'
import { useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act, fireEvent, screen } from '@testing-library/react'
import Dialog from '@/components/ui/Dialog'
import TagInput from './TagInput'
import type { TagSuggestionSource } from './usePluginTagSuggestions'

/**
 * Esc בשדה התגיות בתוך Dialog אמיתי, בסביבה קרובה ל-production: ב-Next ה-root של React הוא document
 * עצמו (hydrateRoot(document)), ומאזין ה-keydown של useDialogA11y יושב גם הוא על document. RTL הרגיל
 * מרנדר לתוך div — כאן ה-root נוצר על document, והחלון בפורטל ל-body כמו באתר.
 * החוזה שנבדק: רכיב פנימי שבולע Esc מסמן preventDefault, ו-useDialogA11y מכבד את זה.
 */

const source: TagSuggestionSource = {
  pool: [{ tag: 'כלי עזר', count: 3 }, { tag: 'כלים', count: 1 }],
  load: () => {}
}

function Harness({ onClose }: { onClose: () => void }) {
  const [tags, setTags] = useState<string[]>([])
  return (
    <html lang="he" dir="rtl">
      <body>
        <Dialog title="עריכת תוסף" onClose={onClose}>
          <TagInput id="tags" tags={tags} onTagsChange={setTags} suggestions={source} placeholder="הוסף תגית" />
        </Dialog>
      </body>
    </html>
  )
}

let root: Root | null = null
afterEach(() => {
  act(() => root?.unmount())
  root = null
})

describe('TagInput בתוך Dialog — root של React על document', () => {
  it('Esc כשהרשימה פתוחה סוגר רק אותה; Esc שני סוגר את החלון', () => {
    const onClose = vi.fn()
    // React 19 מרנדר html/body כ-singletons — "מאמץ" את האלמנטים הקיימים של המסמך
    act(() => {
      root = createRoot(document)
      root.render(<Harness onClose={onClose} />)
    })

    const input = screen.getByRole('combobox', { name: 'הוסף תגית' })
    act(() => input.focus())
    fireEvent.change(input, { target: { value: 'כלי' } })
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    fireEvent.keyDown(input, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: 'עריכת תוסף' })).toBeInTheDocument()

    fireEvent.keyDown(input, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
