import { useCallback, useId, useRef, useState } from 'react';
import { Clock, MapPin } from 'lucide-react';
import { errorMessage } from '../../lib/api';
import { Money } from '../../components/ui/Primitives';
import type { AiSource, PlanItem } from '../../types/api';

export const wholeRiyals = (value: number) => Math.max(0, Math.floor(value));

/** Runs one request at a time and ignores answers that arrive after a newer request started. */
export function useRequest<T>() {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: string }>({ data: null, loading: false, error: '' });
  const latest = useRef(0);
  const run = useCallback(async (request: () => Promise<T>) => {
    const id = ++latest.current;
    setState(s => ({ ...s, loading: true, error: '' }));
    try { const data = await request(); if (id === latest.current) setState({ data, loading: false, error: '' }); }
    catch (error) { if (id === latest.current) setState(s => ({ ...s, loading: false, error: errorMessage(error) })); }
  }, []);
  return [state, run] as const;
}

export function BudgetSlider({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (value: number) => void }) {
  const percent = max > 0 ? (value / max) * 100 : 0; const id = useId();
  return <div className="budget-slider">
    <div className="budget-head"><label htmlFor={id}>{label}</label><Money amount={value} /></div>
    <input id={id} type="range" min={0} max={max} step={1} value={value} disabled={max <= 0} onChange={e => onChange(Number(e.target.value))} style={{ '--fill': `${percent}%` } as React.CSSProperties} aria-valuetext={`SAR ${value} of SAR ${max}`} />
    <div className="budget-scale"><span>SAR 0</span><span>Wallet: SAR {max.toLocaleString('en-US')}</span></div>
    {max <= 0 && <p className="error-text">Your wallet is empty. Add money from Home to plan.</p>}
  </div>;
}

export function PlanView({ items, footer }: { items: PlanItem[]; footer: React.ReactNode }) {
  if (!items.length) return null;
  return <div className="plan">
    <ol className="plan-list">{items.map(item => <li key={`${item.time}-${item.label}`} className="plan-item">
      <span className="plan-time"><Clock size={13} /> {item.time}</span>
      <div className="plan-body"><strong>{item.label}</strong><span>{item.place ? item.place.name : item.note ?? item.categoryName}</span><small>{item.categoryName}{item.place?.rating != null ? ` · ★ ${item.place.rating.toFixed(1)}` : ''}{item.place ? <> · <MapPin size={10} /> {item.place.district ?? 'Riyadh'}</> : null}</small></div>
      <Money amount={item.estimate} className="plan-cost" />
    </li>)}</ol>
    <div className="plan-footer">{footer}</div>
    <p className="fine-print">Costs are estimates per person from each place's price band.</p>
  </div>;
}

/** Users know the assistant as Barq; the backup engine answers when the main one is slow or unavailable. */
export function AnsweredBy({ info }: { info: AiSource }) {
  return <p className="fine-print ai-source">{info.source === 'ring' ? 'Answered by Barq AI (backup engine, because the main one was slow or unavailable).' : 'Answered by Barq AI.'}</p>;
}
