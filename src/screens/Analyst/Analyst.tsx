import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { AlertTriangle, CalendarClock, Clock, MapPin, UserPlus, Users } from 'lucide-react';
import { useWallet } from '../../app/WalletProvider';
import { useSession } from '../../app/SessionProvider';
import { AI_TIMEOUT_MS, api, errorMessage } from '../../lib/api';
import { DetailHeader, ErrorState, MockNote, Money } from '../../components/ui/Primitives';
import { AnalystSprite } from './AnalystSprite';
import { HangoutVotes } from './HangoutVotes';
import type { Advice, DailyPlan, Group, Hangout, HangoutPlan, Insights, PlanItem, Pose } from '../../types/api';

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
  const { state: wallet, user, directory } = useWallet(); const { setUser } = useSession();
  const balance = wholeRiyals(wallet.balance);
  const [tab, setTab] = useState<Tab>('insights');
  const [insights, loadInsights] = useRequest<Insights>();
  const [advice, loadAdvice] = useRequest<Advice>();
  const [daily, planDay] = useRequest<DailyPlan>();
  const [hangout, planHangout] = useRequest<HangoutPlan>();
  const [groups, loadGroups] = useRequest<Group[]>();
  const [hangouts, loadHangouts] = useRequest<Hangout[]>();
  const [asking, setAsking] = useState<{ busy: boolean; error: string }>({ busy: false, error: '' });
  const [dayBudget, setDayBudget] = useState<number | null>(null);
  const [hangoutBudget, setHangoutBudget] = useState(() => Math.min(balance, wholeRiyals(user.hangoutBudget ?? 100)));
  const [groupId, setGroupId] = useState('');
  const [newMember, setNewMember] = useState('');
  const [adding, setAdding] = useState<{ busy: boolean; error: string; done: string }>({ busy: false, error: '', done: '' });

  const fetchInsights = useCallback(() => loadInsights(() => api<Insights>('/api/analyst/insights')), [loadInsights]);
  const fetchAdvice = useCallback(() => loadAdvice(() => api<Advice>('/api/analyst/advice', { timeoutMs: AI_TIMEOUT_MS })), [loadAdvice]);
  const fetchGroups = useCallback(() => loadGroups(() => api<Group[]>('/api/me/groups')), [loadGroups]);
  useEffect(() => { void fetchInsights(); void fetchAdvice(); void fetchGroups(); }, [fetchInsights, fetchAdvice, fetchGroups]);
  useEffect(() => { if (!groupId && groups.data?.length) setGroupId(groups.data[0].id); }, [groups.data, groupId]);
  const fetchHangouts = useCallback(() => groupId ? loadHangouts(() => api<Hangout[]>(`/api/hangouts?groupId=${encodeURIComponent(groupId)}`)) : Promise.resolve(), [groupId, loadHangouts]);
  // Friends vote from their own phones, so the list refreshes while the Hangout tab is open.
  useEffect(() => {
    if (tab !== 'hangout' || !groupId) return;
    void fetchHangouts();
    const timer = setInterval(() => void fetchHangouts(), 10_000);
    return () => clearInterval(timer);
  }, [tab, groupId, fetchHangouts]);
  // Budgets can never exceed what is in the wallet, including after the balance changes.
  const budget = Math.min(dayBudget ?? insights.data?.budgets.daily ?? 100, balance);
  const groupBudget = Math.min(hangoutBudget, balance);

  const runDaily = () => planDay(() => api<DailyPlan>('/api/analyst/daily', { method: 'POST', body: { budget }, timeoutMs: AI_TIMEOUT_MS }));
  const runHangout = () => planHangout(async () => {
    const plan = await api<HangoutPlan>('/api/analyst/hangout', { method: 'POST', body: { budget: groupBudget, groupId }, timeoutMs: AI_TIMEOUT_MS });
    setUser({ ...user, hangoutBudget: groupBudget });
    return plan;
  });
  const askGroup = async () => {
    if (!hangout.data || asking.busy) return;
    setAsking({ busy: true, error: '' });
    try {
      await api<Hangout>('/api/hangouts', { method: 'POST', body: { groupId: hangout.data.group.id, items: hangout.data.items.filter(i => i.place).map(i => ({ time: i.time, label: i.label, placeId: i.place!.id })) } });
      setAsking({ busy: false, error: '' });
      void fetchHangouts();
    } catch (error) { setAsking({ busy: false, error: errorMessage(error) }); }
  };
  const addMember = async () => {
    if (!newMember || adding.busy) return;
    setAdding({ busy: true, error: '', done: '' });
    try {
      const updated = await api<Group>(`/api/groups/${encodeURIComponent(groupId)}/members`, { method: 'POST', body: { userId: newMember } });
      void fetchGroups();
      setNewMember('');
      setAdding({ busy: false, error: '', done: `${updated.members.at(-1)?.name ?? 'They'} joined ${updated.name}.` });
    } catch (error) { setAdding({ busy: false, error: errorMessage(error), done: '' }); }
  };

  let pose: Pose = 'think'; let speech = 'Let me look at your spending…';
  const current = tab === 'insights' ? advice : tab === 'daily' ? daily : hangout;
  if (current.error) { pose = 'think'; speech = current.error; }
  else if (current.loading) { pose = 'laptop'; speech = tab === 'insights' ? 'Reading your last 60 days… this can take up to a minute.' : 'Asking Claude for places that fit your budget… this can take up to a minute.'; }
  else if (tab === 'insights' && advice.data) { pose = advice.data.pose; speech = advice.data.headline; }
  else if (tab === 'daily') { if (daily.data) { pose = daily.data.pose; speech = daily.data.message; } else { pose = 'coin'; speech = `Slide to choose how much of your wallet to spend today. You have SAR ${balance.toLocaleString('en-US')}.`; } }
  else if (tab === 'hangout') { if (hangout.data) { pose = hangout.data.pose; speech = hangout.data.message; } else { pose = 'places'; speech = "Pick your group and your budget. I'll plan around the smallest budget so nobody feels awkward."; } }

  const group = groups.data?.find(g => g.id === groupId);
  return <><DetailHeader title="AI Analyst" fallback="/" /><div className="detail-content analyst-content">
    <section className="analyst-hero" aria-live="polite"><AnalystSprite pose={pose} /><p className="analyst-bubble">{speech}</p></section>
    <div className="filter-tabs" role="tablist" aria-label="Analyst sections">{tabs.map(t => <button key={t.id} role="tab" aria-selected={tab === t.id} aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>)}</div>

    {tab === 'insights' && <>
      {advice.error && <ErrorState message={advice.error} onRetry={fetchAdvice} />}
      {insights.error ? <ErrorState message={insights.error} onRetry={fetchInsights} /> : insights.data ? <InsightsView data={insights.data} tips={advice.data?.tips ?? null} tipsLoading={advice.loading} onPlan={() => { setDayBudget(Math.min(insights.data!.budgets.daily, balance)); setTab('daily'); }} /> : <p className="muted center" role="status">Loading insights…</p>}
    </>}

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
        {group && (() => { const outside = directory.filter(d => !group.members.some(m => m.id === d.id)); return outside.length > 0 && <div className="add-member">
          <label className="sr-only" htmlFor="add-member">Add someone to {group.name}</label>
          <select id="add-member" value={newMember} onChange={e => { setNewMember(e.target.value); setAdding({ busy: false, error: '', done: '' }); }}><option value="">Add someone to {group.name}…</option>{outside.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
          <button type="button" className="secondary-button" onClick={addMember} disabled={!newMember || adding.busy}><UserPlus size={15} />{adding.busy ? 'Adding…' : 'Add'}</button>
        </div>; })()}
        {adding.error && <p className="error-text" role="alert">{adding.error}</p>}
        {adding.done && <p className="success-text" role="status">{adding.done}</p>}
        <BudgetSlider label="Your hangout budget" value={groupBudget} max={balance} onChange={setHangoutBudget} />
        <p className="fine-print">Only you see your budget. Friends see the plan, never each other's numbers.</p>
        <button className="primary-button" onClick={runHangout} disabled={hangout.loading || !groupId}>{hangout.loading ? 'Planning…' : 'Plan the hangout'}</button>
        {hangout.error && <ErrorState message={hangout.error} onRetry={runHangout} />}
        {hangout.data && !hangout.error && <>
          <div className="info-panel per-person"><p>Budget per person everyone can manage</p><Money amount={hangout.data.perPersonBudget} />{hangout.data.pending.length > 0 && <p className="fine-print">Planned without {hangout.data.pending.join(', ')}: no budget set yet.</p>}</div>
          <PlanView items={hangout.data.items} footer={<><div><span>Per person</span><Money amount={hangout.data.perPersonTotal} /></div><div><span>Whole group ({hangout.data.groupSize})</span><Money amount={hangout.data.groupTotal} /></div></>} />
          {hangout.data.items.some(i => i.place) && hangout.data.group.id === groupId && <button type="button" className="primary-button" onClick={askGroup} disabled={asking.busy}>{asking.busy ? 'Starting the vote…' : "Ask the group: who's paying?"}</button>}
          {asking.error && <p className="error-text" role="alert">{asking.error}</p>}
        </>}
        <section className="analyst-section"><h3>Who's paying? Group votes</h3><p className="fine-print">One "I will pay it" pays. Two or more play Flappy Bird and the highest score pays. Otherwise the most votes win, and a tie means everyone pays their own.</p><HangoutVotes hangouts={hangouts.data} error={hangouts.error} onRetry={() => void fetchHangouts()} onChange={() => void fetchHangouts()} /></section>
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

function InsightsView({ data, tips, tipsLoading, onPlan }: { data: Insights; tips: string[] | null; tipsLoading: boolean; onPlan: () => void }) {
  const max = Math.max(1, ...data.byCategory.map(c => c.amount));
  return <>
    <div className="insight-grid"><div><span>Today</span><Money amount={data.summary.today} /></div><div><span>This week</span><Money amount={data.summary.week} /></div><div><span>30 days</span><Money amount={data.summary.month} /></div></div>
    <div className="info-panel"><h3>Suggested budgets</h3><div className="insight-grid flat"><div><span>Daily</span><Money amount={data.budgets.daily} /></div><div><span>Weekly</span><Money amount={data.budgets.weekly} /></div><div><span>Monthly</span><Money amount={data.budgets.monthly} /></div></div>{data.summary.balanceDays != null && <p>At your usual SAR {Math.round(data.summary.avgDaily)} a day, your balance lasts about {data.summary.balanceDays} days.</p>}<button className="primary-button" onClick={onPlan}>Plan today with this budget</button></div>
    {data.alerts.length > 0 && <section className="analyst-section"><h3>Watch out</h3>{data.alerts.map(alert => <p key={alert.message} className="alert-item"><AlertTriangle size={16} />{alert.message}</p>)}</section>}
    {data.subscriptions.length > 0 && <section className="analyst-section"><h3>Upcoming subscriptions</h3>{data.subscriptions.map(sub => <div key={sub.seller} className={`sub-item ${sub.daysLeft <= 7 ? 'soon' : ''}`}><CalendarClock size={16} /><span>{sub.seller}</span><small>{sub.daysLeft === 0 ? 'Today' : sub.daysLeft === 1 ? 'Tomorrow' : `In ${sub.daysLeft} days`}</small><Money amount={sub.amount} /></div>)}</section>}
    <section className="analyst-section"><h3>Where your money went (30 days)</h3><div className="spending-bars">{data.byCategory.map((c, i) => <div key={c.id}><span>{c.name}</span><div><i style={{ width: `${Math.max(4, (c.amount / max) * 100)}%`, background: ['#f8db4c', '#bce1e5', '#d5cee7'][i % 3] }} /></div><Money amount={c.amount} /></div>)}</div></section>
    <section className="analyst-section"><h3>Tips from your AI Analyst</h3>{tips ? <ul className="tip-list">{tips.map(tip => <li key={tip}>{tip}</li>)}</ul> : <p className="muted">{tipsLoading ? 'Claude is writing your tips…' : 'Tips are not available right now.'}</p>}</section>
  </>;
}
