// Occasions: budgets for Eid al-Fitr, Eid al-Adha, graduations, home parties and holiday trips, with an Eidia list
// for the two Eids. Stored on each user in the Users database. Barq (server/ai.mjs) can suggest how to split a budget.
import { addDays, dayKey, daysBetween } from './time.mjs';

// Each type starts with suggested lines as a share (%) of the budget. The Eid lines leave a quarter for Eidia.
// Eid dates follow the moon, so these are the expected dates; people can change them.
export const OCCASION_TYPES = [
  { id: 'eid-fitr', name: 'Eid al-Fitr', nameAr: 'عيد الفطر', eidia: true, dates: ['2027-03-09', '2028-02-27', '2029-02-15'], lines: [['Eid clothes', 30], ['Sweets, dates and coffee', 15], ['Family gathering', 20], ['Gifts', 10]] },
  { id: 'eid-adha', name: 'Eid al-Adha', nameAr: 'عيد الأضحى', eidia: true, dates: ['2026-05-27', '2027-05-16', '2028-05-05', '2029-04-24'], lines: [['Udhiyah (sacrifice)', 45], ['Eid clothes', 15], ['Family gathering', 15]] },
  { id: 'graduation', name: 'Graduation', nameAr: 'حفلة تخرّج', eidia: false, lines: [['Venue', 30], ['Cake and sweets', 15], ['Gift', 25], ['Photos', 15], ['Decorations', 15]] },
  { id: 'home-party', name: 'Home party', nameAr: 'عزيمة بالبيت', eidia: false, lines: [['Food', 40], ['Drinks and sweets', 20], ['Decorations', 15], ['Games and music', 10], ['Cleaning', 15]] },
  { id: 'holiday', name: 'Holiday trip', nameAr: 'سفرة', eidia: false, lines: [['Travel', 35], ['Stay', 35], ['Food', 15], ['Activities', 15]] },
];
export const MAX_OCCASIONS = 20;
const MAX_LINES = 15;
const MAX_EIDIA = 40;
export const MAX_BUDGET = 100000;

const round2 = value => Math.round(value * 100) / 100;
const sumOf = list => round2(list.reduce((total, x) => total + x.amount, 0));
export const findType = id => OCCASION_TYPES.find(t => t.id === id) ?? null;

/** The next expected date for an Eid (today or later), or null for other types. */
export function expectedDate(type, now = new Date()) {
  const today = dayKey(now);
  return type.dates?.find(d => d >= today) ?? null;
}
export const publicTypes = (now = new Date()) => OCCASION_TYPES.map(t => ({ id: t.id, name: t.name, eidia: t.eidia, expectedDate: expectedDate(t, now), lines: t.lines.map(([label]) => label) }));

/** Starting lines for a new occasion: the type's shares of the budget, in whole riyals. */
export function templateLines(type, budget) {
  return type.lines.map(([label, share], i) => ({ id: `line-${i + 1}`, label, amount: Math.floor(budget * share / 100), done: false }));
}

/**
 * How much to put aside to be ready on the day: the part of the budget not bought or given yet, spread over the days
 * left (and the weeks and months, counting a started month as a month). Nothing is left to save once the day has passed.
 */
export function savingPlan({ budget, done, daysLeft, past }) {
  const amount = past ? 0 : round2(Math.max(0, budget - done));
  const days = past ? 0 : daysLeft;
  const weeks = Math.max(1, Math.ceil(days / 7)); const months = Math.max(1, Math.ceil(days / 30));
  const per = parts => amount > 0 ? Math.ceil(amount / parts) : 0;
  return { amount, days, weeks, months, perDay: per(Math.max(1, days)), perWeek: per(weeks), perMonth: per(months) };
}

