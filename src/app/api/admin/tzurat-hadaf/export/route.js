import { adminGate } from '@/lib/tzuratHadaf/session';
import { exportRowsStream } from '@/lib/tzuratHadaf/exportStream';
import { parseTypes, parseSince } from '@/lib/tzuratHadaf/exportRows';
import { badRequest } from '@/lib/tzuratHadaf/respond';

// GET ?since=<iso>&types=decision,anchor,check,report,contributor (גם parts=, גם ברבים) — NDJSON זורם (PACKAGE.md §3).
// שורה לרשומה, עם type; הראשונה — meta. private, no-store; attachment.
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request) {
  const { denied } = await adminGate(request, 'read');
  if (denied) return denied;
  const sp = new URL(request.url).searchParams;
  const t = parseTypes(sp.get('types') ?? sp.get('parts'));
  if (t.error) return badRequest(t.error);
  const s = parseSince(sp.get('since'));
  if (s.error) return badRequest(s.error);
  const encoder = new TextEncoder();
  const rows = exportRowsStream({ types: t.types, since: s.since });
  const stream = new ReadableStream({
    async pull(controller) {
      try {
        const { value, done } = await rows.next();
        if (done) {
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(`${JSON.stringify(value)}\n`));
      } catch (e) {
        console.error('tzurat export', e);
        await rows.return?.().catch(() => {});
        controller.error(e);
      }
    },
    async cancel() {
      await rows.return?.().catch(() => {});
    },
  });
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Content-Disposition': `attachment; filename="tzurat-review-export-${stamp}.ndjson"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
