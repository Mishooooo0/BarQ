import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Plus, Trash2 } from 'lucide-react';
import { useWallet } from '../../app/WalletProvider';
import { AI_TIMEOUT_MS, api, errorMessage } from '../../lib/api';
import { DetailHeader, ErrorState, MockNote, Money } from '../../components/ui/Primitives';
import { AnalystSprite } from '../Analyst/AnalystSprite';
import { AnsweredBy, useRequest } from '../Analyst/parts';
import { AmountInput, countdown, formatDay, todayKey } from './occasionParts';
import type { EidiaEntry, Occasion, OccasionLine, OccasionPlan } from '../../types/api';

type Patch = Partial<Pick<Occasion, 'title' | 'date' | 'budget' | 'lines' | 'eidia'>>;
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
      if (!found) throw new Error('This occasion was not found.');
      setOccasion(found);
    } catch (e) { setError(errorMessage(e)); }
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

  if (error) return <><DetailHeader title="Occasion" fallback="/occasions" /><div className="detail-content"><ErrorState message={error} onRetry={() => void load()} /></div></>;
  if (!occasion) return <><DetailHeader title="Occasion" fallback="/occasions" /><div className="detail-content"><p className="muted center" role="status">Loading…</p></div></>;
  const o = occasion;

  const addLine = () => {
    const amount = Number(line.amount);
    if (!line.label.trim() || !Number.isFinite(amount) || amount < 0) return;
    setLines([...o.lines, { id: newId('line'), label: line.label.trim(), amount: Math.round(amount * 100) / 100, done: false }]);
    setLine({ label: '', amount: '' });
  };
  const addPerson = () => {
    const amount = Number(person.amount);
    if (!person.name.trim() || !Number.isFinite(amount) || amount < 0) return;
    setEidia([...o.eidia, { id: newId('eidia'), name: person.name.trim(), amount: Math.round(amount * 100) / 100, given: false }]);
    setPerson({ name: '', amount: '' });
  };
  const runPlan = () => askPlan(() => api<OccasionPlan>(`/api/occasions/${o.id}/plan`, { method: 'POST', timeoutMs: AI_TIMEOUT_MS }));
  const applyPlan = (suggestion: OccasionPlan) => setLines(suggestion.lines.map((l, i) => ({ id: newId(`line${i}`), label: l.label, amount: l.amount, done: false })));
  const openDetails = () => setDetails({ open: true, title: o.title, date: o.date, budget: String(o.budget) });
  const saveDetails = () => {
    const budget = Number(details.budget);
    if (!details.title.trim() || !Number.isFinite(budget) || budget < 1) return;
    save({ title: details.title.trim(), date: details.date, budget });
    setDetails(d => ({ ...d, open: false }));
  };
  const remove = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    try { await api(`/api/occasions/${o.id}`, { method: 'DELETE' }); navigate('/occasions'); }
    catch (e) { setSaveError(errorMessage(e)); }
  };

  const speech = plan.loading ? 'Splitting your budget… this can take up to a minute.' : plan.error ? plan.error : plan.data ? plan.data.message
    : o.past ? 'This occasion has passed. Keep it for reference or delete it.'
    : o.totals.over ? `You've planned ${(o.totals.planned - o.budget).toLocaleString('en-US')} riyals more than the budget. Lower a line or raise the budget.`
    : `Put aside SAR ${o.perWeek.toLocaleString('en-US')} a week to have the full budget by ${formatDay(o.date)}.`;
  const pose = plan.loading ? 'laptop' : plan.error ? 'think' : plan.data ? plan.data.pose : o.totals.over ? 'receipt' : 'idea';

  return <><DetailHeader title={o.title} fallback="/occasions" /><div className="detail-content analyst-content">
    <section className="analyst-hero" aria-live="polite"><AnalystSprite pose={pose} /><p className="analyst-bubble">{speech}</p></section>
    <section className="info-panel occasion-summary">
      <p className="occasion-card-top"><span className={`occasion-chip ${o.type}`}>{o.typeName}</span><small>{formatDay(o.date)} · {countdown(o)}</small></p>
      <div className="insight-grid flat">
        <div>Budget<Money amount={o.budget} /></div>
        <div>Planned<Money amount={o.totals.planned} /></div>
        <div>{o.totals.over ? 'Over by' : 'Left to plan'}<Money amount={Math.abs(o.totals.left)} className={o.totals.over ? 'error-text' : ''} /></div>
      </div>
      <div className="progress" role="progressbar" aria-label="Planned of budget" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round(o.totals.planned / o.budget * 100))}><span className={o.totals.over ? 'over' : ''} style={{ width: `${Math.min(100, o.totals.planned / o.budget * 100)}%` }} /></div>
      <p className="fine-print">Bought or given so far: <Money amount={o.totals.done} /></p>
    </section>
    {saveError && <p className="error-text" role="alert">{saveError}</p>}

    <section className="analyst-section"><h3>Budget lines</h3>
      <ul className="occasion-lines" aria-label="Budget lines">{o.lines.map(l => <li key={l.id} className={l.done ? 'done' : ''}>
        <input type="checkbox" checked={l.done} aria-label={`Bought: ${l.label}`} onChange={() => setLines(o.lines.map(x => x.id === l.id ? { ...x, done: !x.done } : x))} />
        <span className="line-label">{l.label}</span>
        <AmountInput value={l.amount} label={`Amount for ${l.label}`} onCommit={amount => setLines(o.lines.map(x => x.id === l.id ? { ...x, amount } : x))} />
        <button type="button" className="line-remove" aria-label={`Remove ${l.label}`} onClick={() => setLines(o.lines.filter(x => x.id !== l.id))}><Trash2 size={15} /></button>
      </li>)}</ul>
      {!o.lines.length && <p className="muted">No lines yet. Add one or ask Barq below.</p>}
      <div className="add-line">
        <input aria-label="New line name" placeholder="New line, e.g. Sweets" maxLength={40} value={line.label} onChange={e => setLine({ ...line, label: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') addLine(); }} />
        <input aria-label="New line amount" placeholder="SAR" type="number" inputMode="decimal" min="0" value={line.amount} onChange={e => setLine({ ...line, amount: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') addLine(); }} />
        <button type="button" className="secondary-button" onClick={addLine} disabled={!line.label.trim() || line.amount.trim() === ''}><Plus size={15} />Add</button>
      </div>
    </section>

    {o.hasEidia && <section className="analyst-section"><h3>Eidia · <Money amount={o.totals.eidia} /> for {o.eidia.length} {o.eidia.length === 1 ? 'person' : 'people'}</h3>
      <ul className="occasion-lines" aria-label="Eidia list">{o.eidia.map(p => <li key={p.id} className={p.given ? 'done' : ''}>
        <input type="checkbox" checked={p.given} aria-label={`Given to ${p.name}`} onChange={() => setEidia(o.eidia.map(x => x.id === p.id ? { ...x, given: !x.given } : x))} />
        <span className="line-label">{p.name}</span>
        <AmountInput value={p.amount} label={`Eidia for ${p.name}`} onCommit={amount => setEidia(o.eidia.map(x => x.id === p.id ? { ...x, amount } : x))} />
        <button type="button" className="line-remove" aria-label={`Remove ${p.name}`} onClick={() => setEidia(o.eidia.filter(x => x.id !== p.id))}><Trash2 size={15} /></button>
      </li>)}</ul>
      {!o.eidia.length && <p className="muted">Add the people you give Eidia to, and how much each.</p>}
      <div className="add-line">
        <input aria-label="Eidia name" placeholder="Name" maxLength={30} list="eidia-people" value={person.name} onChange={e => setPerson({ ...person, name: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') addPerson(); }} />
        <datalist id="eidia-people">{directory.map(d => <option key={d.id} value={d.name} />)}</datalist>
        <input aria-label="Eidia amount" placeholder="SAR" type="number" inputMode="decimal" min="0" value={person.amount} onChange={e => setPerson({ ...person, amount: e.target.value })} onKeyDown={e => { if (e.key === 'Enter') addPerson(); }} />
        <button type="button" className="secondary-button" onClick={addPerson} disabled={!person.name.trim() || person.amount.trim() === ''}><Plus size={15} />Add</button>
      </div>
    </section>}

    <section className="analyst-section"><h3>Ask Barq</h3>
      <button type="button" className="primary-button" onClick={runPlan} disabled={plan.loading}>{plan.loading ? 'Planning…' : o.hasEidia ? 'Split the rest of my budget' : 'Split my budget'}</button>
      {plan.error && <ErrorState message={plan.error} onRetry={runPlan} />}
      {plan.data && !plan.error && <div className="info-panel">
        <h3>Barq's split of <Money amount={plan.data.available} /></h3>
        <ul className="suggested-lines">{plan.data.lines.map(l => <li key={l.label}><span>{l.label}{l.note && <small>{l.note}</small>}</span><Money amount={l.amount} /></li>)}</ul>
        {plan.data.tips.length > 0 && <ul className="tip-list">{plan.data.tips.map(t => <li key={t}>{t}</li>)}</ul>}
        <button type="button" className="primary-button" onClick={() => applyPlan(plan.data!)}>Use this split</button>
        <p className="fine-print">Replaces your budget lines. Your Eidia list stays as it is.</p>
        <AnsweredBy info={plan.data} />
      </div>}
    </section>

    <section className="analyst-section"><h3>Details</h3>
      {details.open ? <>
        <label className="field-label">Name<input aria-label="Edit name" value={details.title} maxLength={40} onChange={e => setDetails({ ...details, title: e.target.value })} /></label>
        <label className="field-label">Date<input aria-label="Edit date" type="date" value={details.date} min={o.past ? undefined : todayKey()} onChange={e => setDetails({ ...details, date: e.target.value })} /></label>
        <label className="field-label">Total budget (SAR)<input aria-label="Edit budget" type="number" inputMode="decimal" min="1" value={details.budget} onChange={e => setDetails({ ...details, budget: e.target.value })} /></label>
        <div className="button-pair"><button type="button" className="primary-button" onClick={saveDetails}>Save</button><button type="button" className="secondary-button" onClick={() => setDetails(d => ({ ...d, open: false }))}>Cancel</button></div>
      </> : <button type="button" className="secondary-button" onClick={openDetails}>Edit name, date or budget</button>}
      <button type="button" className="text-button danger" onClick={() => void remove()}>{confirmDelete ? 'Tap again to delete this occasion' : 'Delete occasion'}</button>
    </section>
    <MockNote />
  </div></>;
}
