import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { AlertTriangle, CalendarClock, Clock, MapPin, Users } from 'lucide-react';
import { useWallet } from '../../app/WalletProvider';
import { useSession } from '../../app/SessionProvider';
import { api, errorMessage } from '../../lib/api';
import { DetailHeader, ErrorState, MockNote, Money } from '../../components/ui/Primitives';
import { AnalystSprite } from './AnalystSprite';
import type { DailyPlan, Group, HangoutPlan, Insights, PlanItem, Pose } from '../../types/api';

type Tab = 'insights' | 'daily' | 'hangout';
const tabs: { id: Tab; label: string }[] = [{ id: 'insights', label: 'Insights' }, { id: 'daily', label: 'Daily plan' }, { id: 'hangout', label: 'Hangout' }];
const wholeRiyals = (value: number) => Math.max(0, Math.floor(value));

/** Runs one request at a time and ignores answers that arrive after a newer request started. */
function useRequest<T>() {
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

export function Analyst() {
  const { state: wallet, user } = useWallet(); const { setUser } = useSession();
  const balance = wholeRiyals(wallet.balance);
  const [tab, setTab] = useState<Tab>('insights');
  const [insights, loadInsights] = useRequest<Insights>();
  const [daily, planDay] = useRequest<DailyPlan>();
  const [hangout, planHangout] = useRequest<HangoutPlan>();
  const [groups, loadGroups] = useRequest<Group[]>();
  const [dayBudget, setDayBudget] = useState<number | null>(null);
  const [hangoutBudget, setHangoutBudget] = useState(() => Math.min(balance, wholeRiyals(user.hangoutBudget ?? 100)));
  const [groupId, setGroupId] = useState('');

  const fetchInsights = useCallback(() => loadInsights(() => api<Insights>('/api/analyst/insights')), [loadInsights]);
  const fetchGroups = useCallback(() => loadGroups(() => api<Group[]>('/api/me/groups')), [loadGroups]);
  useEffect(() => { void fetchInsights(); void fetchGroups(); }, [fetchInsights, fetchGroups]);
  useEffect(() => { if (!groupId && groups.data?.length) setGroupId(groups.data[0].id); }, [groups.data, groupId]);
  // Budgets can never exceed what is in the wallet, including after the balance changes.
  const budget = Math.min(dayBudget ?? insights.data?.budgets.daily ?? 100, balance);
  const groupBudget = Math.min(hangoutBudget, balance);

  const runDaily = () => planDay(() => api<DailyPlan>('/api/analyst/daily', { method: 'POST', body: { budget } }));
  const runHangout = () => planHangout(async () => {
    const plan = await api<HangoutPlan>('/api/analyst/hangout', { method: 'POST', body: { budget: groupBudget, groupId } });
    setUser({ ...user, hangoutBudget: groupBudget });
    return plan;
  });

  let pose: Pose = 'think'; let speech = 'Let me look at your spending…';
  const current = tab === 'insights' ? insights : tab === 'daily' ? daily : hangout;
  if (current.error) { pose = 'think'; speech = current.error; }
  else if (current.loading) { pose = 'laptop'; speech = tab === 'insights' ? 'Reading your last 60 days…' : 'Finding places that fit your budget…'; }
  else if (tab === 'insights' && insights.data) { pose = insights.data.pose; speech = insights.data.headline; }
  else if (tab === 'daily') { if (daily.data) { pose = daily.data.pose; speech = daily.data.message; } else { pose = 'coin'; speech = `Slide to choose how much of your wallet to spend today. You have SAR ${balance.toLocaleString('en-US')}.`; } }
  else if (tab === 'hangout') { if (hangout.data) { pose = hangout.data.pose; speech = hangout.data.message; } else { pose = 'places'; speech = "Pick your group and your budget. I'll plan around the smallest budget so nobody feels awkward."; } }

  const group = groups.data?.find(g => g.id === groupId);
  return <><DetailHeader title="AI Analyst" fallback="/" /><div className="detail-content analyst-content">
    <section className="analyst-hero" aria-live="polite"><AnalystSprite pose={pose} /><p className="analyst-bubble">{speech}</p></section>
    <div className="filter-tabs" role="tablist" aria-label="Analyst sections">{tabs.map(t => <button key={t.id} role="tab" aria-selected={tab === t.id} aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>)}</div>

    {tab === 'insights' && (insights.error ? <ErrorState message={insights.error} onRetry={fetchInsights} /> : insights.data ? <InsightsView data={insights.data} onPlan={() => { setDayBudget(Math.min(insights.data!.budgets.daily, balance)); setTab('daily'); }} /> : <p className="muted center" role="status">Loading insights…</p>)}

    {tab === 'daily' && <>
      <BudgetSlider label="Today's budget" value={budget} max={balance} onChange={setDayBudget} />
      <button className="primary-button" onClick={runDaily} disabled={daily.loading}>{daily.loading ? 'Planning…' : daily.data && daily.data.budget !== budget ? 'Update my plan' : 'Plan my day'}</button>
      {daily.error && <ErrorState message={daily.error} onRetry={runDaily} />}
      {daily.data && !daily.error && <PlanView items={daily.data.items} footer={<><div><span>Planned</span><Money amount={daily.data.total} /></div><div><span>Stays in wallet</span><Money amount={daily.data.remaining} /></div></>} />}
    </>}

    {tab === 'hangout' && <>
      {groups.error ? <ErrorState message={groups.error} onRetry={fetchGroups} /> : !groups.data ? <p className="muted center" role="status">Loading groups…</p> : !groups.data.length ? <p className="muted">You are not in any group yet.</p> : <>
        <div className="group-chips" role="radiogroup" aria-label="Group">{groups.data.map(g => <button key={g.id} role="radio" aria-checked={g.id === groupId} onClick={() => setGroupId(g.id)}><Users size={14} /> {g.name}</button>)}</div>
        {group && <ul className="member-list" aria-label="Members">{group.members.map(m => <li key={m.id}><span className={`dot ${m.ready || m.id === user.id ? 'ready' : ''}`} />{m.id === user.id ? `${m.name} (you)` : m.name}<small>{m.id === user.id ? 'your budget below' : m.ready ? 'budget set' : 'no budget yet'}</small></li>)}</ul>}
        <BudgetSlider label="Your hangout budget" value={groupBudget} max={balance} onChange={setHangoutBudget} />
        <p className="fine-print">Only you see your budget. Friends see the plan, never each other's numbers.</p>
        <button className="primary-button" onClick={runHangout} disabled={hangout.loading || !groupId}>{hangout.loading ? 'Planning…' : 'Plan the hangout'}</button>
        {hangout.error && <ErrorState message={hangout.error} onRetry={runHangout} />}
        {hangout.data && !hangout.error && <>
          <div className="info-panel per-person"><p>Budget per person everyone can manage</p><Money amount={hangout.data.perPersonBudget} />{hangout.data.pending.length > 0 && <p className="fine-print">Planned without {hangout.data.pending.join(', ')}: no budget set yet.</p>}</div>
          <PlanView items={hangout.data.items} footer={<><div><span>Per person</span><Money amount={hangout.data.perPersonTotal} /></div><div><span>Whole group ({hangout.data.groupSize})</span><Money amount={hangout.data.groupTotal} /></div></>} />
        </>}
      </>}
    </>}
    <MockNote />
  </div></>;
}

function BudgetSlider({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (value: number) => void }) {
  const percent = max > 0 ? (value / max) * 100 : 0; const id = useId();
  return <div className="budget-slider">
    <div className="budget-head"><label htmlFor={id}>{label}</label><Money amount={value} /></div>
    <input id={id} type="range" min={0} max={max} step={1} value={value} disabled={max <= 0} onChange={e => onChange(Number(e.target.value))} style={{ '--fill': `${percent}%` } as React.CSSProperties} aria-valuetext={`SAR ${value} of SAR ${max}`} />
    <div className="budget-scale"><span>SAR 0</span><span>Wallet: SAR {max.toLocaleString('en-US')}</span></div>
    {max <= 0 && <p className="error-text">Your wallet is empty. Add money from Home to plan.</p>}
  </div>;
}

function PlanView({ items, footer }: { items: PlanItem[]; footer: React.ReactNode }) {
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

function InsightsView({ data, onPlan }: { data: Insights; onPlan: () => void }) {
  const max = Math.max(1, ...data.byCategory.map(c => c.amount));
  return <>
    <div className="insight-grid"><div><span>Today</span><Money amount={data.summary.today} /></div><div><span>This week</span><Money amount={data.summary.week} /></div><div><span>30 days</span><Money amount={data.summary.month} /></div></div>
    <div className="info-panel"><h3>Suggested budgets</h3><div className="insight-grid flat"><div><span>Daily</span><Money amount={data.budgets.daily} /></div><div><span>Weekly</span><Money amount={data.budgets.weekly} /></div><div><span>Monthly</span><Money amount={data.budgets.monthly} /></div></div>{data.summary.balanceDays != null && <p>At your usual SAR {Math.round(data.summary.avgDaily)} a day, your balance lasts about {data.summary.balanceDays} days.</p>}<button className="primary-button" onClick={onPlan}>Plan today with this budget</button></div>
    {data.alerts.length > 0 && <section className="analyst-section"><h3>Watch out</h3>{data.alerts.map(alert => <p key={alert.message} className="alert-item"><AlertTriangle size={16} />{alert.message}</p>)}</section>}
    {data.subscriptions.length > 0 && <section className="analyst-section"><h3>Upcoming subscriptions</h3>{data.subscriptions.map(sub => <div key={sub.seller} className={`sub-item ${sub.daysLeft <= 7 ? 'soon' : ''}`}><CalendarClock size={16} /><span>{sub.seller}</span><small>{sub.daysLeft === 0 ? 'Today' : sub.daysLeft === 1 ? 'Tomorrow' : `In ${sub.daysLeft} days`}</small><Money amount={sub.amount} /></div>)}</section>}
    <section className="analyst-section"><h3>Where your money went (30 days)</h3><div className="spending-bars">{data.byCategory.map((c, i) => <div key={c.id}><span>{c.name}</span><div><i style={{ width: `${Math.max(4, (c.amount / max) * 100)}%`, background: ['#f8db4c', '#bce1e5', '#d5cee7'][i % 3] }} /></div><Money amount={c.amount} /></div>)}</div></section>
    {data.tips.length > 0 && <section className="analyst-section"><h3>Tips</h3><ul className="tip-list">{data.tips.map(tip => <li key={tip}>{tip}</li>)}</ul></section>}
  </>;
}
