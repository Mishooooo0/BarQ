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

// The five Points Challenges games. `engine` is the game's key in public/games/points-games.html (?play=<engine>).
// "Who pays" sessions always start with Flappy Bird, then two of the others at random (server/games.mjs).
export const SEED_GAMES = [
  { id: 'flappy-bird', name: 'Flappy Bird', nameAr: 'رحلة الطيران', engine: 'fly', path: '/points-games', status: 'active', description: 'Fly through the gaps. Every gap passed is a point.' },
  { id: 'stack-builder', name: 'Building Challenge', nameAr: 'تحدي البناء', engine: 'stack', path: '/points-games', status: 'active', description: 'Stack the moving blocks as high as you can. Every block placed earns points.' },
  { id: 'reaction', name: 'Reaction', nameAr: 'رد الفعل', engine: 'react', path: '/points-games', status: 'active', description: 'Tap the moment it turns green. Five rounds, up to 100 points each.' },
  { id: 'precision', name: 'Precision Challenge', nameAr: 'تحدي الدقة', engine: 'aim', path: '/points-games', status: 'active', description: 'Five shots at a moving target, up to 100 points each.' },
  { id: 'number-order', name: 'Number Order', nameAr: 'ترتيب الأرقام', engine: 'num', path: '/points-games', status: 'active', description: 'Tap 1 to 10 in order. Faster taps earn more points.' },
];

export function buildSeed(now = new Date()) {
  const users = SEED_ACCOUNTS.map(account => ({
    id: account.id, name: account.name, ...hashPin(account.pin), balance: 0, savings: 0, cashback: 0,
    hangoutBudget: null, savingsGoal: null, occasions: [], createdAt: now.toISOString(), transactions: [],
  }));
  return { users: { users, groups: SEED_GROUPS }, games: { games: SEED_GAMES, sessions: [], hangouts: [] }, payments: { payments: [] } };
}
