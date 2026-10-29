// The AI Analyst. This file computes the facts from a user's real spending (totals, budgets, alerts, subscriptions)
// and asks the AI (server/ai.mjs: Claude-Dev, or the Ring API when Claude-Dev is slow) to write the advice and choose
// the plans from the Places database.
import { categories, places, publicPlace } from './places.mjs';
import { addDays, dayKey, daysBetween } from './time.mjs';

const round2 = value => Math.round(value * 100) / 100;
const roundTo5 = value => Math.max(0, Math.round(value / 5) * 5);
const categoryName = id => categories.find(c => c.id === id)?.name ?? 'Other';
const sar = value => { const v = round2(value); return `SAR ${v.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 })}`; };
const spendOf = user => user.transactions.filter(t => t.kind === 'purchase' && t.amount < 0);

/** Purchases per Riyadh day for the `days` days ending today, as positive amounts. */
function purchasesInLast(user, now, days) {
  const today = dayKey(now); const from = addDays(today, -(days - 1));
  return spendOf(user).filter(t => { const key = dayKey(t.date); return key >= from && key <= today; }).map(t => ({ ...t, day: dayKey(t.date), spent: -t.amount }));
}
const sum = list => round2(list.reduce((total, t) => total + t.spent, 0));
function byCategory(list) {
  return categories.map(c => { const items = list.filter(t => t.category === c.id); return { id: c.id, name: c.name, amount: sum(items), count: items.length }; })
    .filter(c => c.count > 0).sort((a, b) => b.amount - a.amount);
}

export function spendingSummary(user, period, now = new Date()) {
  const days = { day: 1, week: 7, month: 30, year: 365 }[period];
  const list = purchasesInLast(user, now, days); const today = dayKey(now);
  const series = [];
  if (period !== 'day') for (let i = Math.min(days, 60) - 1; i >= 0; i--) { const day = addDays(today, -i); series.push({ day, amount: sum(list.filter(t => t.day === day)) }); }
  return { period, from: addDays(today, -(days - 1)), to: today, total: sum(list), count: list.length, byCategory: byCategory(list), series };
}

function subscriptions(user, now) {
  const groups = new Map();
  for (const t of spendOf(user)) { const list = groups.get(t.seller) ?? []; list.push(t); groups.set(t.seller, list); }
  const today = dayKey(now); const found = [];
  for (const [seller, list] of groups) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
    const sameAmount = sorted.every(t => Math.abs(t.amount - sorted[0].amount) < 1);
    const gaps = sorted.slice(1).map((t, i) => daysBetween(dayKey(sorted[i].date), dayKey(t.date)));
    if (!sameAmount || !gaps.every(gap => gap >= 26 && gap <= 35)) continue;
    let nextDue = addDays(dayKey(sorted.at(-1).date), 30);
    while (nextDue < today) nextDue = addDays(nextDue, 30);
    found.push({ seller, category: sorted[0].category, amount: -sorted[0].amount, nextDue, daysLeft: daysBetween(today, nextDue) });
  }
  return found.sort((a, b) => a.daysLeft - b.daysLeft);
}

export function insights(user, now = new Date()) {
  const last60 = purchasesInLast(user, now, 60); const last30 = purchasesInLast(user, now, 30); const last7 = purchasesInLast(user, now, 7);
  const today = dayKey(now); const todaySpent = sum(last7.filter(t => t.day === today));
  const avgDaily30 = round2(sum(last30) / 30);
  const daily = roundTo5(avgDaily30 * 0.9);
  const alerts = [];
  const earlier = last60.filter(t => t.day < addDays(today, -6));
  for (const c of categories) {
    const recent = sum(last7.filter(t => t.category === c.id));
    const usualWeek = round2(sum(earlier.filter(t => t.category === c.id)) / 53 * 7);
    if (recent >= 50 && recent > usualWeek * 1.5 + 40) {
      const percent = usualWeek > 0 ? Math.round((recent / usualWeek - 1) * 100) : null;
      alerts.push({ type: 'overspend', category: c.id, amount: recent, usual: usualWeek, message: percent == null ? `You spent ${sar(recent)} on ${c.name} this week, which is new for you.` : `You spent ${sar(recent)} on ${c.name} this week, ${percent}% more than your usual ${sar(usualWeek)}.` });
    }
  }
  alerts.sort((a, b) => (b.amount - b.usual) - (a.amount - a.usual)).splice(3);
  if (daily > 0 && todaySpent > daily) alerts.unshift({ type: 'daily-limit', category: null, amount: todaySpent, usual: daily, message: `Today you've spent ${sar(todaySpent)}, over your suggested daily budget of ${sar(daily)}.` });
  const subs = subscriptions(user, now);
  const balanceDays = avgDaily30 > 0 ? Math.floor(user.balance / avgDaily30) : null;
  return {
    generatedAt: new Date(now).toISOString(),
    summary: { today: todaySpent, week: sum(last7), month: sum(last30), avgDaily: avgDaily30, balance: user.balance, balanceDays },
    budgets: { daily, weekly: daily * 7, monthly: daily * 30 },
    byCategory: byCategory(last30), alerts, subscriptions: subs,
  };
}

