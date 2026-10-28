import { useState } from 'react';
import { Link } from 'react-router';
import { CheckCircle2, Gamepad2, Users } from 'lucide-react';
import { useWallet } from '../../app/WalletProvider';
import { useSession } from '../../app/SessionProvider';
import { api, errorMessage } from '../../lib/api';
import { ErrorState, Money } from '../../components/ui/Primitives';
import type { Hangout, User, VoteChoice } from '../../types/api';

export const choices: { id: VoteChoice; label: string }[] = [{ id: 'split', label: 'Split the bill' }, { id: 'own', label: 'Everyone pays their own' }, { id: 'pay', label: 'I will pay it' }];
const statusText = { voting: 'Voting', playing: 'Game to decide', decided: 'Decided', settled: 'Paid' } as const;
const endedFormat = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Riyadh', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });

/** The group's hangouts with their "who pays?" votes. Each member votes; the server applies the rules. */
export function HangoutVotes({ hangouts, error, onRetry, onChange, onPaid, empty }: { hangouts: Hangout[] | null; error: string; onRetry: () => void; onChange: () => void; onPaid?: (amount: number) => void; empty: string }) {
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (!hangouts) return <p className="muted" role="status">Loading hangouts…</p>;
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

  return <article className="hangout-card" aria-label={`Hangout by ${hangout.createdByName}`}>
    <header><strong><Users size={14} /> {hangout.groupName}</strong><span className={`hangout-status ${hangout.status}`}>{statusText[hangout.status]}</span></header>
    {hangout.endedAt && <p className="hangout-date">Ended {endedFormat.format(new Date(hangout.endedAt))}</p>}
    <p className="hangout-plan">{hangout.items.map(i => `${i.time} ${i.name}`).join(' · ')}</p>
    <div className="hangout-money"><span>Per person <Money amount={hangout.perPerson} /></span><span>Bill <Money amount={hangout.billAmount} /></span></div>

    {hangout.status === 'voting' ? <>
      <p className="hangout-question">Who's paying? <small>{hangout.voteCount} of {hangout.members.length} voted</small></p>
      <div className="vote-options" role="group" aria-label="Your vote">{choices.map(c => <button key={c.id} type="button" aria-pressed={hangout.myVote === c.id} disabled={!!busy} onClick={() => vote(c.id)}>{c.label}</button>)}</div>
      <ul className="vote-members">{hangout.members.map(m => <li key={m.id} className={m.voted ? 'voted' : ''}>{m.id === user.id ? 'You' : m.name}{m.voted && <CheckCircle2 size={12} />}</li>)}</ul>
      {hangout.createdBy === user.id && hangout.voteCount > 0 && hangout.voteCount < hangout.members.length && <button type="button" className="text-button" onClick={close} disabled={!!busy}>{busy === 'close' ? 'Ending…' : 'End the vote now'}</button>}
    </> : hangout.result && <>
      <p className="hangout-result" role="status">{hangout.result.label}</p>
      <p className="fine-print">Votes: split {hangout.result.tally.split} · own {hangout.result.tally.own} · I will pay {hangout.result.tally.pay}</p>
      {hangout.status === 'playing' && hangout.sessionId && (isPlayer || hangout.createdBy === user.id) && <Link className="primary-button" to={`/hangouts/${hangout.id}/play`}><Gamepad2 size={16} /> Play the game</Link>}
      {hangout.status === 'playing' && !isPlayer && hangout.createdBy !== user.id && <p className="muted">Waiting for {hangout.result.players?.map(p => p.name).join(' and ')} to play.</p>}
      {hangout.dues.length > 0 && <ul className="dues-list">{hangout.dues.map(d => <li key={d.userId}><span>{d.userId === user.id ? 'You' : d.name}</span><Money amount={d.amount} /><small>{d.paid ? 'Paid' : 'To pay'}</small></li>)}</ul>}
      {hangout.status === 'decided' && myDue && !myDue.paid && <button type="button" className="primary-button" onClick={pay} disabled={!!busy || myDue.amount > user.balance}>{busy === 'pay' ? 'Paying…' : <>Pay <Money amount={myDue.amount} /></>}</button>}
      {hangout.status === 'decided' && myDue && !myDue.paid && myDue.amount > user.balance && <p className="error-text">Not enough balance. Add money from Home.</p>}
    </>}
    {error && <p className="error-text" role="alert">{error}</p>}
  </article>;
}
