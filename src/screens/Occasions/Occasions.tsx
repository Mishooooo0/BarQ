import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { DetailHeader, ErrorState, MockNote, Money } from '../../components/ui/Primitives';
import { AnalystSprite } from '../Analyst/AnalystSprite';
import { addDaysKey, countdown, formatDay, todayKey } from './occasionParts';
import type { Occasion, OccasionType, OccasionTypeId } from '../../types/api';

/** Occasions: budgets for Eid al-Fitr, Eid al-Adha (with Eidia), graduations, home parties and holiday trips. */
export function Occasions() {
  const navigate = useNavigate();
  const [types, setTypes] = useState<OccasionType[] | null>(null);
  const [occasions, setOccasions] = useState<Occasion[] | null>(null);
  const [error, setError] = useState('');
  const [typeId, setTypeId] = useState<OccasionTypeId>('eid-fitr');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [budget, setBudget] = useState('1000');
  const [creating, setCreating] = useState<{ busy: boolean; error: string }>({ busy: false, error: '' });

  const load = useCallback(async () => {
    setError('');
    try {
      const [t, list] = await Promise.all([api<OccasionType[]>('/api/occasion-types'), api<Occasion[]>('/api/occasions')]);
      setTypes(t); setOccasions(list);
    } catch (e) { setError(errorMessage(e)); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const type = types?.find(t => t.id === typeId);
  // Eids start on their expected date; other occasions a month from today. People can change either.
  useEffect(() => { if (type) setDate(type.expectedDate ?? addDaysKey(todayKey(), 30)); }, [type]);
  const budgetValue = Number(budget);
  const valid = !!type && budget.trim() !== '' && Number.isFinite(budgetValue) && budgetValue >= 1 && /^\d{4}-\d{2}-\d{2}$/.test(date);
  const placeholder = useMemo(() => type ? `${type.name} ${date.slice(0, 4)}` : '', [type, date]);

  const create = async () => {
    if (!valid || creating.busy) return;
    setCreating({ busy: true, error: '' });
    try {
      const made = await api<Occasion>('/api/occasions', { method: 'POST', body: { type: typeId, title: title.trim(), date, budget: budgetValue } });
      navigate(`/occasions/${made.id}`);
    } catch (e) { setCreating({ busy: false, error: errorMessage(e) }); }
  };

  return <><DetailHeader title="Occasions" fallback="/" /><div className="detail-content analyst-content">
    <section className="analyst-hero"><AnalystSprite pose="celebrate" /><p className="analyst-bubble">Eid, graduation, a party at home or a trip: set a budget and I'll split it into lines, keep your Eidia list and tell you how much to put aside each week.</p></section>
    {error ? <ErrorState message={error} onRetry={() => void load()} /> : !types || !occasions ? <p className="muted center" role="status">Loading occasions…</p> : <>
      <section className="analyst-section"><h3>Your occasions</h3>
        {!occasions.length ? <p className="muted">Nothing planned yet. Start one below.</p> : <div className="occasion-list">{occasions.map(o => <Link key={o.id} className={`occasion-card ${o.past ? 'past' : ''}`} to={`/occasions/${o.id}`}>
          <div className="occasion-card-top"><span className={`occasion-chip ${o.type}`}>{o.typeName}</span><small><CalendarDays size={12} /> {formatDay(o.date)} · {countdown(o)}</small></div>
          <strong>{o.title}</strong>
          <div className="progress small" aria-hidden="true"><span className={o.totals.over ? 'over' : ''} style={{ width: `${Math.min(100, o.budget ? o.totals.planned / o.budget * 100 : 0)}%` }} /></div>
          <div className="occasion-card-bottom"><span>Planned <Money amount={o.totals.planned} /> of <Money amount={o.budget} /></span>{o.totals.over ? <span className="error-text">Over budget</span> : <ChevronRight size={16} />}</div>
        </Link>)}</div>}
      </section>

      <section className="analyst-section"><h3>Plan a new occasion</h3>
        <div className="group-chips" role="radiogroup" aria-label="Occasion type">{types.map(t => <button key={t.id} type="button" role="radio" aria-checked={t.id === typeId} onClick={() => setTypeId(t.id)}>{t.name}</button>)}</div>
        {type && <p className="fine-print">Starts with: {type.lines.join(', ')}{type.eidia ? ', plus your Eidia list' : ''}.{type.expectedDate ? ` Expected date: ${formatDay(type.expectedDate)} (Eid dates follow the moon, so change it if needed).` : ''}</p>}
        <label className="field-label">Name<input aria-label="Occasion name" value={title} maxLength={40} placeholder={placeholder} onChange={e => setTitle(e.target.value)} /></label>
        <label className="field-label">Date<input aria-label="Occasion date" type="date" value={date} min={todayKey()} onChange={e => setDate(e.target.value)} /></label>
        <label className="field-label">Total budget (SAR)<input aria-label="Occasion budget" type="number" inputMode="decimal" min="1" step="1" value={budget} onChange={e => setBudget(e.target.value)} /></label>
        <button type="button" className="primary-button" onClick={() => void create()} disabled={!valid || creating.busy}>{creating.busy ? 'Creating…' : 'Create the budget'}</button>
        {creating.error && <p className="error-text" role="alert">{creating.error}</p>}
      </section>
    </>}
    <MockNote />
  </div></>;
}
