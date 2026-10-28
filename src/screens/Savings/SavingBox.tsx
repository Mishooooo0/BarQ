import { useCallback, useEffect, useState } from 'react';
import { PiggyBank } from 'lucide-react';
import { useWallet } from '../../app/WalletProvider';
import { useSession } from '../../app/SessionProvider';
import { api, errorMessage } from '../../lib/api';
import { relativeDay } from '../../lib/format';
import { DetailHeader, ErrorState, MockNote, Money } from '../../components/ui/Primitives';
import { AnalystSprite } from '../Analyst/AnalystSprite';
import { formatDay } from '../Occasions/occasionParts';
import type { Pose, Savings, User } from '../../types/api';

const sar = (value: number) => `SAR ${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

/** The Saving box: move money out of the wallet toward one goal for the end of the year. */
export function SavingBox() {
  const { state: wallet, refresh } = useWallet(); const { setUser } = useSession();
  const [box, setBox] = useState<Savings | null>(null);
  const [error, setError] = useState('');
  const [goalDraft, setGoalDraft] = useState('');
  const [amountDraft, setAmountDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setError('');
    try { const data = await api<Savings>('/api/savings'); setBox(data); setGoalDraft(data.target ? String(data.target) : ''); }
    catch (e) { setError(errorMessage(e)); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const saveGoal = async (target: number | null) => {
    setBusy(true); setNote(null);
    try {
      const data = await api<Savings>('/api/savings/goal', { method: 'PUT', body: { target } });
      setBox(data); setGoalDraft(data.target ? String(data.target) : '');
      setNote({ ok: true, text: target == null ? 'Goal removed.' : `Goal set: ${sar(target)} by ${formatDay(data.deadline)}.` });
    } catch (e) { setNote({ ok: false, text: errorMessage(e) }); }
    finally { setBusy(false); }
  };
  const move = async (direction: 'deposit' | 'withdraw') => {
    const amount = Number(amountDraft);
    setBusy(true); setNote(null);
    try {
      const result = await api<{ savings: Savings; user: User }>(`/api/savings/${direction}`, { method: 'POST', body: { amount } });
      setBox(result.savings); setUser(result.user); setAmountDraft('');
      setNote({ ok: true, text: direction === 'deposit' ? `${sar(amount)} added to your Saving box.` : `${sar(amount)} moved back to your wallet.` });
      void refresh();
    } catch (e) { setNote({ ok: false, text: errorMessage(e) }); }
    finally { setBusy(false); }
  };

  const amount = Number(amountDraft);
  const validAmount = amountDraft.trim() !== '' && Number.isFinite(amount) && amount > 0;
  const goal = Number(goalDraft);
  const validGoal = goalDraft.trim() !== '' && Number.isFinite(goal) && goal > 0;
  const year = box?.deadline.slice(0, 4);

  let pose: Pose = 'coin'; let speech = 'Set a goal and I\'ll tell you how much to put in each week until the end of the year.';
  if (box?.reached) { pose = 'celebrate'; speech = `You reached your goal of ${sar(box.target!)}! Anything more is a bonus.`; }
  else if (box?.target) { pose = 'growth'; speech = `Put in ${sar(box.perWeek)} a week (about ${sar(box.perDay)} a day) to reach ${sar(box.target)} by ${formatDay(box.deadline)}. ${box.daysLeft} days left.`; }

  return <><DetailHeader title="Saving box" fallback="/" /><div className="detail-content analyst-content">
    <section className="analyst-hero" aria-live="polite"><AnalystSprite pose={pose} /><p className="analyst-bubble">{speech}</p></section>
    {error ? <ErrorState message={error} onRetry={() => void load()} /> : !box ? <p className="muted center" role="status">Loading your Saving box…</p> : <>
      <section className="saving-card" aria-label="Saving box">
        <span className="saving-label"><PiggyBank size={16} /> In your box</span>
        <Money amount={box.saved} className="saving-amount" />
        {box.target ? <>
          <div className="progress" role="progressbar" aria-label="Progress to your goal" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(box.progress * 100)}><span style={{ width: `${box.progress * 100}%` }} /></div>
          <p className="saving-goal-line"><span>{Math.round(box.progress * 100)}% of <Money amount={box.target} /></span><span>{box.reached ? 'Goal reached' : `${sar(box.remaining ?? 0)} to go`}</span></p>
        </> : <p className="fine-print">No goal yet. Choose how much you want saved by 31 December.</p>}
      </section>

      <section className="analyst-section"><h3>Move money</h3>
        <label className="field-label">Amount (wallet: {sar(wallet.balance)})<input aria-label="Amount to move" inputMode="decimal" type="number" min="1" step="1" value={amountDraft} onChange={e => setAmountDraft(e.target.value)} placeholder="Amount in SAR" /></label>
        <div className="button-pair">
          <button type="button" className="primary-button" onClick={() => void move('deposit')} disabled={busy || !validAmount}>Add to the box</button>
          <button type="button" className="secondary-button" onClick={() => void move('withdraw')} disabled={busy || !validAmount || box.saved <= 0}>Take out</button>
        </div>
        {note && <p className={note.ok ? 'success-text' : 'error-text'} role={note.ok ? 'status' : 'alert'}>{note.text}</p>}
      </section>

      <section className="analyst-section"><h3>Goal for the end of {year}</h3>
        <label className="field-label">Amount to have saved by {formatDay(box.deadline)}<input aria-label="Saving goal" inputMode="decimal" type="number" min="1" step="1" value={goalDraft} onChange={e => setGoalDraft(e.target.value)} placeholder="For example 5000" /></label>
        <button type="button" className="primary-button" onClick={() => void saveGoal(goal)} disabled={busy || !validGoal || goal === box.target}>{box.target ? 'Update goal' : 'Set goal'}</button>
        {box.target != null && <button type="button" className="text-button" onClick={() => void saveGoal(null)} disabled={busy}>Remove goal</button>}
      </section>

      <section className="analyst-section"><h3>Box history</h3>
        {!box.history.length ? <p className="muted">Nothing saved yet.</p> : <ul className="saving-history">{box.history.map(t => <li key={t.id}><span>{t.amount < 0 ? 'Added to the box' : 'Back to the wallet'}<small>{relativeDay(t.date)}</small></span><span className={t.amount < 0 ? 'positive-text' : ''}>{t.amount < 0 ? '+' : '−'}<Money amount={Math.abs(t.amount)} /></span></li>)}</ul>}
      </section>
    </>}
    <MockNote />
  </div></>;
}
