// גרסת release של אוצריא היא SemVer עם מספר בנייה אחרי '+' (למשל 0.9.98+801).
// למשתמש מציגים בכותרת רק את הגרסה עצמה; מספר הבנייה הוא מידע לתמיכה ומוצג בשולי החלון.
export function splitVersion(version: string | undefined): { display: string; build: string | null } | null {
  const trimmed = version?.trim().replace(/^v/i, '')
  if (!trimmed) return null
  const plus = trimmed.indexOf('+')
  if (plus === -1) return { display: trimmed, build: null }
  const display = trimmed.slice(0, plus)
  const build = trimmed.slice(plus + 1)
  if (!display) return { display: trimmed, build: null }
  return { display, build: build || null }
}
