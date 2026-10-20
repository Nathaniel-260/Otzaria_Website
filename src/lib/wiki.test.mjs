import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractHeadings, headingId, stripInlineMarkdown } from './wiki.js';

test('stripInlineMarkdown: הדגשה, קישור, קוד, תמונה ותגית', () => {
  assert.equal(stripInlineMarkdown('**חשוב** ו-`code`'), 'חשוב ו-code');
  assert.equal(stripInlineMarkdown('ראו [המדריך](/docs/x) כאן'), 'ראו המדריך כאן');
  assert.equal(stripInlineMarkdown('![לוגו](a.png) שם'), 'לוגו שם');
  assert.equal(stripInlineMarkdown('א <b>ב</b>'), 'א ב');
});

test('extractHeadings: h2 ו-h3 עם מספר שורה, h1/h4 לא נכללים', () => {
  const md = '# ראשי\n\n## א\n\n### ב\n\n#### ג\n';
  assert.deepEqual(
    extractHeadings(md).map((h) => [h.level, h.text, h.id, h.line]),
    [
      [2, 'א', 'א', 3],
      [3, 'ב', 'ב', 5],
    ]
  );
});

test('extractHeadings: כותרות כפולות מקבלות -2, -3', () => {
  const ids = extractHeadings('## שלום\n## שלום\n## שלום\n').map((h) => h.id);
  assert.deepEqual(ids, ['שלום', 'שלום-2', 'שלום-3']);
});

test('extractHeadings: ## בתוך בלוק קוד גדור אינה כותרת', () => {
  const md = '## אמיתית\n```sh\n## הערה\n```\n~~~\n## עוד\n~~~\n## אחרונה\n';
  assert.deepEqual(extractHeadings(md).map((h) => h.text), ['אמיתית', 'אחרונה']);
});

test('extractHeadings: הדגשה/קישור/קוד לא נכנסים למזהה, וסוגרי # נחתכים', () => {
  const [h] = extractHeadings('## **הגדרות** [כלליות](/x) `ב` ##\n');
  assert.equal(h.text, 'הגדרות כלליות ב');
  assert.equal(h.id, headingId('הגדרות כלליות ב'));
});

test('extractHeadings: כותרת ייחודית שומרת על העוגן הקיים; CRLF נספר כשורה אחת', () => {
  const hs = extractHeadings('## התקנה\r\n\r\n## שימוש\r\n');
  assert.deepEqual(hs.map((h) => [h.id, h.line]), [['התקנה', 1], ['שימוש', 3]]);
});

test('extractHeadings: כותרת בלי אותיות מקבלת מזהה גיבוי', () => {
  assert.equal(extractHeadings('## ***\n')[0].id, 'section');
});
