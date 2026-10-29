import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Trophy } from 'lucide-react';
import { useWallet } from '../../app/WalletProvider';
import { api, ApiError, errorMessage } from '../../lib/api';
import { DetailHeader, ErrorState, Money } from '../../components/ui/Primitives';
import type { GameSession, Hangout } from '../../types/api';
import { num, t, tn } from '../../i18n';

const gameUrl = `${import.meta.env.BASE_URL}games/points-games.html?embed&play=fly&report`;

/**
 * "I will pay it" volunteers play Flappy Bird; the highest score pays the bill. Each volunteer plays their own turn
 * on their own phone (the host may also run turns for others on one phone). The board refreshes while others play.
 */
export function HangoutGame() {
  const { id } = useParams(); const { user } = useWallet();
  const [hangout, setHangout] = useState<Hangout | null>(null);
  const [session, setSession] = useState<GameSession | null>(null);
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
      const found = (await api<Hangout[]>('/api/hangouts')).find(h => h.id === id);
      if (!found) throw new Error(t('This hangout was not found.'));
      if (!found.sessionId) throw new Error(t('This hangout has no game.'));
      setHangout(found);
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

  useEffect(() => {
    if (!session) return;
    const onMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'points-games:close') { setPlayingFor(null); return; }
      const playerId = player.current;
      if (event.data?.type !== 'points-games:score' || !playerId) return;
      const points = Math.max(0, Math.round(Number(event.data.score) || 0));
      setSaving(true); setNote('');
      try { setSession(await api<GameSession>(`/api/game-sessions/${session.id}/scores`, { method: 'POST', body: { playerId, points } })); }
      catch (e) {
        // Someone already played this turn (for example on another phone): show the latest board instead of failing.
        if (e instanceof ApiError && e.status === 409) { setNote(t('{name} has already played.', { name: nameOf(playerId) })); await refreshSession(session.id).catch(() => {}); }
        else setNote(errorMessage(e));
      } finally { setSaving(false); setPlayingFor(null); }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  });

  const nameOf = (uid: string) => hangout?.result?.players?.find(p => p.id === uid)?.name ?? hangout?.members.find(m => m.id === uid)?.name ?? uid;
  const round = session && session.status === 'playing' ? session.rounds[session.currentRound] : null;
  const unplayed = round ? session!.players.filter(p => !(p in round.scores)) : [];
  const isHost = session?.createdBy === user.id;
  const mine = unplayed.includes(user.id);
  const others = isHost ? unplayed.filter(p => p !== user.id) : [];

  return <><DetailHeader title={t('Who pays?')} fallback="/hangouts" /><div className="detail-content hangout-game">
    {error ? <ErrorState message={error} onRetry={() => void load()} /> : !hangout || !session ? <p className="muted center" role="status">{t('Loading the game…')}</p> : <>
      <p className="muted center">{tn('{players} · the highest score pays {amount}', { players: session.players.map(nameOf).join(t(' vs ')), amount: <Money amount={session.billAmount} /> })}</p>
      <ul className="score-board" aria-label={t('Scores')}>{session.players.map(p => { const score = session.rounds.reduce<number | null>((sum, r) => p in r.scores ? (sum ?? 0) + r.scores[p] : sum, null); return <li key={p} className={session.result?.payer === p ? 'payer' : ''}><span>{p === user.id ? t('{name} (you)', { name: nameOf(p) }) : nameOf(p)}</span><strong>{score == null ? t('Not played') : num(score)}</strong></li>; })}</ul>
      {note && <p className="muted center" role="status">{note}</p>}
      {session.status !== 'playing' && session.result ? <div className="success-panel" role="status"><Trophy /><h2>{t('{name} pays the bill', { name: nameOf(session.result.payer) })}</h2><p>{t('Highest score: {points} points.', { points: session.result.totals[session.result.payer] })}{session.result.tied.length ? ` ${t('It was a tie, so the best single round decided it.')}` : ''}</p><Link className="primary-button" to="/hangouts">{t('Back to Hangouts')}</Link></div>
        : playingFor ? <>
          <p className="hangout-question center">{playingFor === user.id ? t('Your turn…') : t('{name} is playing…', { name: nameOf(playingFor) })}</p>
          {saving && <p className="muted center" role="status">{t('Saving the score…')}</p>}
          <iframe key={playingFor} className="hangout-frame" title={t('Flappy Bird')} src={gameUrl} />
        </> : <>
          {mine && <div className="info-panel center"><h3>{t('Your turn')}</h3><p>{t('Fly through the gaps. When the flight ends, your score is saved automatically.')}</p><button type="button" className="primary-button" onClick={() => setPlayingFor(user.id)}>{t('Play Flappy Bird')}</button></div>}
          {others.length > 0 && <div className="info-panel center"><h3>{t('Playing on one phone?')}</h3><p>{t('As the host you can hand this phone to a player.')}</p>{others.map(p => <button key={p} type="button" className="secondary-button" onClick={() => setPlayingFor(p)}>{t('Play for {name}', { name: nameOf(p) })}</button>)}</div>}
          {!mine && !others.length && <p className="muted center" role="status">{t('Waiting for {names} to play…', { names: unplayed.map(nameOf).join(t(' and ')) })}</p>}
        </>}
    </>}
  </div></>;
}
