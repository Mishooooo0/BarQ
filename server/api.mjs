// JSON API for the three databases. Used by the production server (server/index.mjs) and mounted inside the
// Vite dev server (vite.config.ts), so the UI and API always run together on one origin.
import { clearFailures, issueToken, lockedFor, readToken, recordFailure, verifyPin } from './auth.mjs';
import { advice, dailyPlan, hangoutPlan, insights, spendingSummary } from './analyst.mjs';
import { aiStatus, askJson } from './claude.mjs';
import { read, update } from './db.mjs';
import { createSession, GameError, recordScore } from './games.mjs';
import { CHOICES, CHOICE_LABELS, decide, dues } from './hangouts.mjs';
import { categories, categorySummary, findCategory, places } from './places.mjs';
import { addDays, dayKey } from './time.mjs';

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new HttpError(status, message); };
const MAX_BODY = 64 * 1024;

export function sendJson(res, status, body) {
  if (res.headersSent) { res.end(); return; }
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', chunk => { size += chunk.length; if (size > MAX_BODY) { reject(new HttpError(413, 'Request body is too large.')); req.destroy(); } else chunks.push(chunk); });
    req.on('end', () => {
      const text = Buffer.concat(chunks).toString('utf8');
      if (!text.trim()) return resolve({});
      let value;
      try { value = JSON.parse(text); } catch { return reject(new HttpError(400, 'Request body is not valid JSON.')); }
      if (!value || typeof value !== 'object' || Array.isArray(value)) return reject(new HttpError(400, 'Send a JSON object.'));
      resolve(value);
    });
    req.on('error', reject);
  });
}

// --- Validation ------------------------------------------------------------------------------------------------

function amount(value, { max = 10000, allowZero = false, field = 'amount' } = {}) {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  const min = allowZero ? 0 : 0.01;
  if (typeof n !== 'number' || !Number.isFinite(n) || n < min || n > max || Math.abs(n * 100 - Math.round(n * 100)) > 1e-6) fail(400, `Enter a ${field} from SAR ${min} to SAR ${max.toLocaleString('en-US')}, with up to two decimals.`);
  return Math.round(n * 100) / 100;
}
function text(value, field, max = 60) {
  if (typeof value !== 'string' || !value.trim()) fail(400, `${field} is required.`);
  if (value.trim().length > max) fail(400, `${field} must be ${max} characters or fewer.`);
  return value.trim();
}
const cents = value => Math.round(value * 100) / 100;

// --- Shapes ----------------------------------------------------------------------------------------------------

const publicUser = user => ({ id: user.id, name: user.name, balance: user.balance, savings: user.savings, cashback: user.cashback, hangoutBudget: user.hangoutBudget });
const directoryEntry = user => ({ id: user.id, name: user.name });
function nextTransactionId(user) {
  const numbers = user.transactions.map(t => Number(t.id.split('-').at(-1))).filter(Number.isFinite);
  return `${user.id}-${String((numbers.length ? Math.max(...numbers) : 0) + 1).padStart(4, '0')}`;
}
/** Records a transaction (newest first, so a back-dated one is inserted in date order) and updates the balance. */
function addTransaction(user, { seller, category = null, amount: value, kind, note = null }, at) {
  const transaction = { id: nextTransactionId(user), date: at.toISOString(), seller, category, amount: cents(value), kind, ...(note ? { note } : {}) };
  const index = user.transactions.findIndex(t => t.date <= transaction.date);
  user.transactions.splice(index < 0 ? user.transactions.length : index, 0, transaction);
  user.balance = cents(user.balance + value);
  return transaction;
}

// --- Auth ------------------------------------------------------------------------------------------------------

function currentUserId(req) {
  const header = req.headers?.authorization ?? '';
  const id = header.startsWith('Bearer ') ? readToken(header.slice(7)) : null;
  if (!id) fail(401, 'Please sign in again.');
  return id;
}
function findUser(db, id, status = 404) {
  const user = db.users.find(u => u.id === id);
  if (!user) fail(status, status === 401 ? 'Please sign in again.' : 'User not found.');
  return user;
}
const me = (db, req) => findUser(db, currentUserId(req), 401);

// --- Routes ----------------------------------------------------------------------------------------------------

const routes = [];
const route = (method, pattern, handler) => routes.push({ method, pattern: new RegExp(`^${pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`), handler });

route('GET', '/api/health', () => ({ status: 'ok', places: places.length, categories: categories.length, users: read('users').users.length, games: read('games').games.length, payments: read('payments').payments.length, ai: aiStatus() }));

