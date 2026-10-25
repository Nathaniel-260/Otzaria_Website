// צורת הדף — הגשת בדיקת עמוד ואישור/דחייה בידי מנהל. ייבוא יחסי (node:test).
//
// הגשה: כל הקלט נבדק קודם; אחר כך תפיסת מקום אטומית (כמו בהגהת העמודים: activeCount+1, submitters+uid,
// רק אם העמוד פתוח, באותו סבב, המשתמש לא הגיש, יש מקום פנוי, והוא המחזיק או שהעמוד פנוי); יצירת ההגשה — ואם
// נכשלה, ביטול תפיסת המקום. אחר כך: תשובות לפריטים (via 'page', אותה הסכמה ונקודות), פריטים ידניים
// ("בדפוס כתוב אחרת"), דיווחים, ומחיקת הטיוטה.
// אישור: +10 נקודות למגיש (פעם אחת), approvedCount+1, והעמוד done כשהמאושרות ≥ required.
// דחייה: המקום מתפנה (activeCount-1, המגיש יוצא מ-submitters) — העמוד חוזר למאגר, גם למגיש עצמו.

import mongoose from 'mongoose';
import TzuratPage from '../../models/TzuratPage.js';
import TzuratItem from '../../models/TzuratItem.js';
import TzuratSubmission from '../../models/TzuratSubmission.js';
import TzuratReport from '../../models/TzuratReport.js';
import User from '../../models/User.js';
import { normalizeLineOps, applyLineOps, deriveAnchors, flattenBlock } from './lineOps.js';
import { normalizeChecks, normalizeReport, MAX_REPORTS_PER_SUBMISSION } from './reportRules.js';
import { answerChoice, addAnswer, settle, award, POINTS_AGREED } from './items.js';
import { dropDraft } from './pages.js';
import { normalizeText, consensus } from './consensus.js';
import { whoOf, isObj, isObjectId, cleanText, cleanMultiline, words, fracBox } from './common.js';

export const POINTS_APPROVED = 10;
export const MAX_ITEM_ANSWERS = 500;
export const MAX_MANUAL = 100;
export const MAX_NOTE = 1000;
const CTX = 3;

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const fail = (status, error, code) => ({ ok: false, status, error, ...(code ? { code } : {}) });

// ---------- בדיקת הקלט ----------

function normalizeItemAnswers(raw) {
  if (raw == null) return { list: [] };
  if (!Array.isArray(raw) || raw.length > MAX_ITEM_ANSWERS) return { error: 'רשימת התשובות אינה תקינה' };
  const list = [];
  const seen = new Set();
  for (const a of raw) {
    if (!isObj(a) || !isObjectId(String(a.item)) || typeof a.choice !== 'string') return { error: 'תשובה לפריט אינה תקינה' };
    if (seen.has(String(a.item))) continue;
    seen.add(String(a.item));
    list.push({ item: String(a.item), choice: a.choice, text: typeof a.text === 'string' ? a.text : null });
  }
  return { list };
}

