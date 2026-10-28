'use client'

import { useState } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import { fmt } from '../api'
import { Tag } from '../bits'

// "הכול ממתנדב מסוים…": בחירת מתנדב, עם הממתינות שלו ושיעור-ההתאמה (כמה מההגשות שלו
// אושרו עד היום בלי שינוי). האישור עצמו — אחרי חלון-אישור נוסף (bulk ב-useReview).
export const matchTone = (m) => (m == null ? 'muted' : m >= 97 ? 'ok' : m >= 93 ? 'info' : 'warn')

export default function VolunteerPicker({ vols, onPick, onClose, unit = 'שורות' }) {
  const [pick, setPick] = useState(null)
  return (
    <Dialog
      title="לאשר הכול ממתנדב"
      subtitle="כל ההגשות הממתינות של המתנדב בחלק הזה, בכל הכתבים"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="text" size="sm" onClick={onClose}>
            ביטול
          </Button>
          <Button variant="filled" size="sm" disabled={!pick} onClick={() => onPick(pick)}>
            המשך
          </Button>
        </div>
      }
    >
      {vols.length ? (
        <div role="radiogroup" className="flex flex-col gap-1">
          {vols.map((v) => (
            <label key={v.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface-variant">
              <input type="radio" name="tp-vol" value={v.id} checked={pick?.id === v.id} onChange={() => setPick(v)} />
              <b>{v.name}</b>
              <span className="text-sm text-on-surface/60">
                {fmt(v.pending)} {unit} ממתינות
              </span>
              <Tag tone={matchTone(v.match)} title={v.judged ? `מתוך ${fmt(v.judged)} שנסקרו` : 'עוד לא נסקרה אף הגשה שלו'}>
                {v.match == null ? 'אין עדיין התאמה' : `${v.match}% התאמה`}
              </Tag>
            </label>
          ))}
        </div>
      ) : (
        <p className="text-on-surface/60">אין הגשות ממתינות</p>
      )}
    </Dialog>
  )
}
