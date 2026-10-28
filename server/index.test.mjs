import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// Never reach the real AI endpoints from tests, whatever keys this machine has.
for (const name of ['CLAUDE_DEV_KEY', 'CLAUDE_DEV_BASE_URL', 'CLAUDE_DEV_MODEL', 'CLAUDE_DEV_TIMEOUT_MS', 'RING_CLOUD_KEY', 'RING_API_BASE_URL', 'RING_API_MODEL', 'RING_API_TIMEOUT_MS']) delete process.env[name];
const dir = mkdtempSync(path.join(tmpdir(), 'barq-db-'));
process.env.BARQ_DB_DIR = dir;
const { startFakeClaude } = await import('../tests/fake-claude.mjs');
const fake = await startFakeClaude();
process.env.CLAUDE_DEV_BASE_URL = `http://127.0.0.1:${fake.address().port}`;
process.env.CLAUDE_DEV_KEY = 'test-key';
process.env.CLAUDE_DEV_TIMEOUT_MS = '1000';
const RING_URL = `http://127.0.0.1:${fake.address().port}/ring/v1`;
const { startServer } = await import('./index.mjs');
const { ensureDb, update } = await import('./db.mjs');
const { SEED_ACCOUNTS } = await import('./seed.mjs');

let server; let base;
before(async () => {
  ensureDb({ reset: true });
  server = startServer({ port: 0, label: 'test' });
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); fake.close(); rmSync(dir, { recursive: true, force: true }); });

async function call(method, url, { body, token, raw } = {}) {
  const res = await fetch(base + url, { method, headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined) });
  const type = res.headers.get('content-type') ?? '';
  return { status: res.status, body: type.includes('json') ? await res.json() : await res.text() };
}
const pinOf = id => SEED_ACCOUNTS.find(a => a.id === id).pin;
async function login(id) { const { body } = await call('POST', '/api/auth/login', { body: { userId: id, pin: pinOf(id) } }); return body.token; }
/** Accounts start at zero, so tests add money the way a user would: a wallet top-up. */
async function fund(token, amount) { const { status } = await call('POST', '/api/me/transactions', { token, body: { kind: 'topup', amount } }); assert.equal(status, 200); }
const balanceOf = async token => (await call('GET', '/api/me', { token })).body.balance;
const round = value => Math.round(value * 100) / 100;
const everyone = ['abdullah-m', 'abdullah-s', 'meshal', 'sultana', 'rasel'];

