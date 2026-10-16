import type { ReactNode } from 'react'
import { PROSE } from './proseClasses'

/** בלוק קוד במדריכים הקבועים (דיקטה, פיתוח) — אותו מראה כמו בלוק קוד מהוויקי. LTR, גלילה פנימית. */
export default function DocsCodeBlock({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <pre dir="ltr" className={className ? `${PROSE.pre} ${className}` : PROSE.pre}>
      <code>{children}</code>
    </pre>
  )
}
