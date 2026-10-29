import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { CheckCircle2, Trophy } from 'lucide-react';
import { useWallet } from '../../app/WalletProvider';
import { api, ApiError, errorMessage } from '../../lib/api';
import { DetailHeader, ErrorState, Money } from '../../components/ui/Primitives';
import { joinNames, num, t, tn } from '../../i18n';
import type { Game, GameSession, Hangout } from '../../types/api';

const gameUrl = (engine: string) => `${import.meta.env.BASE_URL}games/points-games.html?embed&play=${encodeURIComponent(engine)}&report`;
const progressOf = (session: GameSession, playerId: string) => session.rounds.filter(round => playerId in round.scores).length;
const totalOf = (session: GameSession, playerId: string) => session.rounds.reduce<number | null>((sum, round) => playerId in round.scores ? (sum ?? 0) + round.scores[playerId] : sum, null);

/**
 * "I will pay it" volunteers play three games: Flappy Bird first, then two at random. Each volunteer plays their games in
 * order on their own phone, without waiting for the others (the host may also hand one phone around); points add up and
 * the highest total pays the bill. The board refreshes while others play.
 */
export function HangoutGame() {
  const { id } = useParams(); const { user } = useWallet();
  const [hangout, setHangout] = useState<Hangout | null>(null);
  const [session, setSession] = useState<GameSession | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [playingFor, setPlayingFor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const player = useRef<string | null>(null);
  player.current = playingFor;

  const refreshSession = useCallback(async (sessionId: string) => setSession(await api<GameSession>(`/api/game-sessions/${sessionId}`)), []);
  const load = useCallback(async () => {
    setError('');
    try {
      const [list, gameList] = await Promise.all([api<Hangout[]>('/api/hangouts'), api<Game[]>('/api/games')]);
      const found = list.find(h => h.id === id);
      if (!found) throw new Error(t('This hangout was not found.'));
      if (!found.sessionId) throw new Error(t('This hangout has no game.'));
      setGames(gameList); setHangout(found);
      await refreshSession(found.sessionId);
    } catch (e) { setError(e instanceof ApiError || !(e instanceof Error) ? errorMessage(e) : e.message); }
  }, [id, refreshSession]);
  useEffect(() => { void load(); }, [load]);

  // While others are playing on their phones, keep the board up to date.
  const waiting = !!session && session.status === 'playing' && !playingFor;
  useEffect(() => {
    if (!waiting || !session) return;
    const timer = setInterval(() => { refreshSession(session.id).catch(() => {}); }, 3000);
    return () => clearInterval(timer);
  }, [waiting, session, refreshSession]);

  const gameOf = (gameId: string) => games.find(g => g.id === gameId);
  const gameName = (gameId: string) => { const game = gameOf(gameId); return game ? t(game.name) : gameId; };
  /** The game a player plays next, with its place in the order (0, 1 or 2), or null when they have played them all. */
  const nextGame = (playerId: string) => {
    if (!session || session.status !== 'playing') return null;
    const index = progressOf(session, playerId);
    const round = session.rounds[index];
    return round ? { index, gameId: round.gameId, game: gameOf(round.gameId) } : null;
  };
  const nameOf = (uid: string) => hangout?.result?.players?.find(p => p.id === uid)?.name ?? hangout?.members.find(m => m.id === uid)?.name ?? uid;

  useEffect(() => {
    if (!session) return;
    const onMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'points-games:close') { setPlayingFor(null); return; }
      const playerId = player.current;
      if (event.data?.type !== 'points-games:score' || !playerId) return;
      const next = nextGame(playerId);
      // Only a score from the game this player is on counts.
      if (!next || event.data.game !== next.game?.engine) return;
      const points = Math.max(0, Math.round(Number(event.data.score) || 0));
      setSaving(true); setNote('');
      try { setSession(await api<GameSession>(`/api/game-sessions/${session.id}/scores`, { method: 'POST', body: { playerId, points, gameId: next.gameId } })); }
      catch (e) {
        // This game was already played (for example on another phone): show the latest board instead of failing.
        if (e instanceof ApiError && e.status === 409) { setNote(t('{name} has already played this game.', { name: nameOf(playerId) })); await refreshSession(session.id).catch(() => {}); }
        else setNote(errorMessage(e));
      } finally { setSaving(false); setPlayingFor(null); }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  });

  const isHost = session?.createdBy === user.id;
  const mine = session?.players.includes(user.id) ? nextGame(user.id) : null;
  const stillPlaying = session?.status === 'playing' ? session.players.filter(p => progressOf(session, p) < session.rounds.length) : [];
  const others = isHost ? stillPlaying.filter(p => p !== user.id) : [];
  const current = playingFor ? nextGame(playingFor) : null;

  return <><DetailHeader title={t('Who pays?')} fallback="/hangouts" /><div className="detail-content hangout-game">
    {error ? <ErrorState message={error} onRetry={() => void load()} /> : !hangout || !session ? <p className="muted center" role="status">{t('Loading the game…')}</p> : <>
      <p className="muted center">{tn('{players} · the highest total pays {amount}', { players: joinNames(session.players.map(nameOf), t(' vs ')), amount: <Money amount={session.billAmount} /> })}</p>
      <ol className="game-order" aria-label={t('The games')}>{session.rounds.map((round, i) => <li key={round.gameId}><span>{num(i + 1)}</span>{gameName(round.gameId)}</li>)}</ol>
      <ul className="score-board" aria-label={t('Scores')}>{session.players.map(p => { const total = totalOf(session, p); const done = progressOf(session, p); return <li key={p} className={session.result?.payer === p ? 'payer' : ''}>
        <span><bdi>{p === user.id ? t('{name} (you)', { name: nameOf(p) }) : nameOf(p)}</bdi><small>{done === session.rounds.length ? t('Played every game') : t('{done} of {total} games played', { done, total: session.rounds.length })}</small></span>
        <strong>{total == null ? t('Not played') : t('{points} points', { points: total })}</strong>
      </li>; })}</ul>
      {note && <p className="muted center" role="status">{note}</p>}
      {session.status !== 'playing' && session.result ? <div className="success-panel" role="status"><Trophy /><h2>{t('{name} pays the bill', { name: nameOf(session.result.payer) })}</h2><p>{t('Highest total: {points} points.', { points: session.result.totals[session.result.payer] })}{session.result.tied.length ? ` ${t('It was a tie, so the best single game decided it.')}` : ''}</p><Link className="primary-button" to="/hangouts">{t('Back to Hangouts')}</Link></div>
        : playingFor && current?.game ? <>
          <p className="hangout-question center">{t('Game {n} of {total}: {game}', { n: current.index + 1, total: session.rounds.length, game: gameName(current.gameId) })}</p>
          <p className="muted center">{playingFor === user.id ? t('Your turn…') : t('{name} is playing…', { name: nameOf(playingFor) })}</p>
          {saving && <p className="muted center" role="status">{t('Saving the score…')}</p>}
          <iframe key={`${playingFor}-${current.index}`} className="hangout-frame" title={gameName(current.gameId)} src={gameUrl(current.game.engine)} />
        </> : <>
          {mine && <div className="info-panel center"><h3>{mine.index === 0 ? t('Your turn') : t('Your next game')}</h3><p className="game-next">{t('Game {n} of {total}: {game}', { n: mine.index + 1, total: session.rounds.length, game: gameName(mine.gameId) })}</p>{mine.game && <p>{t(mine.game.description)}</p>}<p>{t('When the game ends, your points are saved automatically.')}</p><button type="button" className="primary-button" onClick={() => setPlayingFor(user.id)} disabled={!mine.game}>{t('Play {game}', { game: gameName(mine.gameId) })}</button></div>}
          {!mine && session.players.includes(user.id) && <p className="success-text center" role="status"><CheckCircle2 size={14} /> {t('You have played all {total} games.', { total: session.rounds.length })}</p>}
          {others.length > 0 && <div className="info-panel center"><h3>{t('Playing on one phone?')}</h3><p>{t('As the host you can hand this phone to a player.')}</p>{others.map(p => { const next = nextGame(p); return next && <button key={p} type="button" className="secondary-button" onClick={() => setPlayingFor(p)} disabled={!next.game}>{t('Play for {name}: {game}', { name: nameOf(p), game: gameName(next.gameId) })}</button>; })}</div>}
          {stillPlaying.some(p => p !== user.id) && !others.length && <p className="muted center" role="status">{t('Waiting for {names} to play…', { names: joinNames(stillPlaying.filter(p => p !== user.id).map(nameOf), t(' and ')) })}</p>}
        </>}
    </>}
  </div></>;
}
