// The AI Analyst: reads a user's spending history and the Places database to produce insights, a daily plan and a
// group hangout plan. Deterministic rules, so it works offline and gives the same answer for the same data.
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
  const dueSoon = subs.filter(s => s.daysLeft <= 7);
  const balanceDays = avgDaily30 > 0 ? Math.floor(user.balance / avgDaily30) : null;
  const top = byCategory(last30)[0];
  const tips = [];
  if (top) tips.push(`${top.name} is your biggest category this month at ${sar(top.amount)}.`);
  if (balanceDays != null) tips.push(`At your current pace your balance covers about ${balanceDays} days.`);
  for (const s of dueSoon) tips.push(`${s.seller} renews ${s.daysLeft === 0 ? 'today' : s.daysLeft === 1 ? 'tomorrow' : `in ${s.daysLeft} days`} (${sar(s.amount)}).`);
  return {
    generatedAt: new Date(now).toISOString(),
    pose: alerts.length ? 'receipt' : 'thumbs',
    headline: alerts.length ? `I found ${alerts.length} thing${alerts.length > 1 ? 's' : ''} to watch.` : 'Your spending looks healthy. Keep it up!',
    summary: { today: todaySpent, week: sum(last7), month: sum(last30), avgDaily: avgDaily30, balance: user.balance, balanceDays },
    budgets: { daily, weekly: daily * 7, monthly: daily * 30 },
    byCategory: byCategory(last30), alerts, subscriptions: subs, tips,
  };
}

// --- Plans -----------------------------------------------------------------------------------------------------

/** Small stable hash so plans vary by day and budget but repeat for the same request. */
const seedOf = text => [...text].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
const score = place => place.rating5 ?? 3.5;

/** Best-rated affordable place in a category, rotating among the top few for variety. */
function choose(categoryId, limit, used, seed) {
  const options = places.filter(p => p.categoryId === categoryId && !used.has(p.record_id) && p.estimatedCost <= limit)
    .sort((a, b) => score(b) - score(a) || b.estimatedCost - a.estimatedCost || a.record_id.localeCompare(b.record_id));
  if (!options.length) return null;
  const top = options.filter(p => score(p) >= score(options[0]) - 0.3).slice(0, 5);
  return top[seed % top.length];
}
const cheapest = categoryId => Math.min(...places.filter(p => p.categoryId === categoryId).map(p => p.estimatedCost));

/** Fills slots in priority order, each aiming for its weighted share of what is left. Returns null if a required slot cannot be filled. */
function fill(slots, budget, seed, { requireAll = false } = {}) {
  let remaining = budget; const used = new Set(); const items = [];
  const open = new Set(slots.map(s => s.id));
  for (const slot of [...slots].sort((a, b) => a.priority - b.priority)) {
    const weightLeft = slots.filter(s => open.has(s.id)).reduce((total, s) => total + s.weight, 0);
    open.delete(slot.id);
    const target = remaining * (slot.weight / weightLeft);
    const place = slot.fixedCost != null ? null : choose(slot.category, Math.min(remaining, Math.max(target, cheapest(slot.category))), used, seed + slot.priority);
    const cost = slot.fixedCost ?? place?.estimatedCost;
    if (cost == null || cost > remaining) { if (requireAll) return null; continue; }
    if (place) used.add(place.record_id);
    remaining = round2(remaining - cost);
    items.push({ time: slot.time, label: slot.label, category: slot.category, categoryName: categoryName(slot.category), estimate: cost, place: place ? publicPlace(place) : null, note: slot.note ?? null });
  }
  items.sort((a, b) => a.time.localeCompare(b.time));
  return { items, total: round2(budget - remaining), remaining };
}

/** How the user usually splits leisure spending, used to weight the plan. */
function habits(user, now) {
  const list = purchasesInLast(user, now, 60); const weights = {};
  for (const id of ['cafe', 'food', 'entertainment']) weights[id] = Math.max(0.5, sum(list.filter(t => t.category === id)));
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  for (const id in weights) weights[id] = weights[id] / total;
  return weights;
}

