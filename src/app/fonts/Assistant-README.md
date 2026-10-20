# Assistant (גופן הגוף והממשק)

- **קובץ:** `Assistant-Variable.woff2` — גופן משתנה (wght 200–800), כ-26KB.
- **מקור:** https://github.com/google/fonts/tree/main/ofl/assistant (`Assistant[wght].ttf`, גרסה 3.000;
  פרויקט Assistant — https://github.com/hafontia/Assistant). אותו גופן ש-Google Fonts מגיש.
- **רישיון:** SIL Open Font License 1.1 — הנוסח המלא ב-`OFL-Assistant.txt`. מותר לשימוש, הטמעה והפצה
  (גם מסחרית), אסור למכור את הגופן כשלעצמו; צריך לשמור את נוסח הרישיון והזכויות לצד הקובץ. אנחנו לא
  משנים את שם הגופן, והקובץ כאן הוא subset (חיתוך תווים) בלבד — בלי שינוי בעיצוב האותיות.
- **למה מקומי ולא `next/font/google`:** `next build` לא תלוי יותר ברשת/ב-Google, וה-build הוא דטרמיניסטי.
- **תוכן ה-subset:** כל טווחי ה-unicode של ה-subsets `hebrew` + `latin` ש-Google מגיש (עברית + ניקוד,
  ‎U+0000–00FF‎ לטינית-1, סימני פיסוק כלליים ‎U+2000–206F‎, ‎₪ € ™‎ ועוד) — בדיוק מה שהיה נטען קודם, אבל
  בקובץ אחד (בקשה אחת במקום שתיים, ו-preload אחד). לטינית מורחבת (latin-ext) לא נכללה גם קודם.

## איך נוצר מחדש

```bash
pip install fonttools brotli
# להוריד את Assistant[wght].ttf מהקישור למעלה, ואז:
pyftsubset "Assistant[wght].ttf" --flavor=woff2 --layout-features='*' \
  --unicodes="U+0307-0308,U+0590-05FF,U+200C-2010,U+20AA,U+25CC,U+FB1D-FB4F,U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD" \
  --output-file=Assistant-Variable.woff2
```

ההצהרה (`weight: "200 800"`, `display: "optional"`, `--font-assistant`) ב-`src/app/layout.tsx`.
