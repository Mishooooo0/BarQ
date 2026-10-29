// "Who pays the bill" game sessions: three games, Flappy Bird first and then two of the other active games at random.
// Each player plays the games in that order (on their own phone, without waiting for the others); points add up and the
// player with the most points pays. Ties go to the best single round, then to the earlier player in the list.
import { randomInt, randomUUID } from 'node:crypto';

const MAX_SESSIONS = 50;
export const FIRST_GAME = 'flappy-bird';
export const GAMES_PER_SESSION = 3;
export class GameError extends Error { constructor(status, message) { super(message); this.status = status; } }

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) { const j = randomInt(i + 1); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy;
}

export function createSession(db, { createdBy, players, billAmount = 0, now = new Date() }) {
  const active = db.games.filter(game => game.status === 'active');
  if (!active.length) throw new GameError(409, 'No games are available yet.');
  const first = active.find(game => game.id === FIRST_GAME);
  const others = shuffle(active.filter(game => game !== first));
  const games = first ? [first, ...others.slice(0, GAMES_PER_SESSION - 1)] : others.slice(0, GAMES_PER_SESSION);
  const session = {
    id: randomUUID(), createdBy, players, billAmount, status: 'playing', createdAt: now.toISOString(),
    rounds: games.map(game => ({ gameId: game.id, scores: {} })), currentRound: 0, result: null,
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

/** How many of the session's games the player has finished (they play them in order). */
export const progressOf = (session, playerId) => session.rounds.filter(round => playerId in round.scores).length;

/**
 * Saves a player's points for their next game. With `gameId`, the score must be for that game, so a score from a game
 * that was already played (for example on a second phone) is refused instead of landing on the wrong game.
 */
export function recordScore(session, { playerId, points, gameId = null }) {
  if (session.status !== 'playing') throw new GameError(409, 'This session has finished.');
  if (!session.players.includes(playerId)) throw new GameError(400, 'That player is not in this session.');
  const round = session.rounds[progressOf(session, playerId)];
  if (!round) throw new GameError(409, 'This player has played every game.');
  if (gameId != null && round.gameId !== gameId) throw new GameError(409, 'This player has already played this game.');
  round.scores[playerId] = points;
  // currentRound is the first game that not everyone has played yet.
  session.currentRound = Math.min(...session.players.map(id => progressOf(session, id)));
  if (session.currentRound === session.rounds.length) { session.status = 'finished'; session.result = result(session); }
  return session;
}
