import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { AlertTriangle, CalendarClock, ChevronRight } from 'lucide-react';
import { useWallet } from '../../app/WalletProvider';
import { AI_TIMEOUT_MS, api } from '../../lib/api';
import { DetailHeader, ErrorState, MockNote, Money } from '../../components/ui/Primitives';
import { AnalystSprite } from './AnalystSprite';
import { AnsweredBy, BudgetSlider, PlanView, useRequest, wholeRiyals } from './parts';
import type { Advice, DailyPlan, Insights, Pose } from '../../types/api';
import { digits, sar, t, tp } from '../../i18n';
import { alertText, categoryName, sellerText } from '../../i18n/data';

type Tab = 'insights' | 'daily';
const tabs = (): { id: Tab; label: string }[] => [{ id: 'insights', label: t('Insights') }, { id: 'daily', label: t('Daily plan') }];

export function Analyst() {
  const { state: wallet } = useWallet();
  const balance = wholeRiyals(wallet.balance);
  const [tab, setTab] = useState<Tab>('insights');
  const [insights, loadInsights] = useRequest<Insights>();
  const [advice, loadAdvice] = useRequest<Advice>();
  const [daily, planDay] = useRequest<DailyPlan>();
  const [dayBudget, setDayBudget] = useState<number | null>(null);

  const fetchInsights = useCallback(() => loadInsights(() => api<Insights>('/api/analyst/insights')), [loadInsights]);
  const fetchAdvice = useCallback(() => loadAdvice(() => api<Advice>('/api/analyst/advice', { timeoutMs: AI_TIMEOUT_MS })), [loadAdvice]);
  useEffect(() => { void fetchInsights(); void fetchAdvice(); }, [fetchInsights, fetchAdvice]);
  // The budget can never exceed what is in the wallet, including after the balance changes.
  const budget = Math.min(dayBudget ?? insights.data?.budgets.daily ?? 100, balance);
  const runDaily = () => planDay(() => api<DailyPlan>('/api/analyst/daily', { method: 'POST', body: { budget }, timeoutMs: AI_TIMEOUT_MS }));

  let pose: Pose = 'think'; let speech = t('Let me look at your spending…');
  const current = tab === 'insights' ? advice : daily;
  if (current.error) { pose = 'think'; speech = current.error; }
  else if (current.loading) { pose = 'laptop'; speech = tab === 'insights' ? t('Reading your spending… this can take up to a minute.') : t('Finding places that fit your budget… this can take up to a minute.'); }
  else if (tab === 'insights' && advice.data) { pose = advice.data.pose; speech = digits(advice.data.headline); }
  else if (tab === 'daily') { if (daily.data) { pose = daily.data.pose; speech = digits(daily.data.message); } else { pose = 'coin'; speech = t('Slide to choose how much of your wallet to spend today. You have {amount}.', { amount: sar(balance) }); } }

  return <><DetailHeader title={t('AI Analyst')} fallback="/" /><div className="detail-content analyst-content">
    <section className="analyst-hero" aria-live="polite"><AnalystSprite pose={pose} /><p className="analyst-bubble">{speech}</p></section>
    <div className="filter-tabs" role="tablist" aria-label={t('Analyst sections')}>{tabs().map(t => <button key={t.id} role="tab" aria-selected={tab === t.id} aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>)}</div>

    {tab === 'insights' && <>
      {advice.error && <ErrorState message={advice.error} onRetry={fetchAdvice} />}
      {insights.error ? <ErrorState message={insights.error} onRetry={fetchInsights} /> : insights.data ? <InsightsView data={insights.data} advice={advice.data} tipsLoading={advice.loading} onPlan={() => { setDayBudget(Math.min(insights.data!.budgets.daily, balance)); setTab('daily'); }} /> : <p className="muted center" role="status">{t('Loading insights…')}</p>}
    </>}

    {tab === 'daily' && <>
      <BudgetSlider label={t("Today's budget")} value={budget} max={balance} onChange={setDayBudget} />
      <button className="primary-button" onClick={runDaily} disabled={daily.loading}>{daily.loading ? t('Planning…') : daily.data && daily.data.budget !== budget ? t('Update my plan') : t('Plan my day')}</button>
      {daily.error && <ErrorState message={daily.error} onRetry={runDaily} />}
      {daily.data && !daily.error && <><PlanView items={daily.data.items} footer={<><div><span>{t('Planned')}</span><Money amount={daily.data.total} /></div><div><span>{t('Stays in wallet')}</span><Money amount={daily.data.remaining} /></div></>} /><AnsweredBy info={daily.data} /></>}
    </>}

    <Link className="analyst-card hangouts-link" to="/hangouts"><AnalystSprite pose="places" /><div><strong>{t('Hangouts')}</strong><span>{t('Plan with your group and vote on who pays')}</span></div><ChevronRight size={20} /></Link>
    <MockNote />
  </div></>;
}