/** Totals, countdown and the saving plan to be ready on the day. */
export function publicOccasion(o, now = new Date()) {
  const type = findType(o.type);
  const today = dayKey(now);
  const planned = round2(sumOf(o.lines) + sumOf(o.eidia));
  const daysLeft = Math.max(0, daysBetween(today, o.date));
  const past = o.date < today;
  const done = round2(sumOf(o.lines.filter(l => l.done)) + sumOf(o.eidia.filter(p => p.given)));
  const saving = savingPlan({ budget: o.budget, done, daysLeft, past });
  return {
    id: o.id, type: o.type, typeName: type?.name ?? o.type, hasEidia: !!type?.eidia, title: o.title, date: o.date, budget: o.budget,
    lines: o.lines, eidia: o.eidia, createdAt: o.createdAt, updatedAt: o.updatedAt,
    totals: {
      lines: sumOf(o.lines), eidia: sumOf(o.eidia), planned, left: round2(o.budget - planned), over: planned > o.budget,
      done,
    },
    daysLeft, past, saving, perWeek: saving.perWeek,
  };
}

// --- Validation (throws { status: 400 } errors that the API turns into readable messages) ------------------------

const bad = message => Object.assign(new Error(message), { status: 400 });
function label(value, field, max = 40) {
  if (typeof value !== 'string' || !value.trim()) throw bad(`${field} is required.`);
  if (value.trim().length > max) throw bad(`${field} must be ${max} characters or fewer.`);
  return value.trim();
}
function money(value, field, { max = MAX_BUDGET, allowZero = true } = {}) {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n) || n < (allowZero ? 0 : 1) || n > max || Math.abs(n * 100 - Math.round(n * 100)) > 1e-6) throw bad(`Enter ${field} from SAR ${allowZero ? 0 : 1} to SAR ${max.toLocaleString('en-US')}.`);
  return round2(n);
}
export const budgetOf = value => money(value, 'a budget', { allowZero: false });

/** An occasion date: a real day from today up to two years ahead. Past dates are kept when unchanged. */
export function dateOf(value, now = new Date(), keep = null) {
  const date = typeof value === 'string' ? value.trim() : '';
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(date) ? Date.parse(`${date}T00:00:00Z`) : NaN;
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== date) throw bad('Enter a real date as YYYY-MM-DD.');
  if (date === keep) return date;
  const today = dayKey(now);
  if (date < today) throw bad("The occasion date can't be in the past.");
  if (date > addDays(today, 730)) throw bad('Plan occasions up to two years ahead.');
  return date;
}

export function linesOf(value) {
  if (!Array.isArray(value)) throw bad('Send the budget lines as a list.');
  if (value.length > MAX_LINES) throw bad(`An occasion can have up to ${MAX_LINES} budget lines.`);
  return value.map((line, i) => ({ id: typeof line?.id === 'string' && line.id.length <= 40 ? line.id : `line-${Date.now().toString(36)}-${i}`, label: label(line?.label, 'Each line needs a name'), amount: money(line?.amount, 'each amount'), done: line?.done === true }));
}
export function eidiaOf(value, allowed) {
  if (!Array.isArray(value)) throw bad('Send the Eidia list as a list.');
  if (value.length && !allowed) throw bad('Eidia lists are for Eid al-Fitr and Eid al-Adha.');
  if (value.length > MAX_EIDIA) throw bad(`The Eidia list can have up to ${MAX_EIDIA} people.`);
  return value.map((p, i) => ({ id: typeof p?.id === 'string' && p.id.length <= 40 ? p.id : `eidia-${Date.now().toString(36)}-${i}`, name: label(p?.name, 'Each Eidia needs a name', 30), amount: money(p?.amount, 'each Eidia', { max: 10000 }), given: p?.given === true }));
}

// --- Barq's suggestion -----------------------------------------------------------------------------------------

const POSES = ['idea', 'thumbs', 'celebrate', 'coin', 'growth', 'think'];
const SUGGESTION = {
  type: 'object',
  properties: {
    message: { type: 'string' }, pose: { type: 'string', enum: POSES },
    lines: { type: 'array', items: { type: 'object', properties: { label: { type: 'string' }, amount: { type: 'number' }, note: { anyOf: [{ type: 'string' }, { type: 'null' }] } }, required: ['label', 'amount', 'note'], additionalProperties: false } },
    tips: { type: 'array', items: { type: 'string' } },
    saving: { type: 'object', properties: { perDay: { type: 'number' }, perMonth: { type: 'number' }, tip: { type: 'string' } }, required: ['perDay', 'perMonth', 'tip'], additionalProperties: false },
  },
  required: ['message', 'pose', 'lines', 'tips', 'saving'], additionalProperties: false,
};