test('health reports all four databases and the AI connection without the key', async () => {
  const { status, body } = await call('GET', '/api/health');
  assert.equal(status, 200);
  assert.deepEqual([body.places, body.categories, body.users, body.games, body.payments], [208, 7, 5, 1, 0]);
  assert.equal(body.ai.configured, true);
  assert.ok(!JSON.stringify(body).includes('test-key'));
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
  assert.equal((await call('GET', '/api/places?limit=250')).body.items.length, 208);
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

test('protected routes reject missing or forged tokens', async () => {
  assert.equal((await call('GET', '/api/me')).status, 401);
  assert.equal((await call('GET', '/api/me', { token: 'abc.def' })).status, 401);
  const token = await login('meshal');
  const signature = token.split('.')[1];
  const forged = Buffer.from(JSON.stringify({ sub: 'sultana', exp: Date.now() + 1e6 })).toString('base64url');
  assert.equal((await call('GET', '/api/me', { token: `${forged}.${signature}` })).status, 401);
});

test('every account starts empty: no money, no history, only the BarQ Developers group', async () => {
  for (const id of everyone) {
    const token = await login(id);
    const me = (await call('GET', '/api/me', { token })).body;
    assert.deepEqual([me.balance, me.savings, me.cashback, me.hangoutBudget], [0, 0, 0, null], id);
    assert.equal((await call('GET', '/api/me/transactions', { token })).body.total, 0);
    assert.equal((await call('GET', '/api/me/spending?period=month', { token })).body.total, 0);
    const groups = (await call('GET', '/api/me/groups', { token })).body;
    assert.deepEqual(groups.map(g => g.name), ['BarQ Developers']);
    assert.equal(groups[0].members.length, 5);
    assert.deepEqual((await call('GET', '/api/payments', { token })).body, []);
  }
  const token = await login('meshal');
  const insight = (await call('GET', '/api/analyst/insights', { token })).body;
  assert.deepEqual([insight.summary.month, insight.budgets.daily, insight.alerts.length, insight.subscriptions.length], [0, 0, 0, 0]);
  assert.equal((await call('GET', '/api/me/spending?period=decade', { token })).status, 400);
});

test('purchases and top-ups update the stored balance', async () => {
  const token = await login('abdullah-s');
  await fund(token, 100);
  assert.equal(await balanceOf(token), 100);
  const buy = await call('POST', '/api/me/transactions', { token, body: { kind: 'purchase', amount: '30.5', seller: 'ALBAIK', category: 'food' } });
  assert.equal(buy.status, 200);
  assert.equal(buy.body.transaction.amount, -30.5);
  assert.equal(await balanceOf(token), 69.5);
  assert.equal((await call('POST', '/api/me/transactions', { token, body: { kind: 'purchase', amount: 999999, seller: 'x' } })).status, 400);
  assert.equal((await call('POST', '/api/me/transactions', { token, body: { kind: 'purchase', amount: 70, seller: 'x' } })).status, 409);
  assert.equal((await call('POST', '/api/me/transactions', { token, body: { kind: 'topup', amount: 1.234 } })).status, 400);
});

test('transfers move money between two accounts', async () => {
  const a = await login('sultana'); const b = await login('abdullah-m');
  assert.equal((await call('POST', '/api/transfers', { token: a, body: { to: 'abdullah-m', amount: 5 } })).status, 409, 'empty wallet cannot send');
  await fund(a, 200);
  const before = [await balanceOf(a), await balanceOf(b)];
  assert.equal((await call('POST', '/api/transfers', { token: a, body: { to: 'abdullah-m', amount: 50 } })).status, 200);
  assert.equal(await balanceOf(a), round(before[0] - 50));
  assert.equal(await balanceOf(b), round(before[1] + 50));
  assert.equal((await call('POST', '/api/transfers', { token: a, body: { to: 'sultana', amount: 5 } })).status, 400);
  assert.equal((await call('POST', '/api/transfers', { token: a, body: { to: 'ghost', amount: 5 } })).status, 400);
});

test('analyst: budgets are limited to the wallet, Claude writes advice and plans', async () => {
  const token = await login('meshal');
  assert.equal((await call('POST', '/api/analyst/daily', { token, body: { budget: 1 } })).status, 400, 'empty wallet allows no budget');
  await fund(token, 500);
  await call('POST', '/api/me/transactions', { token, body: { kind: 'purchase', amount: 40, seller: 'Starbucks', category: 'cafe' } });
  const insight = (await call('GET', '/api/analyst/insights', { token })).body;
  assert.equal(insight.summary.today, 40);
  assert.deepEqual(insight.byCategory.map(c => c.id), ['cafe']);
  const tips = (await call('GET', '/api/analyst/advice', { token })).body;
  assert.equal(tips.headline, 'Fake advice for Meshal');
  const plan = (await call('POST', '/api/analyst/daily', { token, body: { budget: 150 } })).body;
  assert.ok(plan.items.length > 0);
  assert.equal(round(plan.total + plan.remaining), 150);
  assert.equal(plan.source, 'claude');
  assert.ok(plan.items.every(item => item.place ? item.estimate === item.place.estimatedCost : item.estimate === 25));
  assert.equal((await call('POST', '/api/analyst/daily', { token, body: { budget: 461 } })).status, 400);
});

test('hangout plan uses the smallest budget and never reveals other budgets', async () => {
  const sultana = await login('sultana');
  await call('PUT', '/api/me/budget', { token: sultana, body: { amount: 60 } });
  const token = await login('meshal');
  const { status, body } = await call('POST', '/api/analyst/hangout', { token, body: { groupId: 'barq-developers', budget: 300 } });
  assert.equal(status, 200);
  assert.equal(body.perPersonBudget, 60);
  assert.deepEqual(body.pending, ['Abdullah M', 'Abdullah S', 'Rasel']);
  assert.ok(body.perPersonTotal <= 60 && body.items.length > 0);
  assert.equal(body.groupTotal, round(body.perPersonTotal * 5));
  assert.ok(!JSON.stringify(body).includes('hangoutBudget') && !JSON.stringify(body).includes('balance'));
  assert.equal((await call('GET', '/api/me', { token })).body.hangoutBudget, 300);
  assert.equal((await call('POST', '/api/analyst/hangout', { token, body: { groupId: 'missing', budget: 50 } })).status, 404);
});

test('the analyst retries an unusable answer and rejects invented places', async () => {
  const token = await login('sultana');
  const retried = await call('POST', '/api/analyst/daily', { token, body: { budget: 77 } });
  assert.equal(retried.status, 200);
  assert.ok(retried.body.items.length > 0);
  const invented = await call('POST', '/api/analyst/daily', { token, body: { budget: 88 } });
  assert.equal(invented.status, 502);
  assert.match(invented.body.error, /unknown placeId/);
});

test('answers must be in English: a Chinese reply is rejected and retried', async () => {
  const token = await login('sultana');
  const { status, body } = await call('POST', '/api/analyst/daily', { token, body: { budget: 66 } });
  assert.equal(status, 200);
  assert.equal(body.message, 'Fake plan for SAR 66.');
});

test('without a key the analyst explains how to connect it', async () => {
  const key = process.env.CLAUDE_DEV_KEY; delete process.env.CLAUDE_DEV_KEY;
  try {
    const token = await login('sultana');
    const { status, body } = await call('POST', '/api/analyst/daily', { token, body: { budget: 10 } });
    assert.equal(status, 503);
    assert.match(body.error, /CLAUDE_DEV_KEY/);
    assert.equal((await call('GET', '/api/analyst/insights', { token })).status, 200);
  } finally { process.env.CLAUDE_DEV_KEY = key; }
});

test('when Claude-Dev is slow, the Ring API answers instead', async () => {
  Object.assign(process.env, { RING_API_BASE_URL: RING_URL, RING_CLOUD_KEY: 'test-ring-key' });
  try {
    const token = await login('sultana');
    const health = (await call('GET', '/api/health')).body.ai;
    assert.deepEqual([health.claude, health.fallback.configured, health.fallback.model], [true, true, 'ring-fast']);
    assert.ok(!JSON.stringify(health).includes('test-ring-key'));
    const fast = (await call('POST', '/api/analyst/daily', { token, body: { budget: 100 } })).body;
    assert.equal(fast.source, 'claude');
    const started = Date.now();
    const slow = await call('POST', '/api/analyst/daily', { token, body: { budget: 99 } });
    assert.equal(slow.status, 200);
    assert.equal(slow.body.source, 'ring');
    assert.match(slow.body.fallbackReason, /took too long/);
    assert.ok(slow.body.items.length > 0 && slow.body.total <= 99);
    assert.ok(Date.now() - started < 2900, 'did not wait for the slow Claude-Dev answer');
    const key = process.env.CLAUDE_DEV_KEY; delete process.env.CLAUDE_DEV_KEY;
    try { assert.equal((await call('POST', '/api/analyst/daily', { token, body: { budget: 100 } })).body.source, 'ring', 'Ring API alone works'); }
    finally { process.env.CLAUDE_DEV_KEY = key; }
  } finally { delete process.env.RING_API_BASE_URL; delete process.env.RING_CLOUD_KEY; }
});

test('payments are stored as name, price, category and date and charge the wallet', async () => {
  const token = await login('abdullah-m');
  const place = (await call('GET', '/api/places?category=cafe&limit=1', { token })).body.items[0];
  await fund(token, 300);
  const before = await balanceOf(token);
  const today = new Date(Date.now() + 3 * 3_600_000).toISOString().slice(0, 10);
  const lastWeek = new Date(Date.now() + 3 * 3_600_000 - 7 * 86_400_000).toISOString().slice(0, 10);
  const { status, body } = await call('POST', '/api/payments', { token, body: { placeId: place.record_id, date: lastWeek } });
  assert.equal(status, 200);
  assert.deepEqual([body.payment.name, body.payment.price, body.payment.category, body.payment.date], [place.name, place.estimatedCost, 'Cafe', lastWeek]);
  assert.equal(body.user.balance, round(before - place.estimatedCost));
  const history = (await call('GET', '/api/me/transactions', { token })).body.items;
  assert.ok(history.some(t => t.seller === place.name && t.date.startsWith(lastWeek)), 'back-dated transaction recorded');
  assert.deepEqual(history.map(t => t.date), [...history.map(t => t.date)].sort().reverse(), 'history stays newest first');
  assert.deepEqual((await call('GET', '/api/payments', { token })).body.map(p => p.id), [body.payment.id]);
  for (const date of ['2099-01-01', '2020-01-01', '2026-02-30', 'tomorrow']) assert.equal((await call('POST', '/api/payments', { token, body: { placeId: place.record_id, date } })).status, 400, date);
  assert.equal((await call('POST', '/api/payments', { token, body: { placeId: 'nope', date: today } })).status, 400);
  const broke = await login('abdullah-s');
  assert.equal((await call('POST', '/api/payments', { token: broke, body: { placeId: (await call('GET', '/api/places?category=shopping&limit=1')).body.items[0].record_id, date: today } })).status, 409);
});

test('members can add registered users to a group', async () => {
  update('users', db => { db.groups.push({ id: 'test-crew', name: 'Test crew', members: ['meshal', 'abdullah-m'] }); });
  const outsider = await login('sultana');
  assert.equal((await call('POST', '/api/groups/test-crew/members', { token: outsider, body: { userId: 'sultana' } })).status, 403);
  const host = await login('meshal');
  const added = await call('POST', '/api/groups/test-crew/members', { token: host, body: { userId: 'sultana' } });
  assert.equal(added.status, 200);
  assert.ok(added.body.members.some(m => m.id === 'sultana'));
  assert.equal((await call('POST', '/api/groups/test-crew/members', { token: host, body: { userId: 'sultana' } })).status, 409);
  assert.equal((await call('POST', '/api/groups/test-crew/members', { token: host, body: { userId: 'ghost' } })).status, 400);
  assert.equal((await call('POST', '/api/groups/missing/members', { token: host, body: { userId: 'sultana' } })).status, 404);
  assert.ok((await call('GET', '/api/me/groups', { token: outsider })).body.some(g => g.id === 'test-crew'));
});

test('game session picks the payer by total points and charges the bill', async () => {
  const host = await login('abdullah-m'); const other = await login('meshal');
  assert.deepEqual((await call('GET', '/api/games')).body.map(g => g.name), ['Flappy Bird']);
  const created = await call('POST', '/api/game-sessions', { token: host, body: { players: ['abdullah-m', 'meshal', 'sultana'], billAmount: 120 } });
  assert.equal(created.status, 200);
  const id = created.body.id;
  assert.equal(created.body.rounds.length, 1);
  assert.equal((await call('POST', `/api/game-sessions/${id}/settle`, { token: host })).status, 409);
  assert.equal((await call('POST', `/api/game-sessions/${id}/scores`, { token: other, body: { playerId: 'meshal', points: 5 } })).status, 403);
  for (const [playerId, points] of [['abdullah-m', 7], ['meshal', 12], ['sultana', 3]]) assert.equal((await call('POST', `/api/game-sessions/${id}/scores`, { token: host, body: { playerId, points } })).status, 200);
  const session = (await call('GET', `/api/game-sessions/${id}`, { token: other })).body;
  assert.equal(session.result.payer, 'meshal');
  const before = await balanceOf(other);
  assert.equal((await call('POST', `/api/game-sessions/${id}/settle`, { token: host })).body.status, 'settled');
  assert.equal(await balanceOf(other), round(before - 120));
  assert.equal((await call('POST', `/api/game-sessions/${id}/settle`, { token: host })).status, 409);
  assert.equal((await call('POST', '/api/game-sessions', { token: host, body: { players: ['meshal', 'sultana'] } })).status, 400);
});

// --- Who pays? votes ----------------------------------------------------------------------------------------

async function startHangout(token) {
  const places = (await call('GET', '/api/places?category=cafe&limit=2')).body.items;
  const { status, body } = await call('POST', '/api/hangouts', { token, body: { groupId: 'barq-developers', items: places.map((p, i) => ({ time: `2${i}:00`, label: 'Coffee', placeId: p.record_id })) } });
  assert.equal(status, 200);
  assert.equal(body.billAmount, round(body.perPerson * 5));
  assert.equal(body.perPerson, round(places[0].estimatedCost + places[1].estimatedCost));
  return body;
}
const vote = (token, id, choice) => call('POST', `/api/hangouts/${id}/vote`, { token, body: { choice } });
async function tokens() { const map = {}; for (const id of everyone) map[id] = await login(id); return map; }

test('scenario 1: one "I will pay it" wins over three "split"', async () => {
  const t = await tokens();
  const hangout = await startHangout(t.meshal);
  assert.equal(hangout.status, 'voting');
  for (const [id, choice] of [['abdullah-m', 'split'], ['abdullah-s', 'split'], ['sultana', 'split'], ['rasel', 'own']]) await vote(t[id], hangout.id, choice);
  const open = (await call('GET', '/api/hangouts', { token: t.rasel })).body.find(h => h.id === hangout.id);
  assert.equal(open.status, 'voting');
  assert.equal(open.votes, null, 'choices stay hidden until the vote ends');
  const done = (await vote(t.meshal, hangout.id, 'pay')).body;
  assert.equal(done.status, 'decided');
  assert.equal(done.result.outcome, 'volunteer');
  assert.equal(done.result.label, 'Meshal pays the bill');
  assert.deepEqual(done.result.tally, { split: 3, own: 1, pay: 1 });
  assert.deepEqual(done.dues.map(d => [d.userId, d.amount]), [['meshal', hangout.billAmount]]);
  assert.equal((await call('POST', `/api/hangouts/${hangout.id}/pay`, { token: t.sultana })).status, 403);
  await fund(t.meshal, hangout.billAmount);
  const before = await balanceOf(t.meshal);
  const paid = await call('POST', `/api/hangouts/${hangout.id}/pay`, { token: t.meshal });
  assert.equal(paid.status, 200);
  assert.equal(paid.body.hangout.status, 'settled');
  assert.equal(await balanceOf(t.meshal), round(before - hangout.billAmount));
  assert.ok((await call('GET', '/api/payments', { token: t.meshal })).body.some(p => p.price === hangout.billAmount && p.name.includes('BarQ Developers')));
  assert.equal((await vote(t.meshal, hangout.id, 'split')).status, 409);
});

test('scenario 2: two "I will pay it" play the game and the highest score pays', async () => {
  const t = await tokens();
  const hangout = await startHangout(t['abdullah-m']);
  await fund(t['abdullah-s'], hangout.billAmount);
  for (const [id, choice] of [['abdullah-m', 'split'], ['abdullah-s', 'pay'], ['meshal', 'split'], ['sultana', 'pay'], ['rasel', 'own']]) await vote(t[id], hangout.id, choice);
  const playing = (await call('GET', '/api/hangouts', { token: t.sultana })).body.find(h => h.id === hangout.id);
  assert.equal(playing.status, 'playing');
  assert.equal(playing.result.outcome, 'game');
  assert.deepEqual(playing.result.players.map(p => p.id), ['abdullah-s', 'sultana']);
  assert.equal((await call('POST', `/api/hangouts/${hangout.id}/pay`, { token: t.sultana })).status, 409, 'nobody pays before the game');
  const session = (await call('GET', `/api/game-sessions/${playing.sessionId}`, { token: t.sultana })).body;
  assert.deepEqual(session.players, ['abdullah-s', 'sultana']);
  assert.equal((await call('POST', `/api/game-sessions/${session.id}/scores`, { token: t.meshal, body: { playerId: 'sultana', points: 1 } })).status, 403, 'only players or the host');
  assert.equal((await call('POST', `/api/game-sessions/${session.id}/scores`, { token: t['abdullah-s'], body: { playerId: 'sultana', points: 1 } })).status, 403, 'a player cannot play for someone else');
  assert.equal((await call('POST', `/api/game-sessions/${session.id}/scores`, { token: t.sultana, body: { playerId: 'sultana', points: 4 } })).status, 200);
  assert.equal((await call('POST', `/api/game-sessions/${session.id}/scores`, { token: t['abdullah-s'], body: { playerId: 'abdullah-s', points: 9 } })).status, 200);
  const decided = (await call('GET', '/api/hangouts', { token: t.sultana })).body.find(h => h.id === hangout.id);
  assert.equal(decided.status, 'decided');
  assert.equal(decided.result.label, 'Abdullah S pays the bill');
  assert.deepEqual(decided.dues.map(d => d.userId), ['abdullah-s']);
  assert.equal((await call('POST', `/api/hangouts/${hangout.id}/pay`, { token: t['abdullah-s'] })).body.hangout.status, 'settled');
});

test('scenario 3: a tie between split and own means everyone pays their own', async () => {
  const t = await tokens();
  const hangout = await startHangout(t.sultana);
  for (const [id, choice] of [['abdullah-m', 'split'], ['abdullah-s', 'own'], ['meshal', 'split'], ['sultana', 'own']]) await vote(t[id], hangout.id, choice);
  assert.equal((await call('POST', `/api/hangouts/${hangout.id}/close`, { token: t.meshal })).status, 403, 'only the starter ends the vote');
  const done = (await call('POST', `/api/hangouts/${hangout.id}/close`, { token: t.sultana })).body;
  assert.equal(done.result.outcome, 'own');
  assert.equal(done.result.label, 'Everyone pays their own');
  assert.equal(done.dues.length, 5);
  assert.ok(done.dues.every(d => d.amount === hangout.perPerson));
  assert.equal((await call('POST', `/api/hangouts/${hangout.id}/pay`, { token: t.rasel })).status, 409, 'an empty wallet cannot pay');
});

test('most votes for split splits the bill equally', async () => {
  const t = await tokens();
  const hangout = await startHangout(t.meshal);
  for (const [id, choice] of [['abdullah-m', 'split'], ['abdullah-s', 'own'], ['meshal', 'split'], ['sultana', 'split'], ['rasel', 'own']]) await vote(t[id], hangout.id, choice);
  const done = (await call('GET', '/api/hangouts', { token: t.meshal })).body.find(h => h.id === hangout.id);
  assert.equal(done.result.outcome, 'split');
  assert.ok(done.dues.every(d => d.amount === round(hangout.billAmount / 5)));
});

test('votes are validated', async () => {
  const t = await tokens();
  const hangout = await startHangout(t.meshal);
  assert.equal((await vote(t.meshal, hangout.id, 'maybe')).status, 400);
  assert.equal((await call('POST', `/api/hangouts/${hangout.id}/close`, { token: t.meshal })).status, 409, 'nobody voted yet');
  assert.equal((await vote(t.meshal, 'missing', 'split')).status, 404);
  update('users', db => { db.groups.find(g => g.id === 'barq-developers').members = everyone.filter(id => id !== 'rasel'); });
  try {
    assert.equal((await call('POST', '/api/hangouts', { token: t.rasel, body: { groupId: 'barq-developers', items: hangout.items } })).status, 403);
    assert.equal((await call('POST', '/api/hangouts', { token: t.meshal, body: { groupId: 'barq-developers', items: [] } })).status, 400);
    assert.equal((await call('POST', '/api/hangouts', { token: t.meshal, body: { groupId: 'barq-developers', items: [{ placeId: 'nope' }] } })).status, 400);
  } finally { update('users', db => { db.groups.find(g => g.id === 'barq-developers').members = everyone; }); }
});

test('direct UI routes return the app shell or a build hint, and unknown API routes stay 404', async () => {
  const page = await call('GET', '/rewards/wheel');
  assert.ok([200, 503].includes(page.status));
  assert.equal(typeof page.body, 'string');
  assert.equal((await call('GET', '/api/missing')).status, 404);
  assert.equal((await call('DELETE', '/api/health')).status, 405);
});

test('an older database gains the BarQ Developers group and a Payments file', async () => {
  const { read } = await import('./db.mjs');
  const { buildSeed } = await import('./seed.mjs');
  const { writeFileSync, mkdirSync, existsSync } = await import('node:fs');
  const old = mkdtempSync(path.join(tmpdir(), 'barq-old-'));
  const previous = process.env.BARQ_DB_DIR;
  try {
    const seed = buildSeed();
    seed.users.groups = [];
    delete seed.games.hangouts;
    mkdirSync(old, { recursive: true });
    writeFileSync(path.join(old, 'users.json'), JSON.stringify(seed.users));
    writeFileSync(path.join(old, 'games.json'), JSON.stringify(seed.games));
    process.env.BARQ_DB_DIR = old;
    const groups = read('users').groups;
    assert.equal(groups[0].id, 'barq-developers');
    assert.equal(groups[0].members.length, 5);
    assert.ok(existsSync(path.join(old, 'payments.json')));
  } finally { process.env.BARQ_DB_DIR = previous; rmSync(old, { recursive: true, force: true }); }
});

// Runs last: it locks Rasel's account for 30 seconds.
test('repeated wrong PINs lock the account briefly', async () => {
  for (let i = 0; i < 5; i++) await call('POST', '/api/auth/login', { body: { userId: 'rasel', pin: '9999' } });
  assert.equal((await call('POST', '/api/auth/login', { body: { userId: 'rasel', pin: pinOf('rasel') } })).status, 429);
});
