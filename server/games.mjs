// "Who pays the bill" game sessions. Every active game is played once in a random order; points add up and the
// player with the most points pays. Ties go to the best single round, then to the earlier player in the list.
import { randomInt, randomUUID } from 'node:crypto';

const MAX_SESSIONS = 50;
export class GameError extends Error { constructor(status, message) { super(message); this.status = status; } }

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) { const j = randomInt(i + 1); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy;
}

export function createSession(db, { createdBy, players, billAmount = 0, now = new Date() }) {
  const active = db.games.filter(game => game.status === 'active');
  if (!active.length) throw new GameError(409, 'No games are available yet.');
  const session = {
    id: randomUUID(), createdBy, players, billAmount, status: 'playing', createdAt: now.toISOString(),
    rounds: shuffle(active).slice(0, 3).map(game => ({ gameId: game.id, scores: {} })), currentRound: 0, result: null,
  };
  db.sessions.unshift(session);
  db.sessions.length = Math.min(db.sessions.length, MAX_SESSIONS);
  return session;
}

function result(session) {
  const totals = Object.fromEntries(session.players.map(id => [id, session.rounds.reduce((sum, round) => sum + (round.scores[id] ?? 0), 0)]));
  const best = Object.fromEntries(session.players.map(id => [id, Math.max(...session.rounds.map(round => round.scores[id] ?? 0))]));
  const top = Math.max(...Object.values(totals));
  const tied = session.players.filter(id => totals[id] === top);
  const payer = [...tied].sort((a, b) => best[b] - best[a] || session.players.indexOf(a) - session.players.indexOf(b))[0];
  return { totals, payer, tied: tied.length > 1 ? tied : [] };
}

export function recordScore(session, { playerId, points }) {
  if (session.status !== 'playing') throw new GameError(409, 'This session has finished.');
  if (!session.players.includes(playerId)) throw new GameError(400, 'That player is not in this session.');
  const round = session.rounds[session.currentRound];
  if (playerId in round.scores) throw new GameError(409, 'This player already has a score for the current game.');
  round.scores[playerId] = points;
  if (session.players.every(id => id in round.scores)) {
    session.currentRound += 1;
    if (session.currentRound === session.rounds.length) { session.status = 'finished'; session.result = result(session); }
  }
  return session;
}