// --- Claude --------------------------------------------------------------------------------------------------
// The server supplies the facts and the candidate places; Claude chooses and explains. Every place id and price
// in the answer is checked against the Places database, so the model can't invent places or change prices.

export const POSES = ['hero', 'thumbs', 'think', 'idea', 'celebrate', 'coin', 'laptop', 'receipt', 'places', 'growth'];
const POSE = { type: 'string', enum: POSES };
const nullableString = { anyOf: [{ type: 'string' }, { type: 'null' }] };
const poseOf = value => POSES.includes(value) ? value : 'idea';
const cleanText = (value, field, max = 400) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`missing ${field}`);
  return value.trim().slice(0, max);
};

export async function advice(user, ask, now = new Date()) {
  const facts = insights(user, now);
  const { value, provider, fallbackReason } = await ask({
    task: 'advice',
    instructions: 'Read this user\'s spending facts and write a short headline (max 12 words) and 2 to 4 practical, specific tips (one sentence each) that use the real numbers. Mention upcoming subscriptions due within 7 days. Pick the character pose that fits: receipt for warnings, thumbs or celebrate for good news or saving, growth for progress.',
    schema: { type: 'object', properties: { headline: { type: 'string' }, tips: { type: 'array', items: { type: 'string' } }, pose: POSE }, required: ['headline', 'tips', 'pose'], additionalProperties: false },
    data: { name: user.name, today: dayKey(now), ...facts },
    validate: value => {
      const tips = Array.isArray(value.tips) ? value.tips.filter(t => typeof t === 'string' && t.trim()).map(t => t.trim().slice(0, 300)).slice(0, 4) : [];
      if (!tips.length) throw new Error('no tips');
      return { headline: cleanText(value.headline, 'headline', 160), tips, pose: poseOf(value.pose) };
    },
  });
  return { ...value, source: provider, fallbackReason: fallbackReason ?? null };
}

/** How the user splits leisure spending over 60 days, as shares. */
function habits(user, now) {
  const list = purchasesInLast(user, now, 60); const totals = {};
  for (const id of ['cafe', 'food', 'entertainment', 'transportation']) totals[id] = sum(list.filter(t => t.category === id));
  return totals;
}

/** Best-rated affordable places per category, as the only options Claude may choose from. */
function candidates(categoryIds, limit, perCategory = 12) {
  const options = {};
  for (const id of categoryIds) {
    options[id] = places.filter(p => p.categoryId === id && p.estimatedCost <= limit)
      .sort((a, b) => (b.rating5 ?? 3.5) - (a.rating5 ?? 3.5) || a.estimatedCost - b.estimatedCost || a.record_id.localeCompare(b.record_id))
      .slice(0, perCategory)
      .map(p => ({ placeId: p.record_id, name: p.name, cost: p.estimatedCost, rating: p.rating5, district: p.district ?? null }));
  }
  return options;
}

const PLAN_ITEM = { type: 'object', properties: { time: { type: 'string', description: 'HH:MM, 24-hour' }, label: { type: 'string' }, category: { type: 'string', enum: ['cafe', 'food', 'entertainment', 'transportation'] }, placeId: nullableString, note: nullableString }, required: ['time', 'label', 'category', 'placeId', 'note'], additionalProperties: false };
const PLAN = { type: 'object', properties: { message: { type: 'string' }, pose: POSE, items: { type: 'array', items: PLAN_ITEM } }, required: ['message', 'pose', 'items'], additionalProperties: false };
const RIDE_COST = 25;