// Places and Categories database
route('GET', '/api/categories', () => categorySummary());
route('GET', '/api/places', ({ url }) => {
  const categoryParam = url.searchParams.get('category');
  const category = categoryParam ? findCategory(categoryParam) ?? fail(400, `Unknown category "${categoryParam}".`) : null;
  const query = (url.searchParams.get('q') || '').trim().toLocaleLowerCase();
  const maxCost = Number(url.searchParams.get('maxCost'));
  const hasMax = url.searchParams.has('maxCost') && Number.isFinite(maxCost);
  const limit = Math.min(250, Math.max(1, Number(url.searchParams.get('limit')) || 20));
  const offset = Math.max(0, Number(url.searchParams.get('offset')) || 0);
  const found = places.filter(p => (!category || p.categoryId === category.id) && (!hasMax || p.estimatedCost <= maxCost) && (!query || `${p.name} ${p.address} ${p.district || ''}`.toLocaleLowerCase().includes(query)));
  return { total: found.length, limit, offset, items: found.slice(offset, offset + limit) };
});
route('GET', '/api/places/:id', ({ params }) => places.find(p => p.record_id === params.id) ?? fail(404, 'Place not found.'));

// Users database: the directory is open (no PINs or balances), everything under /api/me needs a session.
route('GET', '/api/users', () => read('users').users.map(directoryEntry));
route('POST', '/api/auth/login', async ({ req }) => {
  const body = await readBody(req);
  const db = read('users');
  const key = typeof body.userId === 'string' ? body.userId : typeof body.name === 'string' ? body.name.trim().toLowerCase() : '';
  const user = db.users.find(u => u.id === key || u.name.toLowerCase() === key);
  if (!user) fail(401, 'Name or PIN is incorrect.');
  const wait = lockedFor(user.id);
  if (wait) fail(429, `Too many attempts. Try again in ${wait} seconds.`);
  if (!verifyPin(body.pin, user)) { recordFailure(user.id); fail(401, 'Name or PIN is incorrect.'); }
  clearFailures(user.id);
  return { token: issueToken(user.id), user: publicUser(user) };
});
route('GET', '/api/me', ({ req }) => publicUser(me(read('users'), req)));
route('GET', '/api/me/transactions', ({ req, url }) => {
  const user = me(read('users'), req);
  const category = url.searchParams.get('category');
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit')) || 500));
  const items = user.transactions.filter(t => !category || t.category === category);
  return { total: items.length, items: items.slice(0, limit) };
});
route('GET', '/api/me/spending', ({ req, url }) => {
  const period = url.searchParams.get('period') || 'month';
  if (!['day', 'week', 'month', 'year'].includes(period)) fail(400, 'Period must be day, week, month or year.');
  return spendingSummary(me(read('users'), req), period);
});
route('POST', '/api/me/transactions', async ({ req }) => {
  const body = await readBody(req); const id = currentUserId(req); const now = new Date();
  const kind = body.kind;
  if (!['topup', 'purchase', 'cashback'].includes(kind)) fail(400, 'Kind must be topup, purchase or cashback.');
  const value = amount(body.amount, { max: kind === 'cashback' ? 50 : 10000 });
  const seller = text(body.seller ?? (kind === 'topup' ? 'Wallet top-up' : ''), 'Merchant');
  const category = body.category == null ? null : findCategory(body.category)?.id ?? fail(400, 'Unknown category.');
  return update('users', db => {
    const user = findUser(db, id, 401);
    if (kind === 'purchase' && value > user.balance) fail(409, 'Not enough balance.');
    const transaction = addTransaction(user, { seller, category: kind === 'purchase' ? category : null, amount: kind === 'purchase' ? -value : value, kind }, now);
    if (kind === 'cashback') user.cashback = cents(user.cashback + value);
    return { user: publicUser(user), transaction };
  });
});
route('PUT', '/api/me/budget', async ({ req }) => {
  const body = await readBody(req); const id = currentUserId(req);
  return update('users', db => {
    const user = findUser(db, id, 401);
    user.hangoutBudget = body.amount == null ? null : amount(body.amount, { max: Math.max(0, user.balance), allowZero: true, field: 'budget' });
    return publicUser(user);
  });
});
route('GET', '/api/me/groups', ({ req }) => {
  const db = read('users'); const user = me(db, req);
  return db.groups.filter(g => g.members.includes(user.id)).map(g => ({ id: g.id, name: g.name, members: g.members.map(mid => db.users.find(u => u.id === mid)).filter(Boolean).map(u => ({ ...directoryEntry(u), ready: u.id === user.id || u.hangoutBudget != null })) }));
});
route('POST', '/api/transfers', async ({ req }) => {
  const body = await readBody(req); const id = currentUserId(req); const now = new Date();
  const value = amount(body.amount);
  const channel = { wallet: 'barq wallet', local: 'local bank', international: 'international' }[body.channel ?? 'wallet'] ?? fail(400, 'Unknown transfer type.');
  return update('users', db => {
    const sender = findUser(db, id, 401);
    const recipient = typeof body.to === 'string' ? db.users.find(u => u.id === body.to) : null;
    if (!recipient) fail(400, 'Choose who to send money to.');
    if (recipient.id === sender.id) fail(400, "You can't send money to yourself.");
    if (value > sender.balance) fail(409, 'Not enough balance.');
    const transaction = addTransaction(sender, { seller: `Transfer to ${recipient.name}`, amount: -value, kind: 'transfer', note: channel }, now);
    addTransaction(recipient, { seller: `Transfer from ${sender.name}`, amount: value, kind: 'transfer', note: channel }, now);
    return { user: publicUser(sender), transaction };
  });
});