/** "בדפוס כתוב אחרת": [{block, line, ref, wi, n, otz, text, box}] מול מודל העמוד ← {list} או {error} */
export function normalizeManualItems(raw, model) {
  if (raw == null) return { list: [] };
  if (!Array.isArray(raw) || raw.length > MAX_MANUAL) return { error: 'רשימת התיקונים הידניים אינה תקינה' };
  const blocks = new Map((model?.blocks || []).map((b) => [b.id, b]));
  const list = [];
  for (const m of raw) {
    if (!isObj(m)) return { error: 'תיקון ידני לא תקין' };
    const block = blocks.get(m.block);
    if (!block) return { error: 'תיקון ידני בגוש שאינו בעמוד' };
    if (typeof m.ref !== 'string' || !m.ref || m.ref.length > 300 || !Number.isInteger(m.wi) || m.wi < 0) {
      return { error: 'תיקון ידני בלי מילה תקינה' };
    }
    const otz = words(m.otz, 30);
    if (!otz.length) return { error: 'תיקון ידני בלי המילים שסומנו' };
    const text = cleanText(m.text, 201);
    if (!text) return { error: 'תיקון ידני בלי הנוסח שנדפס' };
    if (text.length > 200) return { error: 'הנוסח בתיקון ידני ארוך מדי (עד 200 תווים)' };
    if (m.box != null && !fracBox(m.box)) return { error: 'מיקום לא תקין בתיקון ידני' };
    // ההקשר — מהמילים של הגוש במודל
    const { words: flat } = flattenBlock(block);
    const j = flat.findIndex((w) => w?.ref === m.ref && w?.wi === m.wi);
    if (j < 0) return { error: 'המילה שסומנה אינה בגוש' };
    const n = otz.length;
    list.push({
      block: block.id,
      kind: block.kind || block.id,
      line: Number.isInteger(m.line) ? m.line : null,
      ref: m.ref,
      wi: m.wi,
      n,
      otz,
      text,
      print: text.split(/\s+/).filter(Boolean),
      box: fracBox(m.box),
      ctxBefore: flat.slice(Math.max(0, j - CTX), j).map((w) => w.t).filter((t) => typeof t === 'string'),
      ctxAfter: flat.slice(j + n, j + n + CTX).map((w) => w.t).filter((t) => typeof t === 'string'),
    });
  }
  return { list };
}

/** כל גוף ההגשה ← {value} או {error} */
export function normalizeSubmission(body, model) {
  if (!isObj(body)) return { error: 'גוף הבקשה חסר' };
  const checks = normalizeChecks(body.checks);
  if (checks.error) return { error: checks.error };
  const ops = normalizeLineOps(body.lineOps);
  if (ops.error) return { error: ops.error };
  const answers = normalizeItemAnswers(body.itemAnswers);
  if (answers.error) return { error: answers.error };
  const manual = normalizeManualItems(body.manualItems, model);
  if (manual.error) return { error: manual.error };
  const reportsRaw = body.reports == null ? [] : body.reports;
  if (!Array.isArray(reportsRaw) || reportsRaw.length > MAX_REPORTS_PER_SUBMISSION) return { error: 'רשימת הדיווחים אינה תקינה' };
  const reports = [];
  for (const r of reportsRaw) {
    const v = normalizeReport(r);
    if (v.error) return { error: v.error };
    reports.push(v.report);
  }
  return {
    value: {
      checks: checks.checks,
      ops: ops.ops,
      itemAnswers: answers.list,
      manualItems: manual.list,
      reports,
      note: cleanMultiline(body.note, MAX_NOTE),
      round: Number.isInteger(body.round) ? body.round : null,
    },
  };
}

// הפעולות שחלו בפועל על המודל, והעוגנים שנגזרים מהן
export function opsAndAnchors(model, ops) {
  const { applied } = applyLineOps(model, ops);
  return { lineOps: applied, anchors: deriveAnchors(model, applied) };
}

// ---------- פריטים ידניים ----------

// verdict של המציע לפריט קיים עם אותו מפתח: print אם הנוסח שלו הוא print של הפריט, otz אם הוא otz, אחרת other
function verdictForExisting(item, text) {
  const t = normalizeText(text);
  if (t === normalizeText((item.print || []).join(' '))) return { verdict: 'print', text: null };
  if (t === normalizeText((item.otz || []).join(' '))) return { verdict: 'otz', text: null };
  return { verdict: 'other', text: cleanText(text, 200) };
}

