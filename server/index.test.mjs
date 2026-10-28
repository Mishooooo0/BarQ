import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dir = mkdtempSync(path.join(tmpdir(), 'barq-db-'));
process.env.BARQ_DB_DIR = dir;
const { startServer } = await import('./index.mjs');
const { ensureDb } = await import('./db.mjs');
const { SEED_ACCOUNTS } = await import('./seed.mjs');

let server; let base;
before(async () => {
  ensureDb({ reset: true });
  server = startServer({ port: 0, label: 'test' });
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); rmSync(dir, { recursive: true, force: true }); });

async function call(method, url, { body, token, raw } = {}) {
  const res = await fetch(base + url, { method, headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined) });
  const type = res.headers.get('content-type') ?? '';
  return { status: res.status, body: type.includes('json') ? await res.json() : await res.text() };
}
const pinOf = id => SEED_ACCOUNTS.find(a => a.id === id).pin;
async function login(id) { const { body } = await call('POST', '/api/auth/login', { body: { userId: id, pin: pinOf(id) } }); return body.token; }

test('health reports all three databases', async () => {
  const { status, body } = await call('GET', '/api/health');
  assert.equal(status, 200);
  assert.deepEqual([body.places, body.categories, body.users, body.games], [208, 7, 5, 1]);
});

test('seven category templates include all 208 places', async () => {
  const { body } = await call('GET', '/api/categories');
  assert.deepEqual(body.map(c => c.name), ['Food', 'Cafe', 'Health', 'Shopping', 'Groceries', 'Transportation', 'Entertainment']);
  assert.equal(body.reduce((sum, c) => sum + c.count, 0), 208);
});

test('places filter by category id or dataset name and paginate', async () => {
  for (const category of ['groceries', 'Groceries']) {
    const { status, body } = await call('GET', `/api/places?category=${category}&limit=2&offset=1`);
    assert.equal(status, 200);
    assert.equal(body.total, 10);
    assert.equal(body.items.length, 2);
    assert.ok(body.items.every(item => item.categoryId === 'groceries'));
  }
  assert.equal((await call('GET', '/api/places?category=nope')).status, 400);
  assert.equal((await call('GET', '/api/places/unknown')).status, 404);
});

test('directory lists the five accounts without secrets', async () => {
  const { body } = await call('GET', '/api/users');
  assert.deepEqual(body.map(u => u.name), ['Abdullah M', 'Abdullah S', 'Meshal', 'Sultana', 'Rasel']);
  assert.ok(body.every(u => Object.keys(u).join() === 'id,name'));
});

test('login needs the right four-digit PIN and accepts the name', async () => {
  assert.equal((await call('POST', '/api/auth/login', { body: { name: 'meshal', pin: '0000' } })).status, 401);
  assert.equal((await call('POST', '/api/auth/login', { body: { name: 'Nobody', pin: '1234' } })).status, 401);
  assert.equal((await call('POST', '/api/auth/login', { raw: '{not json' })).status, 400);
  const { status, body } = await call('POST', '/api/auth/login', { body: { name: ' Meshal ', pin: pinOf('meshal') } });
  assert.equal(status, 200);
  assert.equal(body.user.name, 'Meshal');
  assert.equal(body.user.pinHash, undefined);
  assert.equal((await call('GET', '/api/me', { token: body.token })).body.id, 'meshal');
});

test('repeated wrong PINs lock the account briefly', async () => {
  for (let i = 0; i < 5; i++) await call('POST', '/api/auth/login', { body: { userId: 'rasel', pin: '9999' } });
  const { status } = await call('POST', '/api/auth/login', { body: { userId: 'rasel', pin: pinOf('rasel') } });
  assert.equal(status, 429);
});

test('protected routes reject missing or forged tokens', async () => {
  assert.equal((await call('GET', '/api/me')).status, 401);
  assert.equal((await call('GET', '/api/me', { token: 'abc.def' })).status, 401);
  const token = await login('meshal');
  const [payload, signature] = token.split('.');
  const forged = Buffer.from(JSON.stringify({ sub: 'sultana', exp: Date.now() + 1e6 })).toString('base64url');
  assert.equal((await call('GET', '/api/me', { token: `${forged}.${signature}` })).status, 401);
  assert.ok(payload);
});

test('each account has 60 days of categorised spending', async () => {
  const token = await login('meshal');
  const { body } = await call('GET', '/api/me/transactions', { token });
  const purchases = body.items.filter(t => t.kind === 'purchase');
  const days = new Set(purchases.map(t => t.date.slice(0, 10)));
  assert.ok(days.size >= 45, `expected most of 60 days, got ${days.size}`);
  assert.ok(purchases.every(t => t.amount < 0 && t.seller && ['food', 'cafe', 'health', 'shopping', 'groceries', 'transportation', 'entertainment'].includes(t.category)));
  const oldest = Date.parse(purchases.at(-1).date);
  assert.ok(Date.now() - oldest < 61 * 86_400_000);
  for (const period of ['day', 'week', 'month', 'year']) assert.equal((await call('GET', `/api/me/spending?period=${period}`, { token })).status, 200);
  assert.equal((await call('GET', '/api/me/spending?period=decade', { token })).status, 400);
});