function InsightsView({ data, advice, tipsLoading, onPlan }: { data: Insights; advice: Advice | null; tipsLoading: boolean; onPlan: () => void }) {
  const max = Math.max(1, ...data.byCategory.map(c => c.amount));
  return <>
    <div className="insight-grid"><div><span>{t('Today')}</span><Money amount={data.summary.today} /></div><div><span>{t('This week')}</span><Money amount={data.summary.week} /></div><div><span>{t('30 days')}</span><Money amount={data.summary.month} /></div></div>
    <div className="info-panel"><h3>{t('Suggested budgets')}</h3><div className="insight-grid flat"><div><span>{t('Daily')}</span><Money amount={data.budgets.daily} /></div><div><span>{t('Weekly')}</span><Money amount={data.budgets.weekly} /></div><div><span>{t('Monthly')}</span><Money amount={data.budgets.monthly} /></div></div>{data.summary.balanceDays != null && <p>{tp(data.summary.balanceDays, 'At your usual {amount} a day, your balance lasts about {n} day.', 'At your usual {amount} a day, your balance lasts about {n} days.', { amount: sar(Math.round(data.summary.avgDaily)) })}</p>}<button className="primary-button" onClick={onPlan}>{t('Plan today with this budget')}</button></div>
    {data.alerts.length > 0 && <section className="analyst-section"><h3>{t('Watch out')}</h3>{data.alerts.map(alert => <p key={alert.message} className="alert-item"><AlertTriangle size={16} />{alertText(alert)}</p>)}</section>}
    {data.subscriptions.length > 0 && <section className="analyst-section"><h3>{t('Upcoming subscriptions')}</h3>{data.subscriptions.map(sub => <div key={sub.seller} className={`sub-item ${sub.daysLeft <= 7 ? 'soon' : ''}`}><CalendarClock size={16} /><span><bdi>{sellerText(sub.seller)}</bdi></span><small>{sub.daysLeft === 0 ? t('Today') : sub.daysLeft === 1 ? t('Tomorrow') : tp(sub.daysLeft, 'In {n} day', 'In {n} days')}</small><Money amount={sub.amount} /></div>)}</section>}
    <section className="analyst-section"><h3>{t('Where your money went (30 days)')}</h3>{data.byCategory.length ? <div className="spending-bars">{data.byCategory.map((c, i) => <div key={c.id}><span>{categoryName(c.id)}</span><div><i style={{ width: `${Math.max(4, (c.amount / max) * 100)}%`, background: ['#f8db4c', '#bce1e5', '#d5cee7'][i % 3] }} /></div><Money amount={c.amount} /></div>)}</div> : <p className="muted">{t('No spending yet.')}</p>}</section>
    <section className="analyst-section"><h3>{t('Tips from Barq')}</h3>{advice ? <><ul className="tip-list">{advice.tips.map(tip => <li key={tip}>{digits(tip)}</li>)}</ul><AnsweredBy info={advice} /></> : <p className="muted">{tipsLoading ? t('Barq is writing your tips…') : t('Tips are not available right now.')}</p>}</section>
  </>;
}
