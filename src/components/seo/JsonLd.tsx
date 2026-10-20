// סימן הבריחה ("סלש") נבנה מקוד התו, כדי שהמחרוזות להלן יישארו בריחות ליטרליים בפלט ולא יפוענחו כאן.
const BS = String.fromCharCode(92)

/**
 * מסדר נתונים לרינדור כ-JSON-LD בתוך <script type="application/ld+json">.
 * התו '<' מוחלף ברצף הבריחה u003c כדי שתוכן שמגיע מהנתונים לא יוכל לסגור את תגית ה-script (XSS).
 * מפרידי שורה U+2028/U+2029 נמלטים גם הם, לתאימות מול מפענחי JS ישנים.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .split('<').join(`${BS}u003c`)
    .split(String.fromCharCode(0x2028)).join(`${BS}u2028`)
    .split(String.fromCharCode(0x2029)).join(`${BS}u2029`)
}

export default function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />
}
