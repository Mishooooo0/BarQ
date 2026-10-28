// Builds the initial Users and Games databases. Spending is deterministic per account and is laid out relative to
// the day the database is created, so the 60-day history always ends today.
import { hashPin } from './auth.mjs';
import { DAY_MS, riyadhMidnight, riyadhWeekday } from './time.mjs';

// Test PINs for the five mock accounts. Change them here, then run `npm run db:reset`.
export const SEED_ACCOUNTS = [
  { id: 'abdullah-m', name: 'Abdullah M', pin: '1001', balance: 4850.75, savings: 5200, cashback: 212.3, hangoutBudget: 150, topup: 2500,
    profile: { food: 3, cafe: 2, health: 0.5, shopping: 1, groceries: 1.5, transportation: 1.5, entertainment: 1 },
    subscriptions: [{ seller: 'Netflix', category: 'entertainment', amount: 56, dueIn: 4 }, { seller: 'Fitness Time', category: 'health', amount: 299, dueIn: 2 }] },
  { id: 'abdullah-s', name: 'Abdullah S', pin: '2002', balance: 2380.2, savings: 2100, cashback: 96.5, hangoutBudget: 120, topup: 2000,
    profile: { food: 2.5, cafe: 3, health: 0.4, shopping: 0.8, groceries: 1, transportation: 2, entertainment: 1.2 },
    subscriptions: [{ seller: 'Shahid VIP', category: 'entertainment', amount: 25, dueIn: 11 }] },
  { id: 'meshal', name: 'Meshal', pin: '3003', balance: 1860.4, savings: 1450, cashback: 157.44, hangoutBudget: null, topup: 1800,
    profile: { food: 3, cafe: 3.5, health: 0.3, shopping: 1.2, groceries: 0.6, transportation: 1.5, entertainment: 1.5 },
    subscriptions: [{ seller: 'Netflix', category: 'entertainment', amount: 56, dueIn: 4 }, { seller: 'Shahid VIP', category: 'entertainment', amount: 25, dueIn: 11 }],
    burst: 'cafe' },
  { id: 'sultana', name: 'Sultana', pin: '4004', balance: 6215, savings: 8700, cashback: 301.1, hangoutBudget: 200, topup: 3000,
    profile: { food: 2, cafe: 2, health: 1, shopping: 2.5, groceries: 2, transportation: 1.2, entertainment: 0.8 },
    subscriptions: [{ seller: 'Fitness Time', category: 'health', amount: 299, dueIn: 2 }] },
  { id: 'rasel', name: 'Rasel', pin: '5005', balance: 1240.9, savings: 900, cashback: 48.75, hangoutBudget: 80, topup: 1500,
    profile: { food: 3, cafe: 1.5, health: 0.3, shopping: 0.6, groceries: 1, transportation: 2.5, entertainment: 1 },
    subscriptions: [{ seller: 'Shahid VIP', category: 'entertainment', amount: 25, dueIn: 11 }] },
];

export const SEED_GROUPS = [
  { id: 'shilla', name: 'The Shilla', members: ['abdullah-m', 'abdullah-s', 'meshal', 'sultana', 'rasel'] },
  { id: 'weekend', name: 'Weekend crew', members: ['abdullah-m', 'abdullah-s', 'meshal'] },
  { id: 'study', name: 'Study group', members: ['meshal', 'sultana', 'rasel'] },
];

export const SEED_GAMES = [
  { id: 'flappy-bird', name: 'Flappy Bird', nameAr: 'رحلة الطيران', engine: 'fly', path: '/points-games', status: 'active', description: 'Fly through the gaps. Every gap passed is a point.' },
];

