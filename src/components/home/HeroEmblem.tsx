'use client'

import { useState } from 'react'
import GoldenBook from './GoldenBook'
import ForeverTagline from './ForeverTagline'

// סמל הגיבור: הספר המוזהב שנפתח, ומתחתיו "חינם ← לנצח!" שמתחיל רק כשהפתיחה הסתיימה.
// הספר הוא גם מקור "מעבר הלוגו" לכותרת העליונה (handoffSource — ראו HeaderLogo).
export default function HeroEmblem({ bookClassName = '' }: { bookClassName?: string }) {
  const [opened, setOpened] = useState(false)

  return (
    <div className="flex flex-col items-center">
      <GoldenBook className={bookClassName} handoffSource onOpened={() => setOpened(true)} />
      {/* השורה "שייכת" לספר — יחידה חזותית אחת: היא נמשכת מעלה אל תוך השוליים השקופים שבתחתית
          תמונת הספר (כ-10% מגובהה), כך שהיא יושבת ממש מתחת לציור. כשהספר עף לכותרת היא
          דועכת במקומה יחד עם ההילה (data-logo-handoff-fade), ולא נעה איתו */}
      <div data-logo-handoff-fade="" className="relative -mt-[7%]">
        <ForeverTagline play={opened} />
      </div>
    </div>
  )
}