async function addManualItem(page, m, user, now) {
  const uid = oid(user.id);
  const sourceKey = `${page.slug}|${m.kind}|${m.ref}|${m.wi}|rep`;
  const answer = { user: uid, who: whoOf(uid), name: cleanText(user.name, 100), verdict: 'print', text: null, via: 'page', at: now };
  const existing = await TzuratItem.findOne({ sourceKey }, { _id: 1, otz: 1, print: 1 }).lean();
  if (!existing) {
    try {
      const doc = await TzuratItem.create({
        sourceKey,
        slug: page.slug,
        masechet: page.masechet,
        daf: page.daf,
        dafKey: page.dafKey,
        page: page._id,
        kind: m.kind,
        cls: 'manual',
        question: 'replace',
        ref: m.ref,
        wi: m.wi,
        n: m.n,
        otz: m.otz,
        print: m.print,
        ctxBefore: m.ctxBefore,
        ctxAfter: m.ctxAfter,
        box: m.box,
        score: 0,
        manual: true,
        answers: [answer],
        buildId: page.buildId,
      });
      return doc._id;
    } catch (e) {
      if (e?.code !== 11000) throw e;
    }
  }
  const item = existing || (await TzuratItem.findOne({ sourceKey }, { _id: 1, otz: 1, print: 1 }).lean());
  if (!item) return null;
  const v = verdictForExisting(item, m.text);
  await addAnswer(item._id, user, { ...v, via: 'page' }, { canRashi: true, now });
  return item._id;
}

// ---------- הגשה ----------

/**
 * הגשת עמוד. user: {id, name}. ← {ok, submission: id, points: 0} או fail.
 */
export async function submitPage(pageId, user, body, { canRashi = false, now = new Date() } = {}) {
  if (!isObjectId(String(pageId))) return fail(404, 'העמוד לא נמצא');
  const uid = oid(user.id);
  const page = await TzuratPage.findById(pageId).lean();
  if (!page) return fail(404, 'העמוד לא נמצא');
  const v = normalizeSubmission(body, page.model);
  if (v.error) return fail(400, v.error);
  const input = v.value;
  if (input.round !== null && input.round !== (page.round || 1)) {
    return fail(409, 'העמוד עודכן מאז שנפתח (בנייה חדשה) — טענו אותו מחדש', 'stale');
  }
  const { lineOps, anchors } = opsAndAnchors(page.model, input.ops);

  const claimed = await TzuratPage.findOneAndUpdate(
    {
      _id: page._id,
      status: 'open',
      round: page.round || 1,
      submitters: { $ne: uid },
      $expr: { $lt: ['$activeCount', '$required'] },
      $or: [{ leasedBy: uid }, { leasedUntil: null }, { leasedUntil: { $lt: now } }],
    },
    { $inc: { activeCount: 1 }, $push: { submitters: uid }, $set: { leasedBy: null, leasedUntil: null } },
    { returnDocument: 'after', lean: true }
  );
  if (!claimed) {
    const p = await TzuratPage.findById(page._id, { status: 1, round: 1, submitters: 1 }).lean();
    if (p && (p.round || 1) !== (page.round || 1)) return fail(409, 'העמוד עודכן מאז שנפתח — טענו אותו מחדש', 'stale');
    if ((p?.submitters || []).some((s) => String(s) === String(uid))) return fail(409, 'כבר הגשתם את העמוד הזה', 'submitted');
    return fail(409, 'העמוד כבר הוגש או נלקח בידי מתנדב אחר', 'taken');
  }

  let sub;
  try {
    sub = await TzuratSubmission.create({
      page: page._id,
      slug: page.slug,
      dafKey: page.dafKey,
      user: uid,
      who: whoOf(uid),
      userName: cleanText(user.name, 100),
      round: page.round || 1,
      buildId: page.buildId || '',
      checks: input.checks,
      lineOps,
      anchors,
      note: input.note,
    });
  } catch (e) {
    // ביטול תפיסת המקום — אחרת העמוד "תקוע" עם מונה שאין מאחוריו הגשה
    await TzuratPage.updateOne({ _id: page._id }, { $inc: { activeCount: -1 }, $pull: { submitters: uid } });
    throw e;
  }

  // מכאן — ההגשה קיימת; כשל בצעד צדדי נרשם ביומן ואינו מכשיל אותה
  const itemAnswers = [];
  for (const a of input.itemAnswers) {
    try {
      const it = await TzuratItem.findOne({ _id: oid(a.item), page: page._id }, { _id: 1 }).lean();
      if (!it) continue;
      const r = await answerChoice(it._id, user, { choice: a.choice, text: a.text, via: 'page' }, { canRashi, now });
      if (r.ok) {
        const ans = await TzuratItem.findOne({ _id: it._id }, { answers: { $elemMatch: { user: uid } } }).lean();
        const mine = ans?.answers?.[0];
        if (mine) itemAnswers.push({ item: it._id, verdict: mine.verdict, text: mine.text ?? null });
      }
    } catch (e) {
      console.error('tzurat submit answer', e?.name);
    }
  }
  const manualIds = [];
  for (const m of input.manualItems) {
    try {
      const id = await addManualItem(page, m, user, now);
      if (id) manualIds.push(id);
    } catch (e) {
      console.error('tzurat submit manual', e?.name);
    }
  }
  const reportIds = [];
  for (const r of input.reports) {
    try {
      const doc = await TzuratReport.create({
        page: page._id,
        slug: page.slug,
        dafKey: page.dafKey,
        user: uid,
        who: whoOf(uid),
        userName: cleanText(user.name, 100),
        ...r,
        submission: sub._id,
      });
      reportIds.push(doc._id);
    } catch (e) {
      console.error('tzurat submit report', e?.name);
    }
  }
  await TzuratSubmission.updateOne({ _id: sub._id }, { $set: { itemAnswers, manualItems: manualIds, reports: reportIds } });
  await dropDraft(page._id).catch((e) => console.error('tzurat submit dropDraft', e?.name));
  return { ok: true, submission: String(sub._id), points: 0 };
}