// AI Analyst
// AI Analyst: facts are computed here, the advice and plans come from Claude (server/claude.mjs).
route('GET', '/api/analyst/insights', ({ req }) => insights(me(read('users'), req)));
route('GET', '/api/analyst/advice', ({ req }) => advice(me(read('users'), req), askJson));
route('POST', '/api/analyst/daily', async ({ req }) => {
  const body = await readBody(req); const user = me(read('users'), req);
  return dailyPlan(user, amount(body.budget, { max: Math.max(0, user.balance), allowZero: true, field: 'budget' }), askJson);
});
route('POST', '/api/analyst/hangout', async ({ req }) => {
  const body = await readBody(req); const id = currentUserId(req);
  // Save the budget first (friends' plans use it), then plan from the saved data.
  const budget = update('users', db => {
    const user = findUser(db, id, 401);
    const value = amount(body.budget, { max: Math.max(0, user.balance), allowZero: true, field: 'budget' });
    if (!db.groups.some(g => g.id === body.groupId && g.members.includes(user.id))) fail(404, 'Group not found.');
    user.hangoutBudget = value;
    return value;
  });
  const db = read('users'); const user = findUser(db, id, 401); const group = db.groups.find(g => g.id === body.groupId);
  return hangoutPlan(user, group, group.members.map(mid => db.users.find(u => u.id === mid)).filter(Boolean), budget, askJson);
});
route('POST', '/api/groups/:id/members', async ({ req, params }) => {
  const body = await readBody(req); const id = currentUserId(req);
  return update('users', db => {
    findUser(db, id, 401);
    const group = db.groups.find(g => g.id === params.id) ?? fail(404, 'Group not found.');
    if (!group.members.includes(id)) fail(403, 'Only members can add people to this group.');
    const newcomer = typeof body.userId === 'string' ? db.users.find(u => u.id === body.userId) : null;
    if (!newcomer) fail(400, 'Choose a registered user to add.');
    if (group.members.includes(newcomer.id)) fail(409, `${newcomer.name} is already in ${group.name}.`);
    group.members.push(newcomer.id);
    return { id: group.id, name: group.name, members: group.members.map(mid => db.users.find(u => u.id === mid)).filter(Boolean).map(u => ({ ...directoryEntry(u), ready: u.id === id || u.hangoutBudget != null })) };
  });
});

