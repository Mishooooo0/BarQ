import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { DetailHeader, ErrorState, MockNote, Money } from '../../components/ui/Primitives';
import { AnalystSprite } from '../Analyst/AnalystSprite';
import { addDaysKey, countdown, formatDay, todayKey } from './occasionParts';
import { NumberField } from '../../components/NumberField';
import type { Occasion, OccasionType, OccasionTypeId } from '../../types/api';
import { digits, t, tn } from '../../i18n';
import { knownText, occasionTypeName } from '../../i18n/data';

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
  const placeholder = useMemo(() => type ? `${occasionTypeName(type.id)} ${digits(date.slice(0, 4))}` : '', [type, date]);

  const create = async () => {
    if (!valid || creating.busy) return;
    setCreating({ busy: true, error: '' });
    try {
      // The name defaults to the type and year, written in the chosen language.
      const made = await api<Occasion>('/api/occasions', { method: 'POST', body: { type: typeId, title: title.trim() || placeholder, date, budget: budgetValue } });
      navigate(`/occasions/${made.id}`);
    } catch (e) { setCreating({ busy: false, error: errorMessage(e) }); }
  };

  return <><DetailHeader title={t('Occasions')} fallback="/" /><div className="detail-content analyst-content">
    <section className="analyst-hero"><AnalystSprite pose="celebrate" /><p className="analyst-bubble">{t("Eid, graduation, a party at home or a trip: set a budget and I'll split it into lines, keep your Eidia list and tell you how much to put aside each week.")}</p></section>
    {error ? <ErrorState message={error} onRetry={() => void load()} /> : !types || !occasions ? <p className="muted center" role="status">{t('Loading occasions…')}</p> : <>
      <section className="analyst-section"><h3>{t('Your occasions')}</h3>
        {!occasions.length ? <p className="muted">{t('Nothing planned yet. Start one below.')}</p> : <div className="occasion-list">{occasions.map(o => <Link key={o.id} className={`occasion-card ${o.past ? 'past' : ''}`} to={`/occasions/${o.id}`}>
          <div className="occasion-card-top"><span className={`occasion-chip ${o.type}`}>{occasionTypeName(o.type)}</span><small><CalendarDays size={12} /> {formatDay(o.date)} · {countdown(o)}</small></div>
          <strong>{o.title}</strong>
          <div className="progress small" aria-hidden="true"><span className={o.totals.over ? 'over' : ''} style={{ width: `${Math.min(100, o.budget ? o.totals.planned / o.budget * 100 : 0)}%` }} /></div>
          <div className="occasion-card-bottom"><span>{tn('Planned {planned} of {budget}', { planned: <Money amount={o.totals.planned} />, budget: <Money amount={o.budget} /> })}</span>{o.totals.over ? <span className="error-text">{t('Over budget')}</span> : <ChevronRight size={16} />}</div>
        </Link>)}</div>}
      </section>

      <section className="analyst-section"><h3>{t('Plan a new occasion')}</h3>
        <div className="group-chips" role="radiogroup" aria-label={t('Occasion type')}>{types.map(option => <button key={option.id} type="button" role="radio" aria-checked={option.id === typeId} onClick={() => setTypeId(option.id)}>{occasionTypeName(option.id)}</button>)}</div>
        {type && <p className="fine-print">{t(type.eidia ? 'Starts with: {lines}, plus your Eidia list.' : 'Starts with: {lines}.', { lines: type.lines.map(knownText).join(t(', ')) })}{type.expectedDate ? ` ${t('Expected date: {date} (Eid dates follow the moon, so change it if needed).', { date: formatDay(type.expectedDate) })}` : ''}</p>}
        <label className="field-label">{t('Name')}<input aria-label={t('Occasion name')} value={title} maxLength={40} placeholder={placeholder} onChange={e => setTitle(e.target.value)} /></label>
        <label className="field-label">{t('Date')}<input aria-label={t('Occasion date')} type="date" value={date} min={todayKey()} onChange={e => setDate(e.target.value)} /></label>
        <label className="field-label">{t('Total budget (SAR)')}<NumberField aria-label={t('Occasion budget')} value={budget} onChange={setBudget} /></label>
        <button type="button" className="primary-button" onClick={() => void create()} disabled={!valid || creating.busy}>{creating.busy ? t('Creating…') : t('Create the budget')}</button>
        {creating.error && <p className="error-text" role="alert">{creating.error}</p>}
      </section>
    </>}
    <MockNote />
  </div></>;
}