// ---------- אישור ודחייה ----------

const reviewerOf = (admin, note, now) => ({
  reviewedBy: isObjectId(String(admin?.id)) ? oid(admin.id) : null,
  reviewedByName: cleanText(admin?.name, 100),
  reviewedAt: now,
  reviewNote: cleanMultiline(note, MAX_NOTE),
});

/** אישור. lineOps (אופציונלי) — הפעולות אחרי תיקון המנהל. ← {ok, submission} */
export async function approveSubmission(subId, admin, { note = '', lineOps } = {}, now = new Date()) {
  if (!isObjectId(String(subId))) return fail(404, 'ההגשה לא נמצאה');
  const sub = await TzuratSubmission.findById(subId).lean();
  if (!sub) return fail(404, 'ההגשה לא נמצאה');
  if (sub.status !== 'submitted') return fail(409, 'ההגשה כבר טופלה', 'reviewed');
  const set = { status: 'approved', pointsAwarded: true, ...reviewerOf(admin, note, now) };
  if (lineOps !== undefined) {
    const ops = normalizeLineOps(lineOps);
    if (ops.error) return fail(400, ops.error);
    const page = await TzuratPage.findById(sub.page, { model: 1, round: 1, buildId: 1 }).lean();
    // העוגנים נגזרים מהמודל הנוכחי — רק אם הוא עדיין המודל שההגשה נעשתה מולו
    if (!page || (page.round || 1) !== (sub.round || 1) || (page.buildId || '') !== (sub.buildId || '')) {
      return fail(409, 'העמוד עודכן מאז ההגשה (סבב או בנייה חדשה) — אי אפשר לאשר עם שורות מתוקנות; אשרו בלי תיקון או דחו', 'stale');
    }
    const r = opsAndAnchors(page.model, ops.ops);
    set.lineOps = r.lineOps;
    set.anchors = r.anchors;
    set.reviewerEdited = true;
  }
  const prev = await TzuratSubmission.findOneAndUpdate({ _id: sub._id, status: 'submitted' }, { $set: set }, { returnDocument: 'before', lean: true });
  if (!prev) return fail(409, 'ההגשה כבר טופלה', 'reviewed');
  if (!prev.pointsAwarded) await User.updateOne({ _id: prev.user }, { $inc: { points: POINTS_APPROVED } });
  const r = await TzuratPage.updateOne({ _id: sub.page, round: sub.round || 1 }, { $inc: { approvedCount: 1 } });
  if (r.matchedCount) {
    await TzuratPage.updateOne(
      { _id: sub.page, round: sub.round || 1, status: 'open', $expr: { $gte: ['$approvedCount', '$required'] } },
      { $set: { status: 'done', leasedBy: null, leasedUntil: null } }
    );
  }
  return { ok: true, submission: await TzuratSubmission.findById(sub._id).lean() };
}