const sellers = {
  food: [['ALBAIK', 18, 45], ['Kudu', 25, 55], ['Herfy', 20, 45], ['Shawarmer', 15, 35], ['Al Romansiah', 45, 120], ['Maestro Pizza', 35, 80]],
  cafe: [["Barn's", 12, 28], ['Dr. Cafe', 15, 32], ['Starbucks', 18, 40], ['Half Million', 16, 34], ['Kyan', 14, 30]],
  health: [['Nahdi Pharmacy', 20, 140], ['Al-Dawaa Pharmacy', 15, 120]],
  shopping: [['Jarir Bookstore', 25, 180], ['Centrepoint', 60, 250], ['eXtra', 80, 450], ['noon', 30, 200]],
  groceries: [['Panda', 40, 280], ['Tamimi Markets', 50, 320], ['Danube', 60, 350], ['Othaim Markets', 30, 220]],
  transportation: [['Careem', 15, 60], ['Uber', 18, 70], ['Riyadh Metro', 4, 12], ['Aldrees Fuel', 60, 120]],
  entertainment: [['VOX Cinemas', 45, 120], ['Boulevard City', 50, 200], ['Muvi Cinemas', 40, 110], ["Sparky's", 30, 90]],
};
const hours = { food: [[12, 15], [19, 23]], cafe: [[7, 11], [15, 18]], health: [[10, 21]], shopping: [[16, 23]], groceries: [[17, 22]], transportation: [[7, 22]], entertainment: [[18, 23]] };
const dailyCount = { 0: 15, 1: 35, 2: 30, 3: 15, 4: 5 };

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hashString = text => [...text].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
function weighted(random, weights) {
  const entries = Object.entries(weights); let r = random() * entries.reduce((sum, [, w]) => sum + w, 0);
  for (const [key, w] of entries) { r -= w; if (r < 0) return key; }
  return entries.at(-1)[0];
}
const pick = (random, list) => list[Math.floor(random() * list.length)];
const money = value => Math.round(Math.round(value * 4) / 4 * 100) / 100;

export function buildTransactions(account, now = new Date()) {
  const random = rng(hashString(account.id)); const nowMs = now.getTime(); const today = riyadhMidnight(now);
  const list = [];
  const add = (time, seller, category, amount, kind) => { if (time <= nowMs) list.push({ date: new Date(Math.floor(time / 60000) * 60000).toISOString(), seller, category, amount: money(amount), kind }); };
  const purchase = (dayStart, category) => {
    const [seller, min, max] = pick(random, sellers[category]); const [from, to] = pick(random, hours[category]);
    add(dayStart + (from + random() * (to - from)) * 3_600_000, seller, category, -(min + random() * (max - min)), 'purchase');
  };
  for (let daysAgo = 59; daysAgo >= 0; daysAgo--) {
    const dayStart = today - daysAgo * DAY_MS; const weekday = riyadhWeekday(dayStart);
    const weights = weekday === 5 || weekday === 6 ? { ...account.profile, food: account.profile.food * 1.3, entertainment: account.profile.entertainment * 2.5 } : account.profile;
    const count = Number(weighted(random, dailyCount));
    for (let i = 0; i < count; i++) purchase(dayStart, weighted(random, weights));
    if (account.burst && daysAgo < 6) purchase(dayStart, account.burst); // a recent habit the analyst should flag
    if ((daysAgo - 55) % 14 === 0 && daysAgo <= 55) add(dayStart + 10 * 3_600_000, 'Bank top-up', null, account.topup, 'topup');
  }
  for (const sub of account.subscriptions) {
    for (const cycle of [1, 2]) {
      const day = sub.dueIn - 30 * cycle;
      if (day >= -59) add(today + day * DAY_MS + 9 * 3_600_000, sub.seller, sub.category, -sub.amount, 'purchase');
    }
  }
  list.sort((a, b) => b.date.localeCompare(a.date));
  return list.map((t, i) => ({ id: `${account.id}-${String(list.length - i).padStart(4, '0')}`, ...t }));
}

export function buildSeed(now = new Date()) {
  const users = SEED_ACCOUNTS.map(account => ({
    id: account.id, name: account.name, ...hashPin(account.pin), balance: account.balance, savings: account.savings, cashback: account.cashback,
    hangoutBudget: account.hangoutBudget, createdAt: now.toISOString(), transactions: buildTransactions(account, now),
  }));
  return { users: { users, groups: SEED_GROUPS }, games: { games: SEED_GAMES, sessions: [] } };
}
