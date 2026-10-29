import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Plus, Trash2 } from 'lucide-react';
import { useWallet } from '../../app/WalletProvider';
import { AI_TIMEOUT_MS, api, ApiError, errorMessage } from '../../lib/api';
import { DetailHeader, ErrorState, MockNote, Money } from '../../components/ui/Primitives';
import { AnalystSprite } from '../Analyst/AnalystSprite';
import { AnsweredBy, useRequest } from '../Analyst/parts';
import { AmountInput, countdown, formatDay, todayKey } from './occasionParts';
import { NumberField } from '../../components/NumberField';
import type { EidiaEntry, Occasion, OccasionLine, OccasionPlan, SavingPlan } from '../../types/api';
import { digits, latinDigits, sar, t, tn, tp } from '../../i18n';
import { knownText, occasionTypeName } from '../../i18n/data';

type Patch = Partial<Pick<Occasion, 'title' | 'date' | 'budget' | 'lines' | 'eidia'>>;

/** What to put aside per day and per month until the occasion, for what is still to buy or give. */
function SavingPlanView({ plan }: { plan: SavingPlan }) {
  return <section className="saving-plan" aria-label={t('Saving plan')}>
    <h4>{t('Saving plan')}</h4>
    <div className="insight-grid flat"><div>{t('Per day')}<Money amount={plan.perDay} /></div><div>{t('Per month')}<Money amount={plan.perMonth} /></div><div>{t('Days left')}<strong>{tp(plan.days, '{n} day', '{n} days')}</strong></div></div>
    <p className="fine-print">{tn('To save: {amount} over {days} ({months}).', { amount: <Money amount={plan.amount} />, days: tp(plan.days, '{n} day', '{n} days'), months: tp(plan.months, '{n} month', '{n} months') })}</p>
  </section>;
}
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/** One occasion: its budget lines, the Eidia list for the Eids, and Barq's suggested split. */
export function OccasionDetail() {
  const { id } = useParams(); const navigate = useNavigate(); const { directory } = useWallet();
  const [occasion, setOccasion] = useState<Occasion | null>(null);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [plan, askPlan] = useRequest<OccasionPlan>();
  const [line, setLine] = useState({ label: '', amount: '' });
  const [person, setPerson] = useState({ name: '', amount: '' });
  const [details, setDetails] = useState<{ open: boolean; title: string; date: string; budget: string }>({ open: false, title: '', date: '', budget: '' });
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Changes are sent one at a time, in order, so the last answer always reflects every change.
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const load = useCallback(async () => {
    setError('');
    try {
      const found = (await api<Occasion[]>('/api/occasions')).find(o => o.id === id);
      if (!found) throw new Error(t('This occasion was not found.'));
      setOccasion(found);
    } catch (e) { setError(e instanceof ApiError || !(e instanceof Error) ? errorMessage(e) : e.message); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);

  const save = (patch: Patch) => {
    if (!occasion) return;
    setSaveError('');
    setOccasion({ ...occasion, ...patch });
    queue.current = queue.current.then(() => api<Occasion>(`/api/occasions/${occasion.id}`, { method: 'PUT', body: patch }))
      .then(updated => setOccasion(updated as Occasion))
      .catch(e => { setSaveError(errorMessage(e)); void load(); });
  };
  const setLines = (lines: OccasionLine[]) => save({ lines });
  const setEidia = (eidia: EidiaEntry[]) => save({ eidia });

  if (error) return <><DetailHeader title={t('Occasion')} fallback="/occasions" /><div className="detail-content"><ErrorState message={error} onRetry={() => void load()} /></div></>;
  if (!occasion) return <><DetailHeader title={t('Occasion')} fallback="/occasions" /><div className="detail-content"><p className="muted center" role="status">{t('Loading…')}</p></div></>;
  const o = occasion;

  const addLine = () => {
    const amount = Number(latinDigits(line.amount));
    if (!line.label.trim() || !Number.isFinite(amount) || amount < 0) return;
    setLines([...o.lines, { id: newId('line'), label: line.label.trim(), amount: Math.round(amount * 100) / 100, done: false }]);
    setLine({ label: '', amount: '' });
  };
  const addPerson = () => {
    const amount = Number(latinDigits(person.amount));
    if (!person.name.trim() || !Number.isFinite(amount) || amount < 0) return;
    setEidia([...o.eidia, { id: newId('eidia'), name: person.name.trim(), amount: Math.round(amount * 100) / 100, given: false }]);
    setPerson({ name: '', amount: '' });
  };
  const runPlan = () => askPlan(() => api<OccasionPlan>(`/api/occasions/${o.id}/plan`, { method: 'POST', timeoutMs: AI_TIMEOUT_MS }));
  const applyPlan = (suggestion: OccasionPlan) => setLines(suggestion.lines.map((l, i) => ({ id: newId(`line${i}`), label: l.label, amount: l.amount, done: false })));
  const openDetails = () => setDetails({ open: true, title: o.title, date: o.date, budget: String(o.budget) });
  const saveDetails = () => {
    const budget = Number(latinDigits(details.budget));
    if (!details.title.trim() || !Number.isFinite(budget) || budget < 1) return;
    save({ title: details.title.trim(), date: details.date, budget });
    setDetails(d => ({ ...d, open: false }));
  };
  const remove = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    try { await api(`/api/occasions/${o.id}`, { method: 'DELETE' }); navigate('/occasions'); }
    catch (e) { setSaveError(errorMessage(e)); }
  };

  const speech = plan.loading ? t('Splitting your budget… this can take up to a minute.') : plan.error ? plan.error : plan.data ? digits(plan.data.message)
    : o.past ? t('This occasion has passed. Keep it for reference or delete it.')
    : o.totals.over ? t("You've planned {amount} more than the budget. Lower a line or raise the budget.", { amount: sar(o.totals.planned - o.budget) })
    : o.saving.amount > 0 ? t('Put aside {day} a day, or {month} a month, to have the rest of the budget by {date}.', { day: sar(o.saving.perDay), month: sar(o.saving.perMonth), date: formatDay(o.date) })
    : t('Everything is bought or given. Nothing is left to save.');
  const pose = plan.loading ? 'laptop' : plan.error ? 'think' : plan.data ? plan.data.pose : o.totals.over ? 'receipt' : 'idea';

  return <><DetailHeader title={o.title} fallback="/occasions" /><div className="detail-content analyst-content">
    <section className="analyst-hero" aria-live="polite"><AnalystSprite pose={pose} /><p className="analyst-bubble">{speech}</p></section>
    <section className="info-panel occasion-summary">
      <p className="occasion-card-top"><span className={`occasion-chip ${o.type}`}>{occasionTypeName(o.type)}</span><small>{formatDay(o.date)} · {countdown(o)}</small></p>
      <div className="insight-grid flat">
        <div>{t('Budget')}<Money amount={o.budget} /></div>
        <div>{t('Planned')}<Money amount={o.totals.planned} /></div>
        <div>{o.totals.over ? t('Over by') : t('Left to plan')}<Money amount={Math.abs(o.totals.left)} className={o.totals.over ? 'error-text' : ''} /></div>
      </div>
      <div className="progress" role="progressbar" aria-label={t('Planned of budget')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round(o.totals.planned / o.budget * 100))}><span className={o.totals.over ? 'over' : ''} style={{ width: `${Math.min(100, o.totals.planned / o.budget * 100)}%` }} /></div>
      <p className="fine-print">{tn('Bought or given so far: {amount}', { amount: <Money amount={o.totals.done} /> })}</p>
      {!o.past && <SavingPlanView plan={o.saving} />}
    </section>
    {saveError && <p className="error-text" role="alert">{saveError}</p>}

    <section className="analyst-section"><h3>{t('Budget lines')}</h3>
      <ul className="occasion-lines" aria-label={t('Budget lines')}>{o.lines.map(l => <li key={l.id} className={l.done ? 'done' : ''}>
        <input type="checkbox" checked={l.done} aria-label={t('Bought: {label}', { label: knownText(l.label) })} onChange={() => setLines(o.lines.map(x => x.id === l.id ? { ...x, done: !x.done } : x))} />
        <span className="line-label">{knownText(l.label)}</span>
        <AmountInput value={l.amount} label={t('Amount for {label}', { label: knownText(l.label) })} onCommit={amount => setLines(o.lines.map(x => x.id === l.id ? { ...x, amount } : x))} />
        <button type="button" className="line-remove" aria-label={t('Remove {label}', { label: knownText(l.label) })} onClick={() => setLines(o.lines.filter(x => x.id !== l.id))}><Trash2 size={15} /></button>
      </li>)}</ul>
      {!o.lines.length && <p className="muted">{t('No lines yet. Add one or ask Barq below.')}</p>}
      <div className="add-line">
        <input aria-label={t('New line name')} placeholder={t('New line, e.g. Sweets')} maxLength={40} value={line.label} onChange={e => setLine({ ...line, label: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') addLine(); }} />
        <NumberField aria-label={t('New line amount')} placeholder={t('SAR')} value={line.amount} onChange={amount => setLine({ ...line, amount })} onKeyDown={e => { if (e.key === 'Enter') addLine(); }} />
        <button type="button" className="secondary-button" onClick={addLine} disabled={!line.label.trim() || line.amount.trim() === ''}><Plus size={15} />{t('Add')}</button>
      </div>
    </section>

    {o.hasEidia && <section className="analyst-section"><h3>{tn('Eidia · {amount} for {people}', { amount: <Money amount={o.totals.eidia} />, people: tp(o.eidia.length, '{n} person', '{n} people') })}</h3>
      <ul className="occasion-lines" aria-label={t('Eidia list')}>{o.eidia.map(p => <li key={p.id} className={p.given ? 'done' : ''}>
        <input type="checkbox" checked={p.given} aria-label={t('Given to {name}', { name: p.name })} onChange={() => setEidia(o.eidia.map(x => x.id === p.id ? { ...x, given: !x.given } : x))} />
        <span className="line-label">{p.name}</span>
        <AmountInput value={p.amount} label={t('Eidia for {name}', { name: p.name })} onCommit={amount => setEidia(o.eidia.map(x => x.id === p.id ? { ...x, amount } : x))} />
        <button type="button" className="line-remove" aria-label={t('Remove {label}', { label: p.name })} onClick={() => setEidia(o.eidia.filter(x => x.id !== p.id))}><Trash2 size={15} /></button>
      </li>)}</ul>
      {!o.eidia.length && <p className="muted">{t('Add the people you give Eidia to, and how much each.')}</p>}
      <div className="add-line">
        <input aria-label={t('Eidia name')} placeholder={t('Name')} maxLength={30} list="eidia-people" value={person.name} onChange={e => setPerson({ ...person, name: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') addPerson(); }} />
        <datalist id="eidia-people">{directory.map(d => <option key={d.id} value={d.name} />)}</datalist>
        <NumberField aria-label={t('Eidia amount')} placeholder={t('SAR')} value={person.amount} onChange={amount => setPerson({ ...person, amount })} onKeyDown={e => { if (e.key === 'Enter') addPerson(); }} />
        <button type="button" className="secondary-button" onClick={addPerson} disabled={!person.name.trim() || person.amount.trim() === ''}><Plus size={15} />{t('Add')}</button>
      </div>
    </section>}

    <section className="analyst-section"><h3>{t('Ask Barq')}</h3>
      <button type="button" className="primary-button" onClick={runPlan} disabled={plan.loading}>{plan.loading ? t('Planning…') : o.hasEidia ? t('Split the rest of my budget') : t('Split my budget')}</button>
      {plan.error && <ErrorState message={plan.error} onRetry={runPlan} />}
      {plan.data && !plan.error && <div className="info-panel">
        <h3>{tn("Barq's split of {amount}", { amount: <Money amount={plan.data.available} /> })}</h3>
        <ul className="suggested-lines">{plan.data.lines.map(l => <li key={l.label}><span><bdi>{l.label}</bdi>{l.note && <small>{digits(l.note)}</small>}</span><Money amount={l.amount} /></li>)}</ul>
        {plan.data.tips.length > 0 && <ul className="tip-list">{plan.data.tips.map(tip => <li key={tip}>{digits(tip)}</li>)}</ul>}
        {plan.data.saving.amount > 0 && <><SavingPlanView plan={plan.data.saving} /><p className="saving-tip">{digits(plan.data.saving.tip)}</p></>}
        <button type="button" className="primary-button" onClick={() => applyPlan(plan.data!)}>{t('Use this split')}</button>
        <p className="fine-print">{t('Replaces your budget lines. Your Eidia list stays as it is.')}</p>
        <AnsweredBy info={plan.data} />
      </div>}
    </section>

    <section className="analyst-section"><h3>{t('Details')}</h3>
      {details.open ? <>
        <label className="field-label">{t('Name')}<input aria-label={t('Edit name')} value={details.title} maxLength={40} onChange={e => setDetails({ ...details, title: e.target.value })} /></label>
        <label className="field-label">{t('Date')}<input aria-label={t('Edit date')} type="date" value={details.date} min={o.past ? undefined : todayKey()} onChange={e => setDetails({ ...details, date: e.target.value })} /></label>
        <label className="field-label">{t('Total budget (SAR)')}<NumberField aria-label={t('Edit budget')} value={details.budget} onChange={budget => setDetails({ ...details, budget })} /></label>
        <div className="button-pair"><button type="button" className="primary-button" onClick={saveDetails}>{t('Save')}</button><button type="button" className="secondary-button" onClick={() => setDetails(d => ({ ...d, open: false }))}>{t('Cancel')}</button></div>
      </> : <button type="button" className="secondary-button" onClick={openDetails}>{t('Edit name, date or budget')}</button>}
      <button type="button" className="text-button danger" onClick={() => void remove()}>{confirmDelete ? t('Tap again to delete this occasion') : t('Delete occasion')}</button>
    </section>
    <MockNote />
  </div></>;
}
