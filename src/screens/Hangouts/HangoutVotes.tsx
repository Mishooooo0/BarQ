import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { CheckCircle2, Gamepad2, Users } from 'lucide-react';
import { useWallet } from '../../app/WalletProvider';
import { useSession } from '../../app/SessionProvider';
import { api, errorMessage } from '../../lib/api';
import { ErrorState, Money } from '../../components/ui/Primitives';
import type { Hangout, User, VoteChoice } from '../../types/api';
import { digits, formatDate, joinNames, t, tn } from '../../i18n';
import { choiceLabel, hangoutResultText } from '../../i18n/data';

const choices: VoteChoice[] = ['split', 'own', 'pay'];
const statusText = { voting: () => t('Voting'), playing: () => t('Game to decide'), decided: () => t('Decided'), settled: () => t('Paid'), canceled: () => t('Canceled') } as const;

/** The time left to vote, counting down every second; when it reaches zero the list refreshes and the server cancels the vote. */
function VoteTimer({ secondsLeft, onEnd }: { secondsLeft: number; onEnd: () => void }) {
  // Re-synced whenever the server sends a new secondsLeft (every list refresh).
  const deadline = useMemo(() => Date.now() + secondsLeft * 1000, [secondsLeft]);
  const remaining = () => Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  const [left, setLeft] = useState(remaining);
  useEffect(() => {
    let ended = false;
    const tick = () => { const s = remaining(); setLeft(s); if (s === 0 && !ended) { ended = true; onEnd(); } };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [deadline]); // onEnd is the list refresh; a new deadline restarts the countdown
  const clock = digits(`${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`);
  return <p className={`vote-timer ${left <= 30 ? 'soon' : ''}`} role="timer">{left > 0 ? t('{time} left to vote', { time: clock }) : t("Time's up…")}</p>;
}
const ended = (value: string) => formatDate(value, { timeZone: 'Asia/Riyadh', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });

/** The group's hangouts with their "who pays?" votes. Each member votes; the server applies the rules. */
export function HangoutVotes({ hangouts, error, onRetry, onChange, onPaid, empty }: { hangouts: Hangout[] | null; error: string; onRetry: () => void; onChange: () => void; onPaid?: (amount: number) => void; empty: string }) {
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (!hangouts) return <p className="muted" role="status">{t('Loading hangouts…')}</p>;
  if (!hangouts.length) return <p className="muted">{empty}</p>;
  return <div className="hangout-list">{hangouts.map(h => <HangoutCard key={h.id} hangout={h} onChange={onChange} onPaid={onPaid} />)}</div>;
}

function HangoutCard({ hangout, onChange, onPaid }: { hangout: Hangout; onChange: () => void; onPaid?: (amount: number) => void }) {
  const { user, refresh } = useWallet(); const { setUser } = useSession();
  const [busy, setBusy] = useState(''); const [error, setError] = useState('');
  const act = async (key: string, request: () => Promise<unknown>) => {
    setBusy(key); setError('');
    try { await request(); onChange(); }
    catch (e) { setError(errorMessage(e)); }
    finally { setBusy(''); }
  };
  const vote = (choice: VoteChoice) => act(choice, () => api(`/api/hangouts/${hangout.id}/vote`, { method: 'POST', body: { choice } }));
  const close = () => act('close', () => api(`/api/hangouts/${hangout.id}/close`, { method: 'POST' }));
  const pay = () => act('pay', async () => { const due = myDue?.amount ?? 0; const result = await api<{ user: User }>(`/api/hangouts/${hangout.id}/pay`, { method: 'POST' }); setUser(result.user); onPaid?.(due); void refresh(); });
  const myDue = hangout.dues.find(d => d.userId === user.id);
  const isPlayer = hangout.result?.players?.some(p => p.id === user.id);

  return <article className="hangout-card" aria-label={t('Hangout by {name}', { name: hangout.createdByName })}>
    <header><strong><Users size={14} /> <bdi>{hangout.groupName}</bdi></strong><span className={`hangout-status ${hangout.status}`}>{statusText[hangout.status]()}</span></header>
    {hangout.endedAt && <p className="hangout-date">{t('Ended {date}', { date: ended(hangout.endedAt) })}</p>}
    <p className="hangout-plan">{hangout.items.map((i, n) => <span key={i.placeId}>{n > 0 && ' · '}{digits(i.time)} <bdi>{i.name}</bdi></span>)}</p>
    <div className="hangout-money"><span>{t('Per person')} <Money amount={hangout.perPerson} /></span><span>{t('Bill')} <Money amount={hangout.billAmount} /></span></div>

    {hangout.status === 'canceled' ? <p className="hangout-result" role="status">{t('The 2 minutes to vote ran out, so this hangout was canceled.')}</p> : hangout.status === 'voting' ? <>
      {hangout.secondsLeft != null && <VoteTimer secondsLeft={hangout.secondsLeft} onEnd={onChange} />}
      <p className="hangout-question">{t("Who's paying?")} <small>{t('{voted} of {total} voted', { voted: hangout.voteCount, total: hangout.members.length })}</small></p>
      <div className="vote-options" role="group" aria-label={t('Your vote')}>{choices.map(c => <button key={c} type="button" aria-pressed={hangout.myVote === c} disabled={!!busy} onClick={() => vote(c)}>{choiceLabel(c)}</button>)}</div>
      <ul className="vote-members">{hangout.members.map(m => <li key={m.id} className={m.voted ? 'voted' : ''}>{m.id === user.id ? t('You') : m.name}{m.voted && <CheckCircle2 size={12} />}</li>)}</ul>
      {hangout.createdBy === user.id && hangout.voteCount > 0 && hangout.voteCount < hangout.members.length && <button type="button" className="text-button" onClick={close} disabled={!!busy}>{busy === 'close' ? t('Ending…') : t('End the vote now')}</button>}
    </> : hangout.result && <>
      <p className="hangout-result" role="status">{hangoutResultText(hangout.result)}</p>
      <p className="fine-print">{t('Votes: split {split} · own {own} · I will pay {pay}', { split: hangout.result.tally.split, own: hangout.result.tally.own, pay: hangout.result.tally.pay })}</p>
      {hangout.status === 'playing' && hangout.sessionId && (isPlayer || hangout.createdBy === user.id) && <Link className="primary-button" to={`/hangouts/${hangout.id}/play`}><Gamepad2 size={16} /> {t('Play the games')}</Link>}
      {hangout.status === 'playing' && !isPlayer && hangout.createdBy !== user.id && <p className="muted">{t('Waiting for {names} to play.', { names: joinNames((hangout.result.players ?? []).map(p => p.name), t(' and ')) })}</p>}
      {hangout.dues.length > 0 && <ul className="dues-list">{hangout.dues.map(d => <li key={d.userId}><span>{d.userId === user.id ? t('You') : d.name}</span><Money amount={d.amount} /><small>{d.paid ? t('Paid') : t('To pay')}</small></li>)}</ul>}
      {hangout.status === 'decided' && myDue && !myDue.paid && <button type="button" className="primary-button" onClick={pay} disabled={!!busy || myDue.amount > user.balance}>{busy === 'pay' ? t('Paying…') : tn('Pay {amount}', { amount: <Money amount={myDue.amount} /> })}</button>}
      {hangout.status === 'decided' && myDue && !myDue.paid && myDue.amount > user.balance && <p className="error-text">{t('Not enough balance. Add money from Home.')}</p>}
    </>}
    {error && <p className="error-text" role="alert">{error}</p>}
  </article>;
}
