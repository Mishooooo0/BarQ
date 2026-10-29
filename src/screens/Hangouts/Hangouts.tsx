import { useCallback, useEffect, useState } from 'react';
import { UserPlus, Users } from 'lucide-react';
import { useWallet } from '../../app/WalletProvider';
import { useSession } from '../../app/SessionProvider';
import { AI_TIMEOUT_MS, api, errorMessage } from '../../lib/api';
import { DetailHeader, ErrorState, MockNote, Money } from '../../components/ui/Primitives';
import { AnalystSprite } from '../Analyst/AnalystSprite';
import { AnsweredBy, BudgetSlider, PlanView, useRequest, wholeRiyals } from '../Analyst/parts';
import { HangoutVotes } from './HangoutVotes';
import { PaymentDone } from '../../components/PaymentDone';
import type { Group, Hangout, HangoutPlan, Pose } from '../../types/api';
import { digits, t } from '../../i18n';

/** Hangouts: your groups, the AI plan for an outing, and the group's "who pays?" votes. */
export function Hangouts() {
  const { state: wallet, user, directory } = useWallet(); const { setUser } = useSession();
  const balance = wholeRiyals(wallet.balance);
  const [plan, planHangout] = useRequest<HangoutPlan>();
  const [groups, loadGroups] = useRequest<Group[]>();
  const [hangouts, loadHangouts] = useRequest<Hangout[]>();
  const [asking, setAsking] = useState<{ busy: boolean; error: string }>({ busy: false, error: '' });
  const [budgetChoice, setBudgetChoice] = useState(() => wholeRiyals(user.hangoutBudget ?? 100));
  const [groupId, setGroupId] = useState('');
  const [newMember, setNewMember] = useState('');
  const [adding, setAdding] = useState<{ busy: boolean; error: string; done: string }>({ busy: false, error: '', done: '' });
  const [view, setView] = useState<'active' | 'history'>('active');
  const [paid, setPaid] = useState<number | null>(null);

  const fetchGroups = useCallback(() => loadGroups(() => api<Group[]>('/api/me/groups')), [loadGroups]);
  useEffect(() => { void fetchGroups(); }, [fetchGroups]);
  useEffect(() => { if (!groupId && groups.data?.length) setGroupId(groups.data[0].id); }, [groups.data, groupId]);
  const fetchHangouts = useCallback(() => groupId ? loadHangouts(() => api<Hangout[]>(`/api/hangouts?groupId=${encodeURIComponent(groupId)}`)) : Promise.resolve(), [groupId, loadHangouts]);
  // Friends vote from their own phones, so the list refreshes while this page is open.
  useEffect(() => {
    if (!groupId) return;
    void fetchHangouts();
    const timer = setInterval(() => void fetchHangouts(), 10_000);
    return () => clearInterval(timer);
  }, [groupId, fetchHangouts]);
  // The budget can never exceed what is in the wallet, including after the balance changes.
  const budget = Math.min(budgetChoice, balance);

  const runPlan = () => planHangout(async () => {
    const result = await api<HangoutPlan>('/api/analyst/hangout', { method: 'POST', body: { budget, groupId }, timeoutMs: AI_TIMEOUT_MS });
    setUser({ ...user, hangoutBudget: budget });
    return result;
  });
  const askGroup = async () => {
    if (!plan.data || asking.busy) return;
    setAsking({ busy: true, error: '' });
    try {
      await api<Hangout>('/api/hangouts', { method: 'POST', body: { groupId: plan.data.group.id, items: plan.data.items.filter(i => i.place).map(i => ({ time: i.time, label: i.label, placeId: i.place!.id })) } });
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
      setAdding({ busy: false, error: '', done: t('{name} joined {group}.', { name: updated.members.at(-1)?.name ?? '', group: updated.name }) });
    } catch (error) { setAdding({ busy: false, error: errorMessage(error), done: '' }); }
  };

  let pose: Pose = 'places'; let speech = t("Pick your group and your budget. I'll plan around the smallest budget so nobody feels awkward.");
  if (plan.error) { pose = 'think'; speech = plan.error; }
  else if (plan.loading) { pose = 'laptop'; speech = t('Finding places that fit everyone… this can take up to a minute.'); }
  else if (plan.data) { pose = plan.data.pose; speech = digits(plan.data.message); }

  const group = groups.data?.find(g => g.id === groupId);
  // A hangout ends when everyone who owed has paid; it then moves from Active to History.
  const active = hangouts.data?.filter(h => h.status !== 'settled') ?? null;
  const history = hangouts.data?.filter(h => h.status === 'settled') ?? null;
  const outside = group ? directory.filter(d => !group.members.some(m => m.id === d.id)) : [];
  return <><DetailHeader title={t('Hangouts')} fallback="/" /><div className="detail-content analyst-content">
    <section className="analyst-hero" aria-live="polite"><AnalystSprite pose={pose} /><p className="analyst-bubble">{speech}</p></section>
    {groups.error ? <ErrorState message={groups.error} onRetry={fetchGroups} /> : !groups.data ? <p className="muted center" role="status">{t('Loading groups…')}</p> : !groups.data.length ? <p className="muted">{t('You are not in any group yet.')}</p> : <>
      <div className="group-chips" role="radiogroup" aria-label={t('Group')}>{groups.data.map(g => <button key={g.id} role="radio" aria-checked={g.id === groupId} onClick={() => setGroupId(g.id)}><Users size={14} /> <bdi>{g.name}</bdi></button>)}</div>
      {group && <ul className="member-list" aria-label={t('Members')}>{group.members.map(m => <li key={m.id}><span className={`dot ${m.ready || m.id === user.id ? 'ready' : ''}`} />{m.id === user.id ? t('{name} (you)', { name: m.name }) : m.name}<small>{m.id === user.id ? t('your budget below') : m.ready ? t('budget set') : t('no budget yet')}</small></li>)}</ul>}
      {group && outside.length > 0 && <div className="add-member">
        <label className="sr-only" htmlFor="add-member">{t('Add someone to {group}', { group: group.name })}</label>
        <select id="add-member" value={newMember} onChange={e => { setNewMember(e.target.value); setAdding({ busy: false, error: '', done: '' }); }}><option value="">{t('Add someone to {group}…', { group: group.name })}</option>{outside.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
        <button type="button" className="secondary-button" onClick={addMember} disabled={!newMember || adding.busy}><UserPlus size={15} />{adding.busy ? t('Adding…') : t('Add')}</button>
      </div>}
      {adding.error && <p className="error-text" role="alert">{adding.error}</p>}
      {adding.done && <p className="success-text" role="status">{adding.done}</p>}
      <BudgetSlider label={t('Your hangout budget')} value={budget} max={balance} onChange={setBudgetChoice} />
      <p className="fine-print">{t("Only you see your budget. Friends see the plan, never each other's numbers.")}</p>
      <button className="primary-button" onClick={runPlan} disabled={plan.loading || !groupId}>{plan.loading ? t('Planning…') : t('Plan the hangout')}</button>
      {plan.error && <ErrorState message={plan.error} onRetry={runPlan} />}
      {plan.data && !plan.error && <>
        <div className="info-panel per-person"><p>{t('Budget per person everyone can manage')}</p><Money amount={plan.data.perPersonBudget} />{plan.data.pending.length > 0 && <p className="fine-print">{t('Planned without {names}: no budget set yet.', { names: plan.data.pending.join(t(', ')) })}</p>}</div>
        <PlanView items={plan.data.items} footer={<><div><span>{t('Per person')}</span><Money amount={plan.data.perPersonTotal} /></div><div><span>{t('Whole group ({count})', { count: plan.data.groupSize })}</span><Money amount={plan.data.groupTotal} /></div></>} />
        <AnsweredBy info={plan.data} />
        {plan.data.items.some(i => i.place) && plan.data.group.id === groupId && <button type="button" className="primary-button" onClick={askGroup} disabled={asking.busy}>{asking.busy ? t('Starting the vote…') : t("Ask the group: who's paying?")}</button>}
        {asking.error && <p className="error-text" role="alert">{asking.error}</p>}
      </>}
      <section className="analyst-section"><h3>{t("Who's paying? Group votes")}</h3>
        {paid != null && <PaymentDone title={t('Payment done')}><Money amount={paid} /><p>{t('Paid from your barq wallet and saved in Payments. Once everyone has paid, the hangout moves to History.')}</p><button type="button" className="secondary-button" onClick={() => setPaid(null)}>{t('Done')}</button></PaymentDone>}
        <div className="filter-tabs hangout-tabs" role="tablist" aria-label={t('Hangouts')}>
          <button role="tab" aria-selected={view === 'active'} aria-pressed={view === 'active'} onClick={() => setView('active')}>{active ? t('Active ({count})', { count: active.length }) : t('Active')}</button>
          <button role="tab" aria-selected={view === 'history'} aria-pressed={view === 'history'} onClick={() => setView('history')}>{history ? t('History ({count})', { count: history.length }) : t('History')}</button>
        </div>
        {view === 'active' ? <>
          <p className="fine-print">{t('One "I will pay it" pays. Two or more play Flappy Bird, each on their own phone, and the highest score pays. Otherwise the most votes win, and a tie means everyone pays their own.')}</p>
          <HangoutVotes hangouts={active} error={hangouts.error} onRetry={() => void fetchHangouts()} onChange={() => void fetchHangouts()} onPaid={setPaid} empty={t("No active hangouts. Plan one above, then ask the group who's paying.")} />
        </> : <HangoutVotes hangouts={history} error={hangouts.error} onRetry={() => void fetchHangouts()} onChange={() => void fetchHangouts()} empty={t('Finished hangouts appear here once everyone has paid.')} />}
      </section>
    </>}
    <MockNote />
  </div></>;
}
