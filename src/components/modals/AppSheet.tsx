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
import { latinDigits, sar, t, tp } from '../../i18n';
import { categoryName } from '../../i18n/data';
import { MockNote, IconButton, Money } from '../ui/Primitives';
import { PaymentDone } from '../PaymentDone';
import { LanguageToggle } from '../LanguageToggle';
import { NumberField } from '../NumberField';
import type { SheetName } from '../../types';

const titles: Record<SheetName, () => string> = { account: () => t('Your account'), 'account-switch': () => t('Your accounts'), notifications: () => t('Notifications'), statistics: () => t('Your statistics'), 'add-money': () => t('Add money'), 'add-card': () => t('Add a card'), help: () => t('Rewards help'), support: () => t('Customer support'), 'transfer-wallet': () => t('Transfer to barq wallet'), 'request-money': () => t('Money Requests'), international: () => t('International Transfer'), 'local-bank': () => t('Local Bank Transfer'), baloot: () => t('Baloot Beta'), 'new-account': () => t('Youth Accounts'), promotion: () => t('barq Marathon'), categories: () => t('Categories'), salary: () => t('Domestic Labor Salaries'), offers: () => t('Offers') };
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
  }} onClick={e => { if (e.target === dialog.current) close(); }}><motion.div className="sheet-content" key={sheet} initial={{ y: 25, opacity: .6 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: .2 }}><div className="sheet-handle" /><header className="sheet-header"><h2 id="sheet-title">{sheet ? titles[sheet]?.() ?? '' : ''}</h2><IconButton label={t('Close dialog')} className="light" onClick={close}><X size={20} /></IconButton></header>{sheet && <SheetBody key={sheet} sheet={sheet} close={close} />}<MockNote /></motion.div></dialog>;
}
const supportTopics = () => [
  { id: 'card', title: t('My card is not working'), answer: t('Check the Freeze card setting under Cards.') },
  { id: 'transfer', title: t('Where is my transfer?'), answer: t('Open Transactions from Home to see your transfers. Wallet transfers arrive instantly.') },
  { id: 'about', title: t('About this prototype'), answer: t('This is an independent prototype with mock accounts. It is not operated by or affiliated with barq.') },
];
function SheetBody({ sheet, close }: { sheet: SheetName; close: () => void }) {
  const { state, user, directory } = useWallet(); const { signOut } = useSession(); const navigate = useNavigate();
  const [done, setDone] = useState(false); const [choice, setChoice] = useState('');
  if (['add-money', 'transfer-wallet', 'request-money', 'international', 'local-bank'].includes(sheet)) return <MoneyForm sheet={sheet} />;
  if (sheet === 'account' || sheet === 'account-switch') return <><div className="account-summary"><span className="avatar">{initials(user.name)}</span><div><h3>{user.name}</h3><p>{t('Individual account')}</p></div></div><div className="info-panel"><p>{t('Available balance')}</p><Money amount={state.balance} /></div><div className="selection-row language-row"><span>{t('Language')}</span><LanguageToggle /></div>{sheet === 'account-switch' ? <><button className="selection-row" onClick={close}><span>{t('Individual account')}</span><CheckCircle2 size={20} /></button><button className="selection-row" onClick={signOut}><span>{t('Switch to another account')}</span><ChevronRight size={18} /></button></> : <><p className="muted">{t('Your balance and activity are saved on the barq server.')}</p><button className="secondary-button" onClick={signOut}><LogOut size={16} /> {t('Sign out')}</button></>}</>;
  if (sheet === 'notifications') return <><Link className="notification-item" to="/analyst" replace><Sparkles /><div><h3>{t('Your AI Analyst is ready')}</h3><p>{t('See where your money went and get a plan for today.')}</p><small>{t('Just now')}</small></div></Link><div className="notification-item"><CheckCircle2 /><div><h3>{t('Welcome, {name}', { name: user.name })}</h3><p>{state.transactions.length ? tp(state.transactions.length, 'You have {n} transaction.', 'You have {n} transactions.') : t('Your wallet is empty. Add money from Home to get started.')}</p><small>{t('Today')}</small></div></div></>;
  if (sheet === 'statistics') {
    const recent = state.transactions.filter(tx => tx.kind === 'shopping' && tx.amount < 0 && tx.category);
    const ids = Object.keys(categoryNames) as (keyof typeof categoryNames)[];
    const totals = ids.map(id => ({ id, amount: recent.filter(tx => tx.category === id).reduce((s, tx) => s - tx.amount, 0) })).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount);
    const spending = totals.reduce((s, c) => s + c.amount, 0);
    return <><p className="muted">{t('Spending by category')}</p><div className="stat-total"><Money amount={spending} /></div>{!totals.length && <p className="muted">{t('No spending yet.')}</p>}<div className="spending-bars">{totals.map((c, i) => <div key={c.id}><span>{categoryName(c.id)}</span><div><i style={{ width: `${Math.max(4, (c.amount / Math.max(spending, 1)) * 100)}%`, background: ['#f8db4c', '#bce1e5', '#d5cee7'][i % 3] }} /></div><Money amount={c.amount} /></div>)}</div><Link className="primary-button" to="/analyst" replace>{t('Ask the AI Analyst')}</Link></>;
  }
  if (sheet === 'help') return <div className="help-list"><h3>{t('How do rewards work?')}</h3><p>{t('Explore Spin the Wheel, Quests and the barq Marathon from Rewards.')}</p><h3>{t('Are these real prizes?')}</h3><p>{t('No. Spins and entries are simulated. The wheel gives one {amount} cashback reward per sign-in.', { amount: sar(5) })}</p><h3>{t('Where does the cashback go?')}</h3><p>{t('It is added to your wallet balance and your cashback total.')}</p></div>;
  if (sheet === 'add-card') return <><p className="muted">{t('Explore the card designs included in this prototype.')}</p>{cards.map(card => <button className="selection-row" key={card.id} onClick={() => navigate(`/cards/${card.id}`, { replace: true })}><span className="color-chip" style={{ background: card.color }} /><span>{t(card.name)}</span><ChevronRight size={18} /></button>)}<p className="fine-print">{t('All three cards are already available. This flow cannot issue real cards.')}</p></>;
  if (sheet === 'support') { const topic = supportTopics().find(item => item.id === choice); return <><div className="support-intro"><Headset /><h3>{t('How can we help?')}</h3><p>{t('Choose a topic for a quick answer.')}</p></div>{supportTopics().map(item => <button key={item.id} className="selection-row" onClick={() => setChoice(item.id)}>{item.title}<ChevronRight size={18} /></button>)}{topic && <div className="info-panel" role="status"><h3>{topic.title}</h3><p>{topic.answer}</p></div>}</>; }
  if (sheet === 'categories') return <>{categories.map(category => <Link className="selection-row" to={`/market/category/${category.id}`} replace key={category.id}>{t(category.name)}<ChevronRight size={18} /></Link>)}</>;
  if (sheet === 'promotion') return <><div className="marathon-detail"><h3>{t('Your ranking')}</h3><p>{t('No ranking yet · {points} points', { points: 0 })}</p><span>{t('Join the marathon to start collecting points')}</span></div><Link className="primary-button" replace to="/rewards/marathon">{t('Explore marathon')}</Link></>;
  if (sheet === 'new-account') return <><div className="empty-state"><h2>{t('No youth accounts yet')}</h2><p>{t('Youth accounts you open will appear here.')}</p></div><p className="fine-print">{t("No account is opened and no child's personal information is collected.")}</p><button className="primary-button" onClick={close}>{t('Done')}</button></>;
  if (sheet === 'salary') return <><div className="empty-state"><h2>{t('No salary payees yet')}</h2><p>{t('Domestic workers you add will appear here with their monthly salary.')}</p></div><button className="primary-button" onClick={close}>{t('Done')}</button></>;
  if (sheet === 'offers') return <><p className="muted">{t('Explore the rewards available in this prototype.')}</p><Link className="selection-row" replace to="/rewards/marathon">{t('barq Marathon')}<ChevronRight size={18} /></Link><Link className="selection-row" replace to="/rewards/wheel">{t('Spin the Wheel')}<ChevronRight size={18} /></Link><Link className="selection-row" replace to="/rewards/quests">{t('Quests')}<ChevronRight size={18} /></Link><p className="fine-print">{t('These are simulated experiences, not live offers or guaranteed rewards.')}</p></>;
  if (sheet === 'baloot') { const friends = directory.slice(0, 3).map(f => f.name); return <><div className="baloot-hand" aria-hidden="true"><span>J<br />♠</span><span>Q<br />♥</span><span>K<br />♠</span><span>A<br />♥</span></div><h3 className="center">{t('A seat at the table')}</h3><p className="center muted">{t('Open the lobby for a friendly Baloot game.')}</p><button className="primary-button" onClick={() => setDone(true)} disabled={done}>{done ? t('Table ready') : t('Find a table')}</button>{done && <div className="success-panel" role="status"><p>{friends.length ? t('You, {friends} are seated. Gameplay is coming soon.', { friends: friends.join(t(', ')) }) : t('You are seated. Gameplay is coming soon.')}</p></div>}</>; }
  return <p className="muted">{t('This feature is not available yet.')}</p>;
}
const channels: Partial<Record<SheetName, TransferChannel>> = { 'transfer-wallet': 'wallet', 'local-bank': 'local', international: 'international' };
function MoneyForm({ sheet }: { sheet: SheetName }) {
  const { state, directory, topUp, transfer } = useWallet();
  const [amount, setAmount] = useState(''); const [recipientId, setRecipientId] = useState(''); const [stage, setStage] = useState<'form' | 'review' | 'done'>('form'); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const recipient = directory.find(d => d.id === recipientId) ?? directory[0];
  const isTopup = sheet === 'add-money'; const isRequest = sheet === 'request-money'; const value = Number(latinDigits(amount)); const valid = amount.trim() !== '' && Number.isFinite(value) && value > 0 && value <= 10000 && Math.abs(value * 100 - Math.round(value * 100)) < .00001;
  const submit = (e: FormEvent) => { e.preventDefault(); if (!valid) { setError(t('Enter an amount from {min} to {max}, with up to two decimals.', { min: sar(0.01), max: sar(10000) })); return; } if (!isTopup && !recipient) { setError(t('No recipients are available right now.')); return; } if (!isTopup && !isRequest && value > state.balance) { setError(t('Not enough balance. Try a smaller amount.')); return; } setError(''); setStage('review'); };
  const confirm = async () => {
    setBusy(true); setError('');
    try {
      if (isTopup) await topUp(value);
      else if (!isRequest && recipient) await transfer(recipient.id, value, channels[sheet] ?? 'wallet');
      setStage('done');
    } catch (e) { setError(errorMessage(e)); }
    finally { setBusy(false); }
  };
  const words = isRequest ? { review: t('Review request'), reviewTitle: t('Review your request'), confirm: t('Confirm request') } : isTopup ? { review: t('Review top-up'), reviewTitle: t('Review your top-up'), confirm: t('Confirm top-up') } : { review: t('Review transfer'), reviewTitle: t('Review your transfer'), confirm: t('Confirm transfer') };
  const doneText = isRequest ? t('A request for {name} is ready. No message was sent.', { name: recipient?.name ?? '' }) : isTopup ? t('Your balance and transaction history have been updated.') : t('{name} has received the money.', { name: recipient?.name ?? '' });
  const again = () => { setStage('form'); setAmount(''); };
  // A transfer is a payment, so Barq celebrates it; top-ups and requests use the plain panel.
  if (stage === 'done' && !isTopup && !isRequest) return <PaymentDone title={t('Transfer complete')}><Money amount={value} /><p>{doneText}</p><button className="secondary-button" onClick={again}>{t('Make another')}</button></PaymentDone>;
  if (stage === 'done') return <div className="success-panel" role="status"><CheckCircle2 /><h3>{isRequest ? t('Request created') : t('Money added')}</h3><Money amount={value} /><p>{doneText}</p><button className="secondary-button" onClick={again}>{t('Make another')}</button></div>;
  if (stage === 'review') return <><h3>{words.reviewTitle}</h3><div className="review-amount"><Money amount={value} /></div><div className="info-panel"><p>{isTopup ? t('From: Linked bank account') : t('To: {name}', { name: recipient?.name ?? '' })}</p><p>{sheet === 'international' ? t('Route: International transfer') : sheet === 'local-bank' ? t('Route: Local bank transfer') : t('Account: barq wallet')}</p><p>{t('Fee: {amount}', { amount: sar(0) })}</p></div>{error && <p className="error-text" role="alert">{error}</p>}<button className="primary-button" onClick={confirm} disabled={busy}>{busy ? t('Working…') : words.confirm}</button><button className="text-button" onClick={() => setStage('form')} disabled={busy}>{t('Edit amount')}</button></>;
  return <form onSubmit={submit} noValidate><p className="muted">{isTopup ? t('Add money to your barq wallet.') : isRequest ? t('Ask a friend to send you money.') : t('Send money to another barq user.')}</p>{!isTopup && <label className="field-label">{t('Recipient')}<select value={recipient?.id ?? ''} onChange={e => setRecipientId(e.target.value)}>{directory.map(contact => <option key={contact.id} value={contact.id}>{contact.name}</option>)}</select></label>}<label className="field-label">{t('Amount (SAR)')}<NumberField placeholder={t('0.00')} value={amount} onChange={setAmount} aria-invalid={!!error} aria-describedby={error ? 'amount-error' : undefined} /></label><div className="amount-options">{[50, 100, 500].map(n => <button type="button" key={n} onClick={() => { setAmount(String(n)); setError(''); }}>{sar(n)}</button>)}</div><p className="fine-print">{t('Available balance:')} <Money amount={state.balance} /></p>{error && <p className="error-text" id="amount-error" role="alert">{error}</p>}<button className="primary-button" type="submit">{words.review}</button></form>;
}
