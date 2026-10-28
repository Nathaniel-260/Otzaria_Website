import { requireTzuratSession } from '@/lib/tzuratHadaf/session';
import { pageDetail } from '@/lib/tzuratHadaf/pages';
import { fromResult, serverError } from '@/lib/tzuratHadaf/respond';

// GET — העמוד לבדיקה: {page, items:[FastItem], draft, prev, next}. פתיחה בידי המחזיק מחדשת את התפיסה.
export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const g = await requireTzuratSession();
  if (g.error) return g.error;
  try {
    const { id } = await params;
    return fromResult(await pageDetail(id, g.userId));
  } catch (e) {
    console.error('tzurat page', e);
    return serverError();
  }
}