// Hangouts: after planning, the group votes on who pays (server/hangouts.mjs has the rules).
function publicHangout(h, users, me) {
  const name = uid => users.find(u => u.id === uid)?.name ?? uid;
  const owed = dues(h).map(d => ({ ...d, name: name(d.userId), paid: !!h.paid?.[d.userId] }));
  return {
    id: h.id, groupId: h.groupId, groupName: h.groupName, createdBy: h.createdBy, createdByName: name(h.createdBy), createdAt: h.createdAt,
    items: h.items, perPerson: h.perPerson, billAmount: h.billAmount, status: h.status, sessionId: h.sessionId ?? null,
    members: h.members.map(uid => ({ id: uid, name: name(uid), voted: uid in h.votes })), votes: h.status === 'voting' ? null : Object.fromEntries(Object.entries(h.votes).map(([uid, c]) => [uid, c])),
    myVote: h.votes[me] ?? null, voteCount: Object.keys(h.votes).length,
    result: h.result ? { ...h.result, label: h.result.outcome === 'volunteer' || (h.result.outcome === 'game' && h.result.payer) ? `${name(h.result.payer)} pays the bill` : h.result.outcome === 'game' ? `${h.result.players.map(name).join(' vs ')}: the highest score pays` : CHOICE_LABELS[h.result.outcome], players: h.result.players?.map(uid => ({ id: uid, name: name(uid) })) ?? null, payerName: h.result.payer ? name(h.result.payer) : null } : null,
    dues: owed,
  };
}
function closeVote(games, hangout, now) {
  hangout.result = decide(hangout);
  if (hangout.result.outcome === 'game') {
    const session = createSession(games, { createdBy: hangout.createdBy, players: hangout.result.players, billAmount: hangout.billAmount, now });
    session.hangoutId = hangout.id;
    hangout.sessionId = session.id; hangout.status = 'playing';
  } else hangout.status = 'decided';
  hangout.closedAt = now.toISOString();
}
const groupFor = (users, groupId, me) => {
  const group = users.groups.find(g => g.id === groupId) ?? fail(404, 'Group not found.');
  if (!group.members.includes(me)) fail(403, 'You are not in this group.');
  return group;
};
route('GET', '/api/hangouts', ({ req, url }) => {
  const id = currentUserId(req); const users = read('users');
  const mine = users.groups.filter(g => g.members.includes(id)).map(g => g.id);
  const groupId = url.searchParams.get('groupId');
  return (read('games').hangouts ?? []).filter(h => mine.includes(h.groupId) && (!groupId || h.groupId === groupId)).slice(0, 20).map(h => publicHangout(h, users.users, id));
});
route('POST', '/api/hangouts', async ({ req }) => {
  const body = await readBody(req); const id = currentUserId(req); const now = new Date();
  const users = read('users'); findUser(users, id, 401);
  const group = groupFor(users, body.groupId, id);
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 6) fail(400, 'Plan the hangout first, then start the vote.');
  const seen = new Set();
  const items = body.items.map(item => {
    const place = places.find(p => p.record_id === item?.placeId);
    if (!place || seen.has(place.record_id)) fail(400, 'The plan has a place that is not in the Places database.');
    seen.add(place.record_id);
    const time = typeof item.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(item.time) ? item.time : '20:00';
    return { time, label: text(item.label ?? place.name, 'Label', 60), placeId: place.record_id, name: place.name, category: place.categoryId, estimate: place.estimatedCost };
  });
  const perPerson = cents(items.reduce((total, item) => total + item.estimate, 0));
  return update('games', db => {
    db.hangouts ??= [];
    const hangout = { id: `hangout-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, groupId: group.id, groupName: group.name, createdBy: id, createdAt: now.toISOString(), items, perPerson, billAmount: cents(perPerson * group.members.length), members: [...group.members], votes: {}, status: 'voting', result: null, sessionId: null, paid: {} };
    db.hangouts.unshift(hangout);
    db.hangouts.length = Math.min(db.hangouts.length, 50);
    return publicHangout(hangout, users.users, id);
  });
});
route('POST', '/api/hangouts/:id/vote', async ({ req, params }) => {
  const body = await readBody(req); const id = currentUserId(req); const now = new Date(); const users = read('users');
  if (!CHOICES.includes(body.choice)) fail(400, 'Choose split, own or pay.');
  return update('games', db => {
    const hangout = (db.hangouts ?? []).find(h => h.id === params.id) ?? fail(404, 'Hangout not found.');
    if (!hangout.members.includes(id)) fail(403, 'You are not in this group.');
    if (hangout.status !== 'voting') fail(409, 'The vote has ended.');
    hangout.votes[id] = body.choice;
    if (hangout.members.every(uid => uid in hangout.votes)) closeVote(db, hangout, now);
    return publicHangout(hangout, users.users, id);
  });
});
route('POST', '/api/hangouts/:id/close', ({ req, params }) => {
  const id = currentUserId(req); const now = new Date(); const users = read('users');
  return update('games', db => {
    const hangout = (db.hangouts ?? []).find(h => h.id === params.id) ?? fail(404, 'Hangout not found.');
    if (hangout.createdBy !== id) fail(403, 'Only the person who started the vote can end it.');
    if (hangout.status !== 'voting') fail(409, 'The vote has already ended.');
    if (!Object.keys(hangout.votes).length) fail(409, 'Nobody has voted yet.');
    closeVote(db, hangout, now);
    return publicHangout(hangout, users.users, id);
  });
});
route('POST', '/api/hangouts/:id/pay', ({ req, params }) => {
  const id = currentUserId(req); const now = new Date();
  const hangout = (read('games').hangouts ?? []).find(h => h.id === params.id) ?? fail(404, 'Hangout not found.');
  if (hangout.status !== 'decided') fail(409, hangout.status === 'settled' ? 'This bill is already paid.' : 'Who pays is not decided yet.');
  const due = dues(hangout).find(d => d.userId === id) ?? fail(403, "You don't owe anything for this hangout.");
  if (hangout.paid?.[id]) fail(409, 'You have already paid your part.');
  const label = hangout.result.outcome === 'split' ? 'split bill' : hangout.result.outcome === 'own' ? 'my share' : 'bill';
  const seller = `${hangout.groupName} hangout (${label})`;
  const result = update('users', db => {
    const user = findUser(db, id, 401);
    if (due.amount > user.balance) fail(409, 'Not enough balance.');
    return { user: publicUser(user), transaction: addTransaction(user, { seller, category: 'food', amount: -due.amount, kind: 'purchase' }, now) };
  });
  const payment = update('payments', db => {
    const numbers = db.payments.map(p => Number(p.id.split('-').at(-1))).filter(Number.isFinite);
    const record = { id: `pay-${String((numbers.length ? Math.max(...numbers) : 0) + 1).padStart(5, '0')}`, userId: id, name: seller, price: due.amount, category: 'Food', categoryId: 'food', date: dayKey(now), placeId: null, hangoutId: hangout.id, transactionId: result.transaction.id, createdAt: now.toISOString() };
    db.payments.push(record);
    return record;
  });
  const users = read('users').users;
  const updated = update('games', db => {
    const stored = db.hangouts.find(h => h.id === params.id);
    stored.paid = { ...stored.paid, [id]: payment.id };
    if (dues(stored).every(d => stored.paid[d.userId])) stored.status = 'settled';
    return publicHangout(stored, users, id);
  });
  return { hangout: updated, user: result.user, payment: publicPayment(payment) };
});

// Payments database: purchases at places from the Places and Categories database, stored as name, price, category, date.
const publicPayment = p => ({ id: p.id, name: p.name, price: p.price, category: p.category, categoryId: p.categoryId, date: p.date, placeId: p.placeId, createdAt: p.createdAt });
route('GET', '/api/payments', ({ req }) => {
  const id = currentUserId(req);
  return read('payments').payments.filter(p => p.userId === id).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).map(publicPayment);
});
route('POST', '/api/payments', async ({ req }) => {
  const body = await readBody(req); const id = currentUserId(req); const now = new Date();
  const place = typeof body.placeId === 'string' ? places.find(p => p.record_id === body.placeId) : null;
  if (!place || !place.categoryId) fail(400, 'Choose a place from the list.');
  const today = dayKey(now); const earliest = addDays(today, -365);
  const date = typeof body.date === 'string' ? body.date.trim() : today;
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(date) ? Date.parse(`${date}T00:00:00Z`) : NaN;
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== date) fail(400, 'Enter a real date as YYYY-MM-DD.');
  if (date > today) fail(400, "The payment date can't be in the future.");
  if (date < earliest) fail(400, 'The payment date must be within the last year.');
  const category = categories.find(c => c.id === place.categoryId);
  const at = date === today ? now : new Date(`${date}T12:00:00+03:00`);
  const result = update('users', db => {
    const user = findUser(db, id, 401);
    if (place.estimatedCost > user.balance) fail(409, 'Not enough balance.');
    const transaction = addTransaction(user, { seller: place.name, category: place.categoryId, amount: -place.estimatedCost, kind: 'purchase' }, at);
    return { user: publicUser(user), transaction };
  });
  const payment = update('payments', db => {
    const numbers = db.payments.map(p => Number(p.id.split('-').at(-1))).filter(Number.isFinite);
    const record = { id: `pay-${String((numbers.length ? Math.max(...numbers) : 0) + 1).padStart(5, '0')}`, userId: id, name: place.name, price: place.estimatedCost, category: category.name, categoryId: category.id, date, placeId: place.record_id, transactionId: result.transaction.id, createdAt: now.toISOString() };
    db.payments.push(record);
    return record;
  });
  return { payment: publicPayment(payment), user: result.user };
});

// Games database
route('GET', '/api/games', () => read('games').games);
route('POST', '/api/game-sessions', async ({ req }) => {
  const body = await readBody(req); const id = currentUserId(req);
  const directory = read('users').users;
  if (!directory.some(u => u.id === id)) fail(401, 'Please sign in again.');
  const players = Array.isArray(body.players) ? [...new Set(body.players)] : [];
  if (players.length < 2 || players.length > 5) fail(400, 'Choose 2 to 5 players.');
  if (!players.every(p => directory.some(u => u.id === p))) fail(400, 'Every player must be a registered user.');
  if (!players.includes(id)) fail(400, 'You must be one of the players.');
  const billAmount = body.billAmount == null ? 0 : amount(body.billAmount, { allowZero: true, field: 'bill' });
  return update('games', db => createSession(db, { createdBy: id, players, billAmount }));
});
route('GET', '/api/game-sessions/:id', ({ req, params }) => {
  const id = currentUserId(req);
  const session = read('games').sessions.find(s => s.id === params.id) ?? fail(404, 'Session not found.');
  if (!session.players.includes(id) && session.createdBy !== id) fail(403, 'You are not in this session.');
  return session;
});
route('POST', '/api/game-sessions/:id/scores', async ({ req, params }) => {
  const body = await readBody(req); const id = currentUserId(req);
  if (!Number.isInteger(body.points) || body.points < 0 || body.points > 100000) fail(400, 'Points must be a whole number from 0 to 100,000.');
  return update('games', db => {
    const session = db.sessions.find(s => s.id === params.id) ?? fail(404, 'Session not found.');
    if (session.createdBy !== id && !(session.hangoutId && session.players.includes(id))) fail(403, 'Only the host can enter scores.');
    recordScore(session, { playerId: body.playerId, points: body.points });
    // A hangout's game decides who pays the bill.
    const hangout = session.hangoutId ? (db.hangouts ?? []).find(h => h.id === session.hangoutId) : null;
    if (hangout && session.status === 'finished') { hangout.result = { ...hangout.result, payer: session.result.payer }; hangout.status = 'decided'; }
    return session;
  });
});
route('POST', '/api/game-sessions/:id/settle', ({ req, params }) => {
  const id = currentUserId(req); const now = new Date();
  const session = read('games').sessions.find(s => s.id === params.id) ?? fail(404, 'Session not found.');
  if (session.createdBy !== id) fail(403, 'Only the host can settle the bill.');
  if (session.status !== 'finished') fail(409, session.status === 'settled' ? 'This bill is already paid.' : 'Finish all games first.');
  if (!(session.billAmount > 0)) fail(409, 'This session has no bill to pay.');
  const payment = update('users', db => {
    const payer = findUser(db, session.result.payer);
    if (session.billAmount > payer.balance) fail(409, `${payer.name} doesn't have enough balance for this bill.`);
    return addTransaction(payer, { seller: 'Group bill (games)', category: 'food', amount: -session.billAmount, kind: 'purchase' }, now);
  });
  return update('games', db => { const stored = db.sessions.find(s => s.id === params.id); stored.status = 'settled'; stored.paymentId = payment.id; return stored; });
});

/** Handles /api/* requests. Never throws: every failure becomes a JSON error response. */
export async function handleApi(req, res) {
  try {
    const url = new URL(req.url, 'http://localhost');
    const matches = routes.map(r => ({ r, m: url.pathname.match(r.pattern) })).filter(x => x.m);
    if (!matches.length) return sendJson(res, 404, { error: 'Not found.' });
    const match = matches.find(x => x.r.method === req.method || (req.method === 'HEAD' && x.r.method === 'GET'));
    if (!match) return sendJson(res, 405, { error: 'Method not allowed.' });
    let params;
    try { params = Object.fromEntries(Object.entries(match.m.groups ?? {}).map(([k, v]) => [k, decodeURIComponent(v)])); }
    catch { throw new HttpError(400, 'Invalid URL.'); }
    const body = await match.r.handler({ req, url, params });
    sendJson(res, 200, body);
  } catch (error) {
    const status = error instanceof HttpError || error instanceof GameError || error.status ? error.status : 500;
    if (status === 500) console.error('[barq api]', error);
    sendJson(res, status, { error: status === 500 && !error.status ? 'Something went wrong on the server.' : error.message });
  }
}