/**
 * Asks Barq to split the part of the budget not already promised as Eidia, and to explain the saving plan (per day and
 * per month until the date). Amounts are whole riyals and are scaled down if the answer goes over, so the suggestion
 * always fits the budget; the saving numbers always come from savingPlan(), whatever the answer says.
 */
export async function suggestPlan(occasion, user, monthSpend, ask, now = new Date()) {
  const view = publicOccasion(occasion, now);
  const available = Math.max(0, Math.floor(occasion.budget - view.totals.eidia));
  const plan = view.saving;
  const { value, provider, fallbackReason } = await ask({
    task: 'occasion-plan',
    instructions: `Plan the budget for this ${view.typeName} in Saudi Arabia. Split the available amount into 3 to 7 practical budget lines (short names, whole riyals) that add up to no more than the available amount. Keep the Eidia already listed as it is. Add a short note to a line only when it helps (for example, when to buy). Write a one-sentence message and 2 or 3 short, specific tips about the lines (what to buy early, where to save). Fill "saving" with perDay and perMonth exactly as given in DATA.savingPlan and a one-sentence tip on how to put that much aside until the date (for example from each salary or into the Saving box). Pick a pose: celebrate or thumbs when the budget is comfortable, think when it is tight.`,
    schema: SUGGESTION,
    data: {
      occasion: view.typeName, occasionInArabic: findType(occasion.type)?.nameAr ?? view.typeName, title: occasion.title, date: occasion.date, today: dayKey(now), daysLeft: view.daysLeft, budget: occasion.budget,
      eidia: { people: occasion.eidia.length, total: view.totals.eidia }, available, currentLines: occasion.lines.map(l => ({ label: l.label, amount: l.amount })),
      wallet: { balance: user.balance, savingBox: user.savings ?? 0, spentLast30Days: monthSpend },
      savingPlan: { amountToSave: plan.amount, daysLeft: plan.days, monthsLeft: plan.months, perDay: plan.perDay, perMonth: plan.perMonth },
    },
    validate: raw => {
      if (!Array.isArray(raw.lines)) throw new Error('lines must be a list');
      let lines = raw.lines.filter(l => l && typeof l.label === 'string' && l.label.trim() && Number.isFinite(l.amount) && l.amount > 0).slice(0, 7)
        .map(l => ({ label: l.label.trim().slice(0, 40), amount: Math.round(l.amount), note: typeof l.note === 'string' && l.note.trim() ? l.note.trim().slice(0, 140) : null }));
      if (!lines.length && available > 0) throw new Error('no lines');
      const total = lines.reduce((t, l) => t + l.amount, 0);
      if (total > available) lines = lines.map(l => ({ ...l, amount: Math.floor(l.amount * available / total) })).filter(l => l.amount > 0);
      const tips = Array.isArray(raw.tips) ? raw.tips.filter(t => typeof t === 'string' && t.trim()).map(t => t.trim().slice(0, 240)).slice(0, 3) : [];
      if (typeof raw.message !== 'string' || !raw.message.trim()) throw new Error('missing message');
      if (!raw.saving || typeof raw.saving.tip !== 'string' || !raw.saving.tip.trim()) throw new Error('missing saving tip');
      return { message: raw.message.trim().slice(0, 300), pose: POSES.includes(raw.pose) ? raw.pose : 'idea', lines, tips, savingTip: raw.saving.tip.trim().slice(0, 240) };
    },
  });
  const total = value.lines.reduce((t, l) => t + l.amount, 0);
  const { savingTip, ...rest } = value;
  return { ...rest, saving: { ...plan, tip: savingTip }, total, available, source: provider, fallbackReason: fallbackReason ?? null };
}