/**
 * דחיית הגשה מבטלת את התשובות שנשלחו בה (via 'page'): פריט פתוח — התשובה יוצאת; פריט שהוסכם (או במחלוקת)
 * בזכותה — חוזר לפתוח, הנקודות שחולקו עליו מוחזרות, ונבדק מחדש עם התשובות שנשארו. פריט ידני שנשאר בלי
 * תשובות ← obsolete. הכרעת מנהל (resolved) נשארת.
 */
async function undoPageAnswers(sub, now) {
  const ids = [...new Set([...(sub.itemAnswers || []).map((a) => String(a.item)), ...(sub.manualItems || []).map(String)])];
  for (const id of ids) {
    try {
      const item = await TzuratItem.findById(id, { status: 1, answers: 1, manual: 1, pointsAwarded: 1 }).lean();
      if (!item || !['open', 'agreed', 'disputed'].includes(item.status)) continue;
      if (!(item.answers || []).some((a) => String(a.user) === String(sub.user) && a.via === 'page')) continue;
      const after = await TzuratItem.findOneAndUpdate(
        { _id: item._id, status: item.status, answers: { $size: (item.answers || []).length } },
        {
          $pull: { answers: { user: sub.user, via: 'page' } },
          $set: { status: 'open', decision: null, pointsAwarded: item.status === 'agreed' ? false : item.pointsAwarded },
        },
        { returnDocument: 'after', lean: true }
      );
      if (!after) continue;
      if (item.status === 'agreed' && item.pointsAwarded) await award(consensus(item.answers).agreers, -POINTS_AGREED);
      if (item.manual && !(after.answers || []).length) {
        await TzuratItem.updateOne({ _id: item._id, status: 'open', answers: { $size: 0 } }, { $set: { status: 'obsolete' } });
      } else {
        await settle(item._id, after, now);
      }
    } catch (e) {
      console.error('tzurat reject undo answer', e?.name);
    }
  }
}

/** דחייה (מהגשה ממתינה, או ממאושרת שעוד לא יצאה בייצוא). ← {ok, submission} */
export async function rejectSubmission(subId, admin, { note = '' } = {}, now = new Date()) {
  if (!isObjectId(String(subId))) return fail(404, 'ההגשה לא נמצאה');
  const prev = await TzuratSubmission.findOneAndUpdate(
    { _id: oid(subId), $or: [{ status: 'submitted' }, { status: 'approved', exportedAt: null }] },
    { $set: { status: 'rejected', pointsAwarded: false, ...reviewerOf(admin, note, now) } },
    { returnDocument: 'before', lean: true }
  );
  if (!prev) {
    return (await TzuratSubmission.exists({ _id: oid(subId) })) ? fail(409, 'אי אפשר לדחות את ההגשה הזו', 'reviewed') : fail(404, 'ההגשה לא נמצאה');
  }
  const wasApproved = prev.status === 'approved';
  await undoPageAnswers(prev, now);
  if (wasApproved && prev.pointsAwarded) await User.updateOne({ _id: prev.user }, { $inc: { points: -POINTS_APPROVED } });
  const r = await TzuratPage.updateOne(
    { _id: prev.page, round: prev.round || 1 },
    { $inc: { activeCount: -1, ...(wasApproved ? { approvedCount: -1 } : {}) }, $pull: { submitters: prev.user } }
  );
  if (r.matchedCount && wasApproved) {
    await TzuratPage.updateOne(
      { _id: prev.page, round: prev.round || 1, status: 'done', $expr: { $lt: ['$approvedCount', '$required'] } },
      { $set: { status: 'open' } }
    );
  }
  return { ok: true, submission: await TzuratSubmission.findById(prev._id).lean() };
}
