import { requireTzuratSession } from '@/lib/tzuratHadaf/session';
import { setRashi, userFlags } from '@/lib/tzuratHadaf/volunteer';
import { json, badRequest, serverError, readJsonBody, tooBigResponse } from '@/lib/tzuratHadaf/respond';

// POST {rashi?: bool} — הדגל "אני קורא כתב רש"י" ← {rashi, practiceDone}
export async function POST(request) {
  const g = await requireTzuratSession();
  if (g.error) return g.error;
  try {
    const { body, tooBig } = await readJsonBody(request, 4096);
    if (tooBig) return tooBigResponse();
    if (!body || typeof body !== 'object') return badRequest('גוף הבקשה חסר');
    if (body.rashi !== undefined && typeof body.rashi !== 'boolean') return badRequest('rashi חייב להיות true/false');
    if (body.rashi === undefined) {
      const f = await userFlags(g.userId);
      return json({ rashi: f.rashi, practiceDone: f.practiceDone });
    }
    return json(await setRashi(g.userId, body.rashi));
  } catch (e) {
    console.error('tzurat me', e);
    return serverError();
  }
}
