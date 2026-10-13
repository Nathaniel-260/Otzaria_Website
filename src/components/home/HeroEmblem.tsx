'use client'

import { useState } from 'react'
import GoldenBook from './GoldenBook'
import ForeverTagline from './ForeverTagline'

// סמל הגיבור: הספר המוזהב שנפתח, ומתחתיו "חינם ← לנצח!" שמתחיל רק כשהפתיחה הסתיימה.
// הספר הוא גם מקור "מעבר הלוגו" לכותרת העליונה (handoffSource — ראו HeaderLogo).
//
// גודל: --book-w (מוגדר ב-className של ההורה, לפי נקודת שבירה) הוא רוחב הספר.
//
// השורה "שייכת" לספר — יחידה חזותית אחת: היא נמשכת מעלה אל תוך השוליים השקופים שבתחתית
// תמונת הספר, כך שהיא יושבת ממש מתחת לציור. ההיסט נגזר משני הגדלים בנפרד, ולא מאחוז
// (margin באחוזים יחסי לרוחב ההורה — בנייד זה כל רוחב המסך, והשורה עלתה על הספר):
//   - BOOK_ART_BOTTOM: הציור נגמר ב-84.5% מגובה התמונה (golden-book.webp) — עד 15.5%
//     מרוחב הספר שקוף ואפשר לעלות לתוכו;
//   - ראש ה-ל' של OT Vilna בולט כ-0.06em מעל תיבת השורה (leading-none), ולכן מוסיפים
//     0.06em — ב-em של השורה עצמה, כי היא בגודל גופן אחר;
//   - נשאר מרווח קטן ויחסי: 3% מרוחב הספר + 2px (כ-6px בנייד, כ-12px ב-2xl).
// כשהספר עף לכותרת השורה עולה איתו כיחידה אחת — אותה תנועה ואותו קנה מידה סביב מרכז הספר —
// ודועכת בדרך, כך שהספר מגיע לכותרת לבד (data-logo-handoff-follow; ראו useLogoHandoff).
// העטיפה היא שזזה, והאנימציה של "חינם לנצח!" רצה על הילדים שלה — שתיהן לא מתנגשות.
const TAGLINE_OFFSET = 'mt-[calc(var(--book-w)*-0.125+0.06em+2px)]'

export default function HeroEmblem({ className = '' }: { className?: string }) {
  const [opened, setOpened] = useState(false)

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <GoldenBook className="w-(--book-w)" handoffSource onOpened={() => setOpened(true)} />
      <div data-logo-handoff-follow="" className="relative">
        <ForeverTagline play={opened} className={TAGLINE_OFFSET} />
      </div>
    </div>
  )
}