/** Checks Claude's items against the candidates, prices them from the database and keeps the total within budget. */
function checkItems(rawItems, options, budget, { allowRide }) {
  if (!Array.isArray(rawItems)) throw new Error('items must be a list');
  const used = new Set(); const items = []; let total = 0;
  for (const raw of rawItems.slice(0, 8)) {
    if (!raw || typeof raw !== 'object') continue;
    // Arabic replies sometimes write the time with Arabic-Indic digits; accept them as HH:MM.
    const rawTime = typeof raw.time === 'string' ? raw.time.trim().replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))) : '';
    const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(rawTime) ? rawTime : null;
    if (!time) throw new Error(`bad time "${raw.time}"`);
    let place = null; let cost;
    if (raw.placeId == null || raw.placeId === '') {
      if (!(allowRide && raw.category === 'transportation')) throw new Error('only rides may have no place');
      cost = RIDE_COST;
    } else {
      const option = Object.values(options).flat().find(o => o.placeId === raw.placeId);
      if (!option) throw new Error(`unknown placeId "${raw.placeId}"`);
      if (used.has(option.placeId)) continue;
      used.add(option.placeId);
      place = places.find(p => p.record_id === option.placeId);
      cost = place.estimatedCost;
    }
    if (round2(total + cost) > budget) continue;
    total = round2(total + cost);
    const category = place?.categoryId ?? 'transportation';
    items.push({ time, label: cleanText(raw.label, 'label', 60), category, categoryName: categoryName(category), estimate: cost, place: place ? publicPlace(place) : null, note: typeof raw.note === 'string' && raw.note.trim() ? raw.note.trim().slice(0, 80) : (place ? null : 'Careem / Uber estimate') });
  }
  items.sort((a, b) => a.time.localeCompare(b.time));
  return { items, total };
}

export async function dailyPlan(user, budget, ask, now = new Date()) {
  const facts = insights(user, now);
  const options = candidates(['cafe', 'food', 'entertainment'], budget);
  const { value: plan, provider, fallbackReason } = await ask({
    task: 'daily-plan',
    instructions: `Plan today for this user within a budget of SAR ${budget} per the DATA. Choose places only from "options" by placeId. Each place costs its "cost" and the total must not exceed the budget. A ride for the day (category "transportation", placeId null) costs SAR ${RIDE_COST}; include it only if the budget is at least SAR 60. Lean towards the categories the user spends most on ("habits"), keep some money unspent when the budget is generous, and use realistic times. If nothing fits, return an empty items list and suggest a no-spend day. Write a warm 1-2 sentence message that mentions the budget, and pick a pose (idea for a plan, thumbs for a no-spend day).`,
    schema: PLAN,
    data: { name: user.name, today: dayKey(now), budget, usualDailySpend: facts.summary.avgDaily, habits: habits(user, now), options },
    validate: value => ({ message: cleanText(value.message, 'message'), pose: poseOf(value.pose), ...checkItems(value.items, options, budget, { allowRide: budget >= 60 }) }),
  });
  return { type: 'daily', date: dayKey(now), budget, items: plan.items, total: plan.total, remaining: round2(budget - plan.total), usualDaily: facts.summary.avgDaily, message: plan.message, pose: plan.pose, source: provider, fallbackReason: fallbackReason ?? null };
}

/**
 * Plans a group outing around the smallest budget in the group, so nobody has to say they can't afford it.
 * Only the smallest budget is sent to Claude and returned; individual budgets and balances never leave the server.
 */
export async function hangoutPlan(user, group, members, budget, ask, now = new Date()) {
  const budgets = members.map(member => member.id === user.id ? budget : member.hangoutBudget == null ? null : Math.min(member.hangoutBudget, Math.max(0, member.balance)));
  const perPerson = round2(Math.min(...budgets.filter(value => value != null)));
  const pending = members.filter((member, i) => budgets[i] == null).map(member => member.name);
  const options = candidates(['entertainment', 'food', 'cafe'], perPerson);
  const { value: plan, provider, fallbackReason } = await ask({
    task: 'hangout-plan',
    instructions: `Plan an evening outing for the group "${group.name}" (${members.length} people). Every person can spend at most SAR ${perPerson}. Choose places only from "options" by placeId; each "cost" is per person and the per-person total must not exceed SAR ${perPerson}. Prefer an activity, then dinner, then coffee, between 17:00 and 23:30, but fit the budget first. If nothing fits, return an empty items list and suggest a home hangout. Write a friendly 1-2 sentence message for the group that mentions the per-person budget but never suggests anyone has less money. Pick a pose (places for a plan, think if nothing fits).`,
    schema: PLAN,
    data: { group: group.name, people: members.length, perPersonBudget: perPerson, today: dayKey(now), options },
    validate: value => ({ message: cleanText(value.message, 'message'), pose: poseOf(value.pose), ...checkItems(value.items, options, perPerson, { allowRide: false }) }),
  });
  return {
    type: 'hangout', date: dayKey(now), group: { id: group.id, name: group.name },
    members: members.map((member, i) => ({ id: member.id, name: member.name, ready: budgets[i] != null })),
    pending, perPersonBudget: perPerson, groupSize: members.length, items: plan.items, perPersonTotal: plan.total, groupTotal: round2(plan.total * members.length),
    message: plan.message, pose: plan.pose, source: provider, fallbackReason: fallbackReason ?? null,
  };
}
