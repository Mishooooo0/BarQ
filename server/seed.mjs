// Builds the initial Users, Games and Payments databases. Every account starts empty: zero balance, no
// transactions, no budgets. The only records are the five logins, the BarQ Developers group and the game list.
import { hashPin } from './auth.mjs';

// Test PINs for the five accounts. Change them here, then run `npm run db:reset`.
export const SEED_ACCOUNTS = [
  { id: 'abdullah-m', name: 'Abdullah M', pin: '1001' },
  { id: 'abdullah-s', name: 'Abdullah S', pin: '2002' },
  { id: 'meshal', name: 'Meshal', pin: '3003' },
  { id: 'sultana', name: 'Sultana', pin: '4004' },
  { id: 'rasel', name: 'Rasel', pin: '5005' },
];

export const DEVELOPERS_GROUP = { id: 'barq-developers', name: 'BarQ Developers' };
export const SEED_GROUPS = [{ ...DEVELOPERS_GROUP, members: SEED_ACCOUNTS.map(account => account.id) }];

export const SEED_GAMES = [
  { id: 'flappy-bird', name: 'Flappy Bird', nameAr: 'رحلة الطيران', engine: 'fly', path: '/points-games', status: 'active', description: 'Fly through the gaps. Every gap passed is a point.' },
];

export function buildSeed(now = new Date()) {
  const users = SEED_ACCOUNTS.map(account => ({
    id: account.id, name: account.name, ...hashPin(account.pin), balance: 0, savings: 0, cashback: 0,
    hangoutBudget: null, savingsGoal: null, occasions: [], createdAt: now.toISOString(), transactions: [],
  }));
  return { users: { users, groups: SEED_GROUPS }, games: { games: SEED_GAMES, sessions: [], hangouts: [] }, payments: { payments: [] } };
}
