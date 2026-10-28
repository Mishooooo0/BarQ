import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, MapPin, Search, Star } from 'lucide-react';
import { PaymentDone } from '../../components/PaymentDone';
import { useWallet } from '../../app/WalletProvider';
import { api, errorMessage, isAbort } from '../../lib/api';
import { riyadhDay } from '../../lib/format';
import { DetailHeader, ErrorState, MockNote, Money } from '../../components/ui/Primitives';
import type { CategoryTemplate, Payment, PlaceRecord } from '../../types/api';

const shiftDay = (day: string, days: number) => new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

/** Market → Pay at places: buy from any place in the Categories database; each purchase is saved in the Payments database. */
export function PayPlaces() {
  const { state, payAtPlace } = useWallet();
  const [categories, setCategories] = useState<CategoryTemplate[]>([]);
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<PlaceRecord[] | null>(null);
  const [listError, setListError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<PlaceRecord | null>(null);
  const today = riyadhDay(Date.now()); const earliest = shiftDay(today, -365);
  const [date, setDate] = useState(today);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const [receipt, setReceipt] = useState<Payment | null>(null);
  const [payments, setPayments] = useState<Payment[] | null>(null);

  const loadPayments = useCallback(() => { api<Payment[]>('/api/payments').then(setPayments).catch(() => setPayments(null)); }, []);
  useEffect(() => { api<CategoryTemplate[]>('/api/categories').then(setCategories).catch(e => setListError(errorMessage(e))); loadPayments(); }, [attempt, loadPayments]);
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ limit: '250' });
    if (category) params.set('category', category);
    if (query.trim()) params.set('q', query.trim());
    const timer = setTimeout(() => {
      api<{ items: PlaceRecord[] }>(`/api/places?${params}`, { signal: controller.signal })
        .then(data => { setPlaces(data.items); setListError(''); })
        .catch(e => { if (!isAbort(e) && !controller.signal.aborted) setListError(errorMessage(e)); });
    }, query ? 200 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [category, query, attempt]);

  const choose = (place: PlaceRecord) => { setSelected(place); setDate(today); setPayError(''); setReceipt(null); };
  const dateError = !/^\d{4}-\d{2}-\d{2}$/.test(date) ? 'Choose a date.' : date > today ? "The date can't be in the future." : date < earliest ? 'The date must be within the last year.' : '';
  const pay = async () => {
    if (!selected || dateError || paying) return;
    setPaying(true); setPayError('');
    try { setReceipt(await payAtPlace(selected.record_id, date)); loadPayments(); }
    catch (e) { setPayError(errorMessage(e)); }
    finally { setPaying(false); }
  };
  const categoryName = (id: string) => categories.find(c => c.id === id)?.name ?? id;

  if (selected) return <><DetailHeader title="Pay at places" fallback="/market" /><div className="detail-content pay-content">
    <button type="button" className="text-button login-back" onClick={() => setSelected(null)}><ArrowLeft size={16} /> Choose another place</button>
    {receipt ? <PaymentDone title="Payment saved">
      <dl className="receipt-table" aria-label="Payment record"><div><dt>Name</dt><dd>{receipt.name}</dd></div><div><dt>Price</dt><dd><Money amount={receipt.price} /></dd></div><div><dt>Category</dt><dd>{receipt.category}</dd></div><div><dt>Date</dt><dd>{receipt.date}</dd></div></dl>
      <p>Saved to the Payments database as {receipt.id}. Your balance is now <Money amount={state.balance} />.</p>
    </PaymentDone> : <>
      <div className="info-panel pay-summary"><h3>{selected.name}</h3><p>{categoryName(selected.categoryId)} · {selected.address}</p><div className="pay-price"><Money amount={selected.estimatedCost} /></div></div>
      <label className="field-label">Payment date<input type="date" value={date} min={earliest} max={today} onChange={e => { setDate(e.target.value); setPayError(''); }} aria-invalid={!!dateError} /></label>
      {dateError && <p className="error-text" role="alert">{dateError}</p>}
      <p className="fine-print">Available balance: <Money amount={state.balance} /></p>
      {selected.estimatedCost > state.balance && <p className="error-text" role="alert">Not enough balance. Add money from Home.</p>}
      {payError && <p className="error-text" role="alert">{payError}</p>}
      <button className="primary-button" onClick={pay} disabled={paying || !!dateError || selected.estimatedCost > state.balance}>{paying ? 'Paying…' : <>Pay <Money amount={selected.estimatedCost} /></>}</button>
    </>}
    <MockNote />
  </div></>;

  return <><DetailHeader title="Pay at places" fallback="/market" /><div className="detail-content pay-content">
    <p className="muted">Pay at any place in the Categories database. You can change the payment date.</p>
    <div className="group-chips" role="radiogroup" aria-label="Category"><button role="radio" aria-checked={category === ''} onClick={() => setCategory('')}>All</button>{categories.map(c => <button key={c.id} role="radio" aria-checked={category === c.id} onClick={() => setCategory(c.id)}>{c.name}</button>)}</div>
    <label className="search-bar pay-search"><Search aria-hidden="true" /><input aria-label="Search places" placeholder="Search" value={query} onChange={e => setQuery(e.target.value)} /></label>
    {listError ? <ErrorState message={listError} onRetry={() => { setListError(''); setAttempt(n => n + 1); }} /> : places === null ? <p className="muted" role="status">Loading places…</p> : !places.length ? <p className="muted">No places match.</p>
      : <div className="pay-list">{places.map(p => <button key={p.record_id} className="product-row pay-row" onClick={() => choose(p)}><div><h3>{p.name}</h3><p><MapPin size={10} /> {categoryName(p.categoryId)}{p.rating5 != null && <> · <Star size={10} /> {p.rating5.toFixed(1)}</>}</p></div><Money amount={p.estimatedCost} /></button>)}</div>}
    <section className="analyst-section"><h3>Your payments</h3>{payments === null ? <p className="muted">Payments are unavailable right now.</p> : !payments.length ? <p className="muted">No payments yet.</p>
      : <table className="payments-table"><thead><tr><th>Name</th><th>Category</th><th>Date</th><th>Price</th></tr></thead><tbody>{payments.map(p => <tr key={p.id}><td>{p.name}</td><td>{p.category}</td><td>{p.date}</td><td><Money amount={p.price} /></td></tr>)}</tbody></table>}</section>
    <MockNote />
  </div></>;
}