export function dailyPlan(user, budget, now = new Date()) {
  const today = dayKey(now); const weights = habits(user, now); const seed = seedOf(`${user.id}|${today}|${budget}`);
  const avgDaily = insights(user, now).summary.avgDaily;
  const slots = [
    { id: 'coffee', time: '09:00', label: 'Morning coffee', category: 'cafe', weight: weights.cafe, priority: 2 },
    { id: 'lunch', time: '13:30', label: 'Lunch', category: 'food', weight: weights.food * 0.5, priority: 1 },
    { id: 'outing', time: '19:00', label: 'Evening outing', category: 'entertainment', weight: weights.entertainment, priority: 4 },
    { id: 'dinner', time: '21:00', label: 'Dinner', category: 'food', weight: weights.food * 0.5, priority: 3 },
  ];
  if (budget >= 60) slots.push({ id: 'rides', time: '08:30', label: 'Rides for the day', category: 'transportation', weight: 0.08, priority: 0, fixedCost: 25, note: 'Careem / Uber estimate' });
  const plan = fill(slots, budget, seed);
  const { items } = plan;
  let message; let pose;
  if (!items.length) { pose = 'piggy'; message = `With ${sar(budget)} nothing on the list fits today, so make it a no-spend day and let the piggy bank grow.`; }
  else if (avgDaily > 0 && budget < avgDaily) { pose = 'idea'; message = `Here's a day for ${sar(budget)}, ${sar(avgDaily - budget)} less than your usual ${sar(avgDaily)} a day. Smart move.`; }
  else { pose = 'idea'; message = `Here's your day for ${sar(budget)}, picked from Riyadh places that fit.`; }
  if (items.length && plan.remaining >= 1) message += ` ${sar(plan.remaining)} stays in your wallet.`;
  return { type: 'daily', date: today, budget, ...plan, usualDaily: avgDaily, message, pose };
}

/**
 * Plans a group outing around the smallest budget in the group, so nobody has to say they can't afford it.
 * Other members' budgets are never returned, only whether they have set one.
 */
export function hangoutPlan(user, group, members, budget, now = new Date()) {
  const budgets = members.map(member => member.id === user.id ? budget : member.hangoutBudget == null ? null : Math.min(member.hangoutBudget, Math.max(0, member.balance)));
  const known = budgets.filter(value => value != null);
  const perPerson = round2(Math.min(...known));
  const pending = members.filter((member, i) => budgets[i] == null).map(member => member.name);
  const seed = seedOf(`${group.id}|${dayKey(now)}|${perPerson}`);
  const options = [
    [['entertainment', '18:00', 'Activity'], ['food', '20:00', 'Dinner'], ['cafe', '22:00', 'Coffee after']],
    [['food', '19:30', 'Dinner'], ['cafe', '21:30', 'Coffee after']],
    [['entertainment', '19:00', 'Activity'], ['cafe', '21:30', 'Coffee after']],
    [['food', '20:00', 'Dinner']],
    [['cafe', '20:00', 'Coffee meet-up']],
  ];
  let plan = null;
  for (const option of options) {
    plan = fill(option.map(([category, time, label], i) => ({ id: `${category}-${i}`, category, time, label, weight: category === 'cafe' ? 0.6 : 1, priority: i })), perPerson, seed, { requireAll: true });
    if (plan) break;
  }
  const size = members.length;
  const items = plan?.items ?? [];
  const perPersonTotal = plan?.total ?? 0;
  const message = items.length
    ? `I planned around a budget everyone can manage: ${sar(perPerson)} each. The whole outing comes to about ${sar(perPersonTotal)} per person.`
    : `The group budget of ${sar(perPerson)} each is too tight for an outing. How about a home hangout this time?`;
  return {
    type: 'hangout', date: dayKey(now), group: { id: group.id, name: group.name },
    members: members.map((member, i) => ({ id: member.id, name: member.name, ready: budgets[i] != null })),
    pending, perPersonBudget: perPerson, groupSize: size, items, perPersonTotal, groupTotal: round2(perPersonTotal * size),
    message, pose: items.length ? 'places' : 'think',
  };
}
