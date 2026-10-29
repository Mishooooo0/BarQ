import { useEffect, useRef, useState } from 'react';
import { ArrowLeftRight, Car, Check, CheckCircle2, ChevronRight, Clapperboard, Coffee, CreditCard, HeartPulse, PiggyBank, Plus, ShieldCheck, ShoppingBag, ShoppingBasket, Snowflake, Sparkles, Trophy, UnlockKeyhole, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { motion, useReducedMotion } from 'motion/react';
import { useWallet } from '../../app/WalletProvider';
import { errorMessage } from '../../lib/api';
import { cards } from '../../data/mock';
import { CardArtwork } from '../Cards/Cards';
import { Artwork } from '../../components/ui/Artwork';
import { MockNote, DetailHeader, EmptyState, ErrorState, Money } from '../../components/ui/Primitives';
import type { Transaction } from '../../types';
import type { CategoryId } from '../../types/api';
import { digits, sar, t, tp } from '../../i18n';

const categoryIcons: Record<CategoryId, LucideIcon> = { food: UtensilsCrossed, cafe: Coffee, health: HeartPulse, shopping: ShoppingBag, groceries: ShoppingBasket, transportation: Car, entertainment: Clapperboard };
const kindIcons: Record<Transaction['kind'], LucideIcon> = { shopping: ShoppingBag, transfer: ArrowLeftRight, cashback: Sparkles, topup: Plus, savings: PiggyBank };
/** Purchases show their category; everything else shows what kind of money movement it was. */
function TransactionIcon({ item }: { item: Transaction }) {
  const Icon = (item.kind === 'shopping' && item.category ? categoryIcons[item.category] : null) ?? kindIcons[item.kind] ?? ShoppingBag;
  return <Icon aria-hidden="true" />;
}

export function TransactionList({ items }: { items: Transaction[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return <div className="transaction-list">{items.map(item => <div key={item.id}><button className="transaction-row" aria-expanded={expanded === item.id} onClick={() => setExpanded(expanded === item.id ? null : item.id)}><span className={`transaction-icon ${item.amount > 0 ? 'positive' : ''}`}><TransactionIcon item={item} /></span><span className="transaction-copy"><strong><bdi>{item.title}</bdi></strong><small>{item.date}</small></span><span className={item.amount > 0 ? 'positive-text' : ''}>{item.amount > 0 ? '+' : '−'}<Money amount={Math.abs(item.amount)} /></span></button>{expanded === item.id && <div className="transaction-receipt"><p>{item.subtitle}</p><p>{t('Status: Completed')}</p><small>{t('Reference:')} <span dir="ltr">{item.id.toUpperCase()}</span></small></div>}</div>)}</div>;
}
export function Transactions() {
  const { state, history, refresh } = useWallet(); const [filter, setFilter] = useState<'all' | 'in' | 'out'>('all');
  const items = state.transactions.filter(item => filter === 'all' || (filter === 'in' ? item.amount > 0 : item.amount < 0));
  const filters = [{ id: 'all', label: t('All') }, { id: 'in', label: t('Money in') }, { id: 'out', label: t('Money out') }] as const;
  return <><DetailHeader title={t('Transactions')} fallback="/" /><div className="detail-content"><div className="filter-tabs" aria-label={t('Transaction filters')}>{filters.map(f => <button key={f.id} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</button>)}</div>{history.error ? <ErrorState message={history.error} onRetry={() => void refresh()} /> : history.loading && !state.transactions.length ? <p className="muted center" role="status">{t('Loading your activity…')}</p> : items.length ? <TransactionList items={items} /> : <EmptyState title={t('No transactions')}>{t('Nothing to show for this filter yet.')}</EmptyState>}<MockNote /></div></>;
}
export function CardDetail() {
  const { id } = useParams(); const card = cards.find(c => c.id === id); const { state, dispatch, user } = useWallet(); const [details, setDetails] = useState(false); const [limit, setLimit] = useState(1500);
  if (!card) return <><DetailHeader title={t('Card not found')} fallback="/cards" /><EmptyState title={t("This card isn't available")}>{t('Choose one of the three cards from Your Cards.')}</EmptyState></>;
  const frozen = state.frozen.includes(card.id);
  return <><DetailHeader title={t('Manage card')} fallback="/cards" /><div className="detail-content"><div className={`management-card ${frozen ? 'frozen' : ''}`}><CardArtwork id={card.id} />{frozen && <span className="frozen-badge"><Snowflake size={15} /> {t('Frozen')}</span>}</div><h2 className="detail-title">{t(card.name)}</h2><p className="center muted">{t('Card ending {last4}', { last4: digits(card.last4) })}</p><div className="management-actions"><button onClick={() => dispatch({ type: 'freeze', id: card.id })} aria-pressed={frozen}>{frozen ? <UnlockKeyhole /> : <Snowflake />}<span>{frozen ? t('Unfreeze card') : t('Freeze card')}</span></button><button onClick={() => setDetails(!details)} aria-expanded={details}><CreditCard /><span>{t('Card details')}</span></button></div>{details && <div className="info-panel"><h3>{t('Card details')}</h3><p>{t('Cardholder: {name}', { name: user.name })}</p><p>{t('Display identifier:')} <span dir="ltr">BARQ-{card.last4}</span></p><p>{t('No card number, expiry or security code is stored.')}</p></div>}<div className="info-panel"><div className="flex items-center justify-between gap-2"><h3>{t('Monthly spending limit')}</h3><Money amount={limit} /></div><label className="sr-only" htmlFor="spending-limit">{t('Monthly spending limit')}</label><input id="spending-limit" type="range" min="500" max="5000" step="100" value={limit} onChange={e => setLimit(Number(e.target.value))} /><p>{t('Changes apply to this prototype only.')}</p></div><div className="info-line"><ShieldCheck /><span>{frozen ? t('Payments are paused for this card.') : t('Your card is active.')}</span></div><h3 className="detail-section-heading">{t('Recent activity')}</h3><TransactionList items={state.transactions.filter(t => t.kind === 'shopping').slice(0, 2)} /><MockNote /></div></>;
}
export function RewardDetail() {
  const { id } = useParams(); const { state, dispatch, cashbackReward } = useWallet(); const [spinning, setSpinning] = useState(false); const [won, setWon] = useState(false); const [spinError, setSpinError] = useState(''); const reduced = useReducedMotion(); const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const spin = () => {
    if (!state.spins || spinning) return;
    setSpinning(true); setSpinError('');
    timer.current = setTimeout(async () => {
      try { await cashbackReward(5, 'Spin the Wheel reward'); dispatch({ type: 'use-spin' }); setWon(true); }
      catch (e) { setSpinError(errorMessage(e)); }
      finally { setSpinning(false); }
    }, reduced ? 0 : 2200);
  };
  const title = id === 'wheel' ? t('Spin the Wheel') : id === 'quests' ? t('Quests') : id === 'marathon' ? t('barq Marathon') : t('Reward not found');
  return <><DetailHeader title={title} fallback="/rewards" /><div className="detail-content">{id === 'wheel' ? <><div className="wheel-stage"><span className="wheel-pointer" /><motion.div animate={{ rotate: spinning || won ? 1440 : 0 }} transition={{ duration: reduced ? 0 : 2.2, ease: [.12, .7, .1, 1] }}><Artwork source="rewards" region={[77, 410, 112, 117]} /></motion.div></div><h2 className="detail-title">{t('A little spin. A little surprise.')}</h2><p className="center muted">{tp(state.spins, '{n} spin available', '{n} spins available')}</p><button className="primary-button" disabled={!state.spins || spinning} onClick={spin}>{spinning ? t('Spinning…') : state.spins ? t('Spin the wheel') : t('Spin used')}</button><div aria-live="polite">{won && <div className="success-panel"><CheckCircle2 /><h3>{t('You won {amount} in cashback!', { amount: sar(5) })}</h3><p>{t('Your balance and cashback total have been updated.')}</p></div>}{spinError && <p className="error-text" role="alert">{spinError}</p>}</div><p className="fine-print">{t('The wheel always awards {amount}. No real prize or purchase is involved.', { amount: sar(5) })}</p></> : id === 'quests' ? <><Artwork source="rewards" region={[53, 592, 161, 162]} className="quest-hero" /><h2 className="detail-title">{t('Small steps, more rewards')}</h2><p className="center muted">{t('Explore the app to complete your quests.')}</p>{[{ id: 'explore', title: t('Explore the Market'), description: t('Find a gift card you like'), link: '/market' }, { id: 'cards', title: t('Meet your cards'), description: t('Explore your card collection'), link: '/cards' }].map(quest => <div className="quest-item" key={quest.id}><div><h3>{quest.title}</h3><p>{quest.description}</p></div>{state.completedQuests.includes(quest.id) ? <span className="quest-done"><Check /> {t('Done')}</span> : <Link to={quest.link} onClick={() => dispatch({ type: 'quest', id: quest.id })}>{t('Explore')} <ChevronRight size={16} /></Link>}</div>)}</> : id === 'marathon' ? <><div className="marathon-detail"><Trophy /><h2>{t('barq Marathon')}</h2><p>{t('VIP experiences. A little everyday excitement.')}</p><span>{t('Rewards event · Ends in {hours}h {minutes}m', { hours: 23, minutes: 19 })}</span></div><div className="info-panel"><h3>{t('Your journey')}</h3><p>{t('Explore the app and collect entries in this simulated rewards event.')}</p><div className="progress-track"><span style={{ width: state.joined ? '33%' : '0%' }} /></div><p>{state.joined ? t('{done} of {total} milestones complete', { done: 1, total: 3 }) : t('Join to start your journey')}</p></div><button className="primary-button" onClick={() => dispatch({ type: 'join' })} disabled={state.joined}>{state.joined ? t('You’re on the list') : t('Join the marathon')}</button>{state.joined && <p className="success-text" role="status">{t('Your entry is confirmed. No real prize draw was entered.')}</p>}</> : <EmptyState title={t('Reward not found')}>{t('Return to Rewards to see what is available.')}</EmptyState>}<MockNote /></div></>;
}
