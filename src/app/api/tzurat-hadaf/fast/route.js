import { requireTzuratSession } from '@/lib/tzuratHadaf/session';
import { sampleFastItem, fastItemFor, fastStats, parseExclude, hasPractice } from '@/lib/tzuratHadaf/items';
import { json, badRequest, serverError } from '@/lib/tzuratHadaf/respond';

// GET ?exclude=id,id&kind=any|g|r|t — שאלה אחת למסלול המהיר ← {item: FastItem|null, stats, needPractice, needRashi, rashi, practiceDone}.
// עד שהמתנדב סיים את התרגול (כשיש תרגול) — needPractice ו-item: null. רש"י/תוספות בלי הדגל — needRashi.
export const dynamic = 'force-dynamic';
const KINDS = ['any', 'g', 'r', 't'];

export async function GET(request) {
  const g = await requireTzuratSession();
  if (g.error) return g.error;
  try {
    const sp = new URL(request.url).searchParams;
    const kind = sp.get('kind') || 'any';
    if (!KINDS.includes(kind)) return badRequest('kind לא תקין');
    const stats = sp.get('stats') === '1' ? await fastStats(g.userId) : null;
    const flags = { rashi: g.rashi, practiceDone: g.practiceDone };
    if (!g.practiceDone && (await hasPractice())) return json({ item: null, stats, needPractice: true, needRashi: false, ...flags });
    if ((kind === 'r' || kind === 't') && !g.canRashi) return json({ item: null, stats, needPractice: false, needRashi: true, ...flags });
    const doc = await sampleFastItem(g.userId, { exclude: parseExclude(sp.get('exclude')), kind, canRashi: g.canRashi });
    return json({ item: doc ? await fastItemFor(doc, g.userId) : null, stats, needPractice: false, needRashi: false, ...flags });
  } catch (e) {
    console.error('tzurat fast', e);
    return serverError();
  }
}