test('purchases and top-ups update the stored balance', async () => {
  const token = await login('abdullah-s');
  const start = (await call('GET', '/api/me', { token })).body.balance;
  const topup = await call('POST', '/api/me/transactions', { token, body: { kind: 'topup', amount: 100 } });
  assert.equal(topup.body.user.balance, Math.round((start + 100) * 100) / 100);
  const buy = await call('POST', '/api/me/transactions', { token, body: { kind: 'purchase', amount: '30.5', seller: 'ALBAIK', category: 'food' } });
  assert.equal(buy.status, 200);
  assert.equal(buy.body.transaction.amount, -30.5);
  assert.equal((await call('GET', '/api/me', { token })).body.balance, Math.round((start + 69.5) * 100) / 100);
  assert.equal((await call('POST', '/api/me/transactions', { token, body: { kind: 'purchase', amount: 999999, seller: 'x' } })).status, 400);
  assert.equal((await call('POST', '/api/me/transactions', { token, body: { kind: 'purchase', amount: 9999, seller: 'x' } })).status, 409);
  assert.equal((await call('POST', '/api/me/transactions', { token, body: { kind: 'topup', amount: 1.234 } })).status, 400);
});

test('transfers move money between two accounts', async () => {
  const a = await login('sultana'); const b = await login('abdullah-m');
  const before = [(await call('GET', '/api/me', { token: a })).body.balance, (await call('GET', '/api/me', { token: b })).body.balance];
  const { status } = await call('POST', '/api/transfers', { token: a, body: { to: 'abdullah-m', amount: 50 } });
  assert.equal(status, 200);
  assert.equal((await call('GET', '/api/me', { token: a })).body.balance, Math.round((before[0] - 50) * 100) / 100);
  assert.equal((await call('GET', '/api/me', { token: b })).body.balance, Math.round((before[1] + 50) * 100) / 100);
  assert.equal((await call('POST', '/api/transfers', { token: a, body: { to: 'sultana', amount: 5 } })).status, 400);
  assert.equal((await call('POST', '/api/transfers', { token: a, body: { to: 'ghost', amount: 5 } })).status, 400);
});

test('analyst insights, daily plan and budget limits', async () => {
  const token = await login('meshal');
  const insight = (await call('GET', '/api/analyst/insights', { token })).body;
  assert.ok(insight.budgets.daily > 0);
  assert.ok(insight.subscriptions.some(s => s.seller === 'Netflix'));
  const balance = (await call('GET', '/api/me', { token })).body.balance;
  const plan = (await call('POST', '/api/analyst/daily', { token, body: { budget: 150 } })).body;
  assert.ok(plan.items.length > 0);
  assert.ok(plan.total <= 150);
  assert.equal(plan.total + plan.remaining, 150);
  assert.equal((await call('POST', '/api/analyst/daily', { token, body: { budget: 0 } })).body.items.length, 0);
  assert.equal((await call('POST', '/api/analyst/daily', { token, body: { budget: balance + 1 } })).status, 400);
});

test('hangout plan uses the smallest budget and never reveals other budgets', async () => {
  const token = await login('meshal');
  const groups = (await call('GET', '/api/me/groups', { token })).body;
  assert.deepEqual(groups.map(g => g.id), ['shilla', 'weekend', 'study']);
  const { status, body } = await call('POST', '/api/analyst/hangout', { token, body: { groupId: 'shilla', budget: 300 } });
  assert.equal(status, 200);
  assert.equal(body.perPersonBudget, 80);
  assert.ok(body.perPersonTotal <= 80 && body.items.length > 0);
  assert.equal(body.groupTotal, Math.round(body.perPersonTotal * 5 * 100) / 100);
  assert.ok(!JSON.stringify(body).includes('hangoutBudget') && !JSON.stringify(body).includes('balance'));
  assert.equal((await call('GET', '/api/me', { token })).body.hangoutBudget, 300);
  assert.equal((await call('POST', '/api/analyst/hangout', { token, body: { groupId: 'missing', budget: 50 } })).status, 404);
});

test('game session picks the payer by total points and charges the bill', async () => {
  const host = await login('abdullah-m');
  assert.deepEqual((await call('GET', '/api/games')).body.map(g => g.name), ['Flappy Bird']);
  const created = await call('POST', '/api/game-sessions', { token: host, body: { players: ['abdullah-m', 'meshal', 'rasel'], billAmount: 120 } });
  assert.equal(created.status, 200);
  const id = created.body.id;
  assert.equal(created.body.rounds.length, 1);
  assert.equal((await call('POST', `/api/game-sessions/${id}/settle`, { token: host })).status, 409);
  const other = await login('meshal');
  assert.equal((await call('POST', `/api/game-sessions/${id}/scores`, { token: other, body: { playerId: 'meshal', points: 5 } })).status, 403);
  for (const [playerId, points] of [['abdullah-m', 7], ['meshal', 12], ['rasel', 3]]) assert.equal((await call('POST', `/api/game-sessions/${id}/scores`, { token: host, body: { playerId, points } })).status, 200);
  const session = (await call('GET', `/api/game-sessions/${id}`, { token: other })).body;
  assert.equal(session.status, 'finished');
  assert.equal(session.result.payer, 'meshal');
  const before = (await call('GET', '/api/me', { token: other })).body.balance;
  assert.equal((await call('POST', `/api/game-sessions/${id}/settle`, { token: host })).body.status, 'settled');
  assert.equal((await call('GET', '/api/me', { token: other })).body.balance, Math.round((before - 120) * 100) / 100);
  assert.equal((await call('POST', `/api/game-sessions/${id}/settle`, { token: host })).status, 409);
  assert.equal((await call('POST', '/api/game-sessions', { token: host, body: { players: ['meshal', 'rasel'] } })).status, 400);
});

test('direct UI routes return the app shell or a build hint, and unknown API routes stay 404', async () => {
  const page = await call('GET', '/rewards/wheel');
  assert.ok([200, 503].includes(page.status));
  assert.equal(typeof page.body, 'string');
  assert.equal((await call('GET', '/api/missing')).status, 404);
  assert.equal((await call('DELETE', '/api/health')).status, 405);
});
