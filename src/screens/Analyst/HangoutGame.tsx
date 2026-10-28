import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Trophy } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { DetailHeader, ErrorState, Money } from '../../components/ui/Primitives';
import type { GameSession, Hangout } from '../../types/api';

const gameUrl = `${import.meta.env.BASE_URL}games/points-games.html?embed&play=fly&report`;

/** Volunteers who all said "I will pay it" take turns on one phone; the highest score pays the bill. */
export function HangoutGame() {
  const { id } = useParams();
  const [hangout, setHangout] = useState<Hangout | null>(null);
  const [session, setSession] = useState<GameSession | null>(null);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(false);
  const [saving, setSaving] = useState(false);
  const turn = useRef<string | null>(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const list = await api<Hangout[]>('/api/hangouts');
      const found = list.find(h => h.id === id);
      if (!found) throw new Error('This hangout was not found.');
      setHangout(found);
      if (found.sessionId) setSession(await api<GameSession>(`/api/game-sessions/${found.sessionId}`));
    } catch (e) { setError(e instanceof Error ? e.message : errorMessage(e)); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  const round = session && session.status === 'playing' ? session.rounds[session.currentRound] : null;
  const next = round ? session!.players.find(p => !(p in round.scores)) ?? null : null;
  turn.current = next;
  const name = (uid: string) => hangout?.result?.players?.find(p => p.id === uid)?.name ?? hangout?.members.find(m => m.id === uid)?.name ?? uid;

  useEffect(() => {
    const onMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin || !session) return;
      if (event.data?.type === 'points-games:close') { setPlaying(false); return; }
      if (event.data?.type !== 'points-games:score' || !turn.current) return;
      const points = Math.max(0, Math.round(Number(event.data.score) || 0));
      setSaving(true);
      try { setSession(await api<GameSession>(`/api/game-sessions/${session.id}/scores`, { method: 'POST', body: { playerId: turn.current, points } })); setPlaying(false); }
      catch (e) { setError(errorMessage(e)); }
      finally { setSaving(false); }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [session]);

  return <><DetailHeader title="Who pays?" fallback="/analyst" /><div className="detail-content hangout-game">
    {error ? <ErrorState message={error} onRetry={() => void load()} /> : !hangout || !session ? <p className="muted center" role="status">Loading the game…</p> : <>
      <p className="muted center">{session.players.map(name).join(' vs ')} · the highest score pays <Money amount={session.billAmount} /></p>
      <ul className="score-board">{session.players.map(p => { const score = session.rounds.reduce<number | null>((sum, r) => p in r.scores ? (sum ?? 0) + r.scores[p] : sum, null); return <li key={p} className={session.result?.payer === p ? 'payer' : ''}><span>{name(p)}</span><strong>{score ?? '–'}</strong></li>; })}</ul>
      {session.status !== 'playing' && session.result ? <div className="success-panel" role="status"><Trophy /><h2>{name(session.result.payer)} pays the bill</h2><p>Highest score: {session.result.totals[session.result.payer]} points.{session.result.tied.length ? ' It was a tie, so the best single round decided it.' : ''}</p><Link className="primary-button" to="/analyst">Back to the hangout</Link></div>
        : next && (playing ? <>
          <p className="hangout-question center">{name(next)} is playing…</p>
          {saving && <p className="muted center" role="status">Saving the score…</p>}
          <iframe key={next} className="hangout-frame" title="Flappy Bird" src={gameUrl} />
        </> : <div className="info-panel center"><h3>{name(next)}'s turn</h3><p>Pass the phone to {name(next)}. When the flight ends, the score is saved automatically.</p><button type="button" className="primary-button" onClick={() => setPlaying(true)}>Start Flappy Bird</button></div>)}
    </>}
  </div></>;
}
