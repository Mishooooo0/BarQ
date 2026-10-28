import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CheckCircle2, ChevronRight, Headset, LogOut, Sparkles, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { useSheet } from '../../hooks/useSheet';
import { useWallet, type TransferChannel } from '../../app/WalletProvider';
import { useSession } from '../../app/SessionProvider';
import { cards, categories } from '../../data/mock';
import { categoryNames, initials } from '../../lib/format';
import { errorMessage } from '../../lib/api';
import { MockNote, IconButton, Money } from '../ui/Primitives';
import { PaymentDone } from '../PaymentDone';
import type { SheetName } from '../../types';

const titles: Record<SheetName, string> = { account: 'Your account', 'account-switch': 'Your accounts', notifications: 'Notifications', statistics: 'Your statistics', savings: 'Your total savings', 'add-money': 'Add money', 'add-card': 'Add a card', help: 'Rewards help', support: 'Customer support', 'transfer-wallet': 'Transfer to barq wallet', 'request-money': 'Money Requests', international: 'International Transfer', 'local-bank': 'Local Bank Transfer', baloot: 'Baloot Beta', 'new-account': 'Youth Accounts', promotion: 'barq Marathon', categories: 'Categories', salary: 'Domestic Labor Salaries', offers: 'Offers' };
export function AppSheet() {
  const { sheet, close } = useSheet(); const dialog = useRef<HTMLDialogElement>(null); const previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (sheet && dialog.current && !dialog.current.open) { previousFocus.current = document.activeElement as HTMLElement; dialog.current.showModal(); }
    if (!sheet && dialog.current?.open) { dialog.current.close(); previousFocus.current?.focus(); }
  }, [sheet]);
  return <dialog ref={dialog} className="app-dialog" aria-labelledby="sheet-title" onCancel={e => { e.preventDefault(); close(); }} onKeyDown={e => {
    if (e.key !== 'Tab') return;
    const controls = [...e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex="0"]')].filter(el => el.getClientRects().length > 0);
    const first = controls[0]; const last = controls.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
  }} onClick={e => { if (e.target === dialog.current) close(); }}><motion.div className="sheet-content" key={sheet} initial={{ y: 25, opacity: .6 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: .2 }}><div className="sheet-handle" /><header className="sheet-header"><h2 id="sheet-title">{sheet ? titles[sheet] ?? '' : ''}</h2><IconButton label="Close dialog" className="light" onClick={close}><X size={20} /></IconButton></header>{sheet && <SheetBody key={sheet} sheet={sheet} close={close} />}<MockNote /></motion.div></dialog>;
}
function SheetBody({ sheet, close }: { sheet: SheetName; close: () => void }) {
  const { state, user, directory } = useWallet(); const { signOut } = useSession(); const navigate = useNavigate();
  const [done, setDone] = useState(false); const [choice, setChoice] = useState('');
  if (['add-money', 'transfer-wallet', 'request-money', 'international', 'local-bank'].includes(sheet)) return <MoneyForm sheet={sheet} />;
  if (sheet === 'account' || sheet === 'account-switch') return <><div className="account-summary"><span className="avatar">{initials(user.name)}</span><div><h3>{user.name}</h3><p>Individual account · {user.id.toUpperCase()}</p></div></div><div className="info-panel"><p>Available balance</p><Money amount={state.balance} /></div>{sheet === 'account-switch' ? <><button className="selection-row" onClick={close}><span>Individual account</span><CheckCircle2 size={20} /></button><button className="selection-row" onClick={signOut}><span>Switch to another account</span><ChevronRight size={18} /></button></> : <><p className="muted">Your balance and activity are saved on the BarQ server.</p><button className="secondary-button" onClick={signOut}><LogOut size={16} /> Sign out</button></>}</>;
  if (sheet === 'notifications') return <><Link className="notification-item" to="/analyst" replace><Sparkles /><div><h3>Your AI Analyst is ready</h3><p>See where your money went and get a plan for today.</p><small>Just now</small></div></Link><div className="notification-item"><CheckCircle2 /><div><h3>Welcome, {user.name}</h3><p>{state.transactions.length ? `You have ${state.transactions.length} transaction${state.transactions.length === 1 ? '' : 's'}.` : 'Your wallet is empty. Add money from Home to get started.'}</p><small>Today</small></div></div></>;
  if (sheet === 'statistics') {
    const recent = state.transactions.filter(t => t.kind === 'shopping' && t.amount < 0 && t.category);
    const ids = Object.keys(categoryNames) as (keyof typeof categoryNames)[];
    const totals = ids.map(id => ({ id, amount: recent.filter(t => t.category === id).reduce((s, t) => s - t.amount, 0) })).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount);
    const spending = totals.reduce((s, c) => s + c.amount, 0);
    return <><p className="muted">Spending by category</p><div className="stat-total"><Money amount={spending} /></div>{!totals.length && <p className="muted">No spending yet.</p>}<div className="spending-bars">{totals.map((c, i) => <div key={c.id}><span>{categoryNames[c.id]}</span><div><i style={{ width: `${Math.max(4, (c.amount / Math.max(spending, 1)) * 100)}%`, background: ['#f8db4c', '#bce1e5', '#d5cee7'][i % 3] }} /></div><Money amount={c.amount} /></div>)}</div><Link className="primary-button" to="/analyst" replace>Ask the AI Analyst</Link></>;
  }
  if (sheet === 'savings') return <><div className="savings-value"><Money amount={state.savings} /></div><p className="muted">Savings are kept separate from your available balance. You have no savings goal yet.</p></>;
  if (sheet === 'help') return <div className="help-list"><h3>How do rewards work?</h3><p>Explore Spin the Wheel, Quests and the barq Marathon from Rewards.</p><h3>Are these real prizes?</h3><p>No. Spins and entries are simulated. The wheel gives one SAR 5 cashback reward per sign-in.</p><h3>Where does the cashback go?</h3><p>It is added to your wallet balance and your cashback total.</p></div>;
  if (sheet === 'add-card') return <><p className="muted">Explore the card designs included in this prototype.</p>{cards.map(card => <button className="selection-row" key={card.id} onClick={() => navigate(`/cards/${card.id}`, { replace: true })}><span className="color-chip" style={{ background: card.color }} /><span>{card.name}</span><ChevronRight size={18} /></button>)}<p className="fine-print">All three cards are already available. This flow cannot issue real cards.</p></>;
  if (sheet === 'support') return <><div className="support-intro"><Headset /><h3>How can we help?</h3><p>Choose a topic for a quick answer.</p></div>{['My card is not working', 'Where is my transfer?', 'About this prototype'].map(topic => <button key={topic} className="selection-row" onClick={() => setChoice(topic)}>{topic}<ChevronRight size={18} /></button>)}{choice && <div className="info-panel" role="status"><h3>{choice}</h3><p>{choice === 'My card is not working' ? 'Check the Freeze card setting under Cards.' : choice === 'Where is my transfer?' ? 'Open Transactions from Home to see your transfers. Wallet transfers arrive instantly.' : 'This is an independent prototype with mock accounts. It is not operated by or affiliated with barq.'}</p></div>}</>;
  if (sheet === 'categories') return <>{categories.map(category => <Link className="selection-row" to={`/market/category/${category.id}`} replace key={category.id}>{category.name}<ChevronRight size={18} /></Link>)}</>;
  if (sheet === 'promotion') return <><div className="marathon-detail"><h3>Your ranking</h3><p>No ranking yet · 0 points</p><span>Join the marathon to start collecting points</span></div><Link className="primary-button" replace to="/rewards/marathon">Explore marathon</Link></>;
  if (sheet === 'new-account') return <><div className="empty-state"><h2>No youth accounts yet</h2><p>Youth accounts you open will appear here.</p></div><p className="fine-print">No account is opened and no child's personal information is collected.</p><button className="primary-button" onClick={close}>Done</button></>;
  if (sheet === 'salary') return <><div className="empty-state"><h2>No salary payees yet</h2><p>Domestic workers you add will appear here with their monthly salary.</p></div><button className="primary-button" onClick={close}>Done</button></>;
  if (sheet === 'offers') return <><p className="muted">Explore the rewards available in this prototype.</p><Link className="selection-row" replace to="/rewards/marathon">barq Marathon<ChevronRight size={18} /></Link><Link className="selection-row" replace to="/rewards/wheel">Spin the Wheel<ChevronRight size={18} /></Link><Link className="selection-row" replace to="/rewards/quests">Quests<ChevronRight size={18} /></Link><p className="fine-print">These are simulated experiences, not live offers or guaranteed rewards.</p></>;
  if (sheet === 'baloot') { const friends = directory.slice(0, 3).map(f => f.name); return <><div className="baloot-hand" aria-hidden="true"><span>J<br />♠</span><span>Q<br />♥</span><span>K<br />♠</span><span>A<br />♥</span></div><h3 className="center">A seat at the table</h3><p className="center muted">Open the lobby for a friendly Baloot game.</p><button className="primary-button" onClick={() => setDone(true)} disabled={done}>{done ? 'Table ready' : 'Find a table'}</button>{done && <div className="success-panel" role="status"><p>You{friends.length ? `, ${friends.join(', ')}` : ''} are seated. Gameplay is coming soon.</p></div>}</>; }
  return <p className="muted">This feature is not available yet.</p>;
}
const channels: Partial<Record<SheetName, TransferChannel>> = { 'transfer-wallet': 'wallet', 'local-bank': 'local', international: 'international' };
function MoneyForm({ sheet }: { sheet: SheetName }) {
  const { state, directory, topUp, transfer } = useWallet();
  const [amount, setAmount] = useState(''); const [recipientId, setRecipientId] = useState(''); const [stage, setStage] = useState<'form' | 'review' | 'done'>('form'); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const recipient = directory.find(d => d.id === recipientId) ?? directory[0];
  const isTopup = sheet === 'add-money'; const isRequest = sheet === 'request-money'; const value = Number(amount); const valid = Number.isFinite(value) && value > 0 && value <= 10000 && Math.abs(value * 100 - Math.round(value * 100)) < .00001;
  const submit = (e: FormEvent) => { e.preventDefault(); if (!valid) { setError('Enter an amount from SAR 0.01 to SAR 10,000, with up to two decimals.'); return; } if (!isTopup && !recipient) { setError('No recipients are available right now.'); return; } if (!isTopup && !isRequest && value > state.balance) { setError('Not enough balance. Try a smaller amount.'); return; } setError(''); setStage('review'); };
  const confirm = async () => {
    setBusy(true); setError('');
    try {
      if (isTopup) await topUp(value);
      else if (!isRequest && recipient) await transfer(recipient.id, value, channels[sheet] ?? 'wallet');
      setStage('done');
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  };
  const noun = isRequest ? 'request' : isTopup ? 'top-up' : 'transfer';
  // A transfer is a payment, so Barq celebrates it; top-ups and requests use the plain panel.
  if (stage === 'done' && !isTopup && !isRequest) return <PaymentDone title="Transfer complete"><Money amount={value} /><p>{isRequest ? `A request for ${recipient?.name} is ready. No message was sent.` : isTopup ? 'Your balance and transaction history have been updated.' : `${recipient?.name} has received the money.`}</p><button className="secondary-button" onClick={() => { setStage('form'); setAmount(''); }}>Make another</button></PaymentDone>;
  if (stage === 'done') return <div className="success-panel" role="status"><CheckCircle2 /><h3>{isRequest ? 'Request created' : isTopup ? 'Money added' : 'Transfer complete'}</h3><Money amount={value} /><p>{isRequest ? `A request for ${recipient?.name} is ready. No message was sent.` : isTopup ? 'Your balance and transaction history have been updated.' : `${recipient?.name} has received the money.`}</p><button className="secondary-button" onClick={() => { setStage('form'); setAmount(''); }}>Make another</button></div>;
  if (stage === 'review') return <><h3>Review your {noun}</h3><div className="review-amount"><Money amount={value} /></div><div className="info-panel"><p>{isTopup ? 'From: Linked bank account' : `To: ${recipient?.name}`}</p><p>{sheet === 'international' ? 'Route: International transfer' : sheet === 'local-bank' ? 'Route: Local bank transfer' : 'Account: barq wallet'}</p><p>Fee: SAR 0.00</p></div>{error && <p className="error-text" role="alert">{error}</p>}<button className="primary-button" onClick={confirm} disabled={busy}>{busy ? 'Working…' : `Confirm ${noun}`}</button><button className="text-button" onClick={() => setStage('form')} disabled={busy}>Edit amount</button></>;
  return <form onSubmit={submit} noValidate><p className="muted">{isTopup ? 'Add money to your barq wallet.' : isRequest ? 'Ask a friend to send you money.' : 'Send money to another barq user.'}</p>{!isTopup && <label className="field-label">Recipient<select value={recipient?.id ?? ''} onChange={e => setRecipientId(e.target.value)}>{directory.map(contact => <option key={contact.id} value={contact.id}>{contact.name}</option>)}</select></label>}<label className="field-label">Amount (SAR)<input autoComplete="off" type="text" inputMode="decimal" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} aria-invalid={!!error} aria-describedby={error ? 'amount-error' : undefined} /></label><div className="amount-options">{[50, 100, 500].map(n => <button type="button" key={n} onClick={() => { setAmount(String(n)); setError(''); }}>SAR {n}</button>)}</div><p className="fine-print">Available balance: <Money amount={state.balance} /></p>{error && <p className="error-text" id="amount-error" role="alert">{error}</p>}<button className="primary-button" type="submit">Review {noun}</button></form>;
}
