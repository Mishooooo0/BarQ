import { useCallback, useEffect, useState } from 'react';
import { PiggyBank } from 'lucide-react';
import { useWallet } from '../../app/WalletProvider';
import { useSession } from '../../app/SessionProvider';
import { api, errorMessage } from '../../lib/api';
import { relativeDay } from '../../lib/format';
import { DetailHeader, ErrorState, MockNote, Money } from '../../components/ui/Primitives';
import { AnalystSprite } from '../Analyst/AnalystSprite';
import { NumberField } from '../../components/NumberField';
import { formatDay } from '../Occasions/occasionParts';
import type { Pose, Savings, User } from '../../types/api';
import { digits, latinDigits, percent, sar, t, tn, tp } from '../../i18n';


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
      setNote({ ok: true, text: target == null ? t('Goal removed.') : t('Goal set: {amount} by {date}.', { amount: sar(target), date: formatDay(data.deadline) }) });
    } catch (e) { setNote({ ok: false, text: errorMessage(e) }); }
    finally { setBusy(false); }
  };
  const move = async (direction: 'deposit' | 'withdraw') => {
    const amount = Number(latinDigits(amountDraft));
    setBusy(true); setNote(null);
    try {
      const result = await api<{ savings: Savings; user: User }>(`/api/savings/${direction}`, { method: 'POST', body: { amount } });
      setBox(result.savings); setUser(result.user); setAmountDraft('');
      setNote({ ok: true, text: direction === 'deposit' ? t('{amount} added to your Saving box.', { amount: sar(amount) }) : t('{amount} moved back to your wallet.', { amount: sar(amount) }) });
      void refresh();
    } catch (e) { setNote({ ok: false, text: errorMessage(e) }); }
    finally { setBusy(false); }
  };

  const amount = Number(latinDigits(amountDraft));
  const validAmount = amountDraft.trim() !== '' && Number.isFinite(amount) && amount > 0;
  const goal = Number(latinDigits(goalDraft));
  const validGoal = goalDraft.trim() !== '' && Number.isFinite(goal) && goal > 0;
  const year = digits(box?.deadline.slice(0, 4) ?? '');

  let pose: Pose = 'coin'; let speech = t("Set a goal and I'll tell you how much to put in each week until the end of the year.");
  if (box?.reached) { pose = 'celebrate'; speech = t('You reached your goal of {amount}! Anything more is a bonus.', { amount: sar(box.target!) }); }
  else if (box?.target) { pose = 'growth'; speech = `${t('Put in {week} a week (about {day} a day) to reach {goal} by {date}.', { week: sar(box.perWeek), day: sar(box.perDay), goal: sar(box.target), date: formatDay(box.deadline) })} ${tp(box.daysLeft, '{n} day left.', '{n} days left.')}`; }

  return <><DetailHeader title={t('Saving box')} fallback="/" /><div className="detail-content analyst-content">
    <section className="analyst-hero" aria-live="polite"><AnalystSprite pose={pose} /><p className="analyst-bubble">{speech}</p></section>
    {error ? <ErrorState message={error} onRetry={() => void load()} /> : !box ? <p className="muted center" role="status">{t('Loading your Saving box…')}</p> : <>
      <section className="saving-card" aria-label={t('Saving box')}>
        <span className="saving-label"><PiggyBank size={16} /> {t('In your box')}</span>
        <Money amount={box.saved} className="saving-amount" />
        {box.target ? <>
          <div className="progress" role="progressbar" aria-label={t('Progress to your goal')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(box.progress * 100)}><span style={{ width: `${box.progress * 100}%` }} /></div>
          <p className="saving-goal-line"><span>{tn('{percent} of {goal}', { percent: percent(Math.floor(box.progress * 100) / 100), goal: <Money amount={box.target} /> })}</span><span>{box.reached ? t('Goal reached') : t('{amount} to go', { amount: sar(box.remaining ?? 0) })}</span></p>
        </> : <p className="fine-print">{t('No goal yet. Choose how much you want saved by 31 December.')}</p>}
      </section>

      <section className="analyst-section"><h3>{t('Move money')}</h3>
        <label className="field-label">{t('Amount (wallet: {amount})', { amount: sar(wallet.balance) })}<NumberField aria-label={t('Amount to move')} value={amountDraft} onChange={setAmountDraft} placeholder={t('Amount in SAR')} /></label>
        <div className="button-pair">
          <button type="button" className="primary-button" onClick={() => void move('deposit')} disabled={busy || !validAmount}>{t('Add to the box')}</button>
          <button type="button" className="secondary-button" onClick={() => void move('withdraw')} disabled={busy || !validAmount || box.saved <= 0}>{t('Take out')}</button>
        </div>
        {note && <p className={note.ok ? 'success-text' : 'error-text'} role={note.ok ? 'status' : 'alert'}>{note.text}</p>}
      </section>

      <section className="analyst-section"><h3>{t('Goal for the end of {year}', { year })}</h3>
        <label className="field-label">{t('Amount to have saved by {date}', { date: formatDay(box.deadline) })}<NumberField aria-label={t('Saving goal')} value={goalDraft} onChange={setGoalDraft} placeholder={t('For example 5000')} /></label>
        <button type="button" className="primary-button" onClick={() => void saveGoal(goal)} disabled={busy || !validGoal || goal === box.target}>{box.target ? t('Update goal') : t('Set goal')}</button>
        {box.target != null && <button type="button" className="text-button" onClick={() => void saveGoal(null)} disabled={busy}>{t('Remove goal')}</button>}
      </section>

      <section className="analyst-section"><h3>{t('Box history')}</h3>
        {!box.history.length ? <p className="muted">{t('Nothing saved yet.')}</p> : <ul className="saving-history">{box.history.map(tx => <li key={tx.id}><span>{tx.amount < 0 ? t('Added to the box') : t('Back to the wallet')}<small>{relativeDay(tx.date)}</small></span><span className={`saving-amount-change ${tx.amount < 0 ? 'positive-text' : ''}`}>{tx.amount < 0 ? '+' : '−'}<Money amount={Math.abs(tx.amount)} /></span></li>)}</ul>}
      </section>
    </>}
    <MockNote />
  </div></>;
}
