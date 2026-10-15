'use client';

import { useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * אייקון התרומה המונפש: מטבעות נופלים לקופה, היא מתמלאת ונפתחת לספר פתוח.
 * currentColor בלבד; בלולאה עדינה עם הפסקת מנוחה על הספר. ב-reduced-motion: ספר סטטי.
 * גודל ברירת המחדל 1em — כמו גליף, כך שמחלקת הגודל של ההורה (font-size) קובעת אותו.
 * strokeWidth — 1.5 במקור; בכותרת עבה יותר, כדי שישתווה למשקל שאר האייקונים והטקסט.
 */
const T = [0, 0.04, 0.14, 0.18, 0.28, 0.32, 0.42, 0.5, 0.75, 0.94, 0.95, 1];
const DURATION = 4.2;

const FILL_Y = [20, 20, 20, 17, 17, 14, 14, 11, 11, 11, 20, 20];
const REVEAL = [22, 22, 22, 22, 22, 22, 22, 22, 4, 4, 22, 22];
const FADE = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1];

// מטבע: נופל בין אינדקס s ל-e (על ציר T) ונבלע בחריץ
const coin = (s, e) => ({
  cy: T.map((_, i) => (i <= s ? 0.5 : 9)),
  opacity: T.map((_, i) => (i >= s && i < e ? 1 : i === e ? 1 : 0)),
});

const BOOK_OUTLINE =
  'M12 6.5C10.3 5.2 7.5 4.8 3.5 5v12.5c4-.2 6.8.2 8.5 1.5 1.7-1.3 4.5-1.7 8.5-1.5V5c-4-.2-6.8.2-8.5 1.5zM12 6.5V19';
const BOOK_THICKNESS = 'M4.5 20.5c3-.2 5.5.2 7.5 1.3 2-1.1 4.5-1.5 7.5-1.3';

const BookShape = () => (
  <g>
    <path d={BOOK_OUTLINE} />
    <path d={BOOK_THICKNESS} />
  </g>
);

export default function DonateAnimatedIcon({ size = '1em', strokeWidth = 1.5, className = '' }) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, '');

  const svgProps = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    focusable: 'false',
    className,
    style: { display: 'inline-block', verticalAlign: 'middle' },
  };

  if (reduce) {
    return (
      <svg {...svgProps}>
        <BookShape />
      </svg>
    );
  }

  const tr = { duration: DURATION, times: T, ease: 'easeInOut', repeat: Infinity };
  const lin = { ...tr, ease: 'linear' };
  const coins = [
    { x: 12, ...coin(1, 2) },
    { x: 10.5, ...coin(3, 4) },
    { x: 13.5, ...coin(5, 6) },
  ];

  return (
    <motion.svg {...svgProps} animate={{ opacity: FADE }} transition={lin}>
      <defs>
        <clipPath id={`${uid}-box`}>
          <motion.rect x="0" y="0" width="24"
            animate={{ height: REVEAL }} transition={tr} />
        </clipPath>
        <clipPath id={`${uid}-book`}>
          <motion.rect x="0" width="24"
            animate={{ y: REVEAL, height: REVEAL.map((r) => 24 - r) }} transition={tr} />
        </clipPath>
        <clipPath id={`${uid}-in`}>
          <rect x="5" y="9" width="14" height="11" rx="2" />
        </clipPath>
        <clipPath id={`${uid}-slot`}>
          <rect x="0" y="0" width="24" height="9.5" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${uid}-box)`}>
        <rect x="5" y="9" width="14" height="11" rx="2" />
        <path d="M9 12.5h6" />
        <g clipPath={`url(#${uid}-in)`}>
          <motion.rect x="5" width="14" fill="currentColor" stroke="none"
            animate={{ y: FILL_Y, height: FILL_Y.map((y) => 20 - y) }} transition={tr} />
        </g>
      </g>

      <g clipPath={`url(#${uid}-book)`}>
        <BookShape />
      </g>

      <g clipPath={`url(#${uid}-slot)`}>
        {coins.map((c) => (
          <motion.circle key={c.x} cx={c.x} r="1.5"
            animate={{ cy: c.cy, opacity: c.opacity }} transition={lin} />
        ))}
      </g>
    </motion.svg>
  );
}
