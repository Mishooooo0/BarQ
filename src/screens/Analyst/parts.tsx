import { useCallback, useId, useRef, useState } from 'react';
import { Clock, MapPin } from 'lucide-react';
import { errorMessage } from '../../lib/api';
import { Money } from '../../components/ui/Primitives';
import type { AiSource, PlanItem } from '../../types/api';
import { digits, num, sar, t } from '../../i18n';
import { categoryName, knownText } from '../../i18n/data';

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
    <input id={id} type="range" min={0} max={max} step={1} value={value} disabled={max <= 0} onChange={e => onChange(Number(e.target.value))} style={{ '--fill': `${percent}%` } as React.CSSProperties} aria-valuetext={t('{value} of {max}', { value: sar(value), max: sar(max) })} />
    <div className="budget-scale"><span>{sar(0)}</span><span>{t('Wallet: {amount}', { amount: sar(max) })}</span></div>
    {max <= 0 && <p className="error-text">{t('Your wallet is empty. Add money from Home to plan.')}</p>}
  </div>;
}

export function PlanView({ items, footer }: { items: PlanItem[]; footer: React.ReactNode }) {
  if (!items.length) return null;
  return <div className="plan">
    <ol className="plan-list">{items.map(item => <li key={`${item.time}-${item.label}`} className="plan-item">
      <span className="plan-time"><Clock size={13} /> {digits(item.time)}</span>
      <div className="plan-body"><strong><bdi>{item.label}</bdi></strong><span><bdi>{item.place ? item.place.name : item.note ? knownText(item.note) : categoryName(item.category)}</bdi></span><small>{categoryName(item.category)}{item.place?.rating != null ? ` · ★ ${num(item.place.rating, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}` : ''}{item.place ? <> · <MapPin size={10} /> <bdi>{item.place.district ?? t('Riyadh')}</bdi></> : null}</small></div>
      <Money amount={item.estimate} className="plan-cost" />
    </li>)}</ol>
    <div className="plan-footer">{footer}</div>
    <p className="fine-print">{t("Costs are estimates per person from each place's price band.")}</p>
  </div>;
}

/** Users know the assistant as Barq; the backup engine answers when the main one is slow or unavailable. */
export function AnsweredBy({ info }: { info: AiSource }) {
  return <p className="fine-print ai-source">{info.source === 'standard' ? t('Standard split: Barq could not answer right now. Try again later for a personal plan.') : info.source === 'ring' ? t('Answered by Barq AI (backup engine, because the main one was slow or unavailable).') : t('Answered by Barq AI.')}</p>;
}
