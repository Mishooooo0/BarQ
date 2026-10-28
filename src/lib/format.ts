import type { Transaction } from '../types';
import type { CategoryId, ServerTransaction } from '../types/api';

const zone = 'Asia/Riyadh';
const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' });
const shortDate = new Intl.DateTimeFormat('en-GB', { timeZone: zone, day: 'numeric', month: 'short' });
const time = new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', hour12: false });

export const categoryNames: Record<CategoryId, string> = { food: 'Food', cafe: 'Cafe', health: 'Health', shopping: 'Shopping', groceries: 'Groceries', transportation: 'Transportation', entertainment: 'Entertainment' };
export const riyadhDay = (value: string | number | Date) => dayFormat.format(new Date(value));
const dayMonth = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short' });
const dayMonthYear = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' });
/** "29 Oct" from a YYYY-MM-DD date key, with the year when it isn't this year. */
export const shortDay = (key: string) => (key.slice(0, 4) === riyadhDay(Date.now()).slice(0, 4) ? dayMonth : dayMonthYear).format(new Date(`${key}T00:00:00Z`));

export function relativeDay(value: string) {
  const day = riyadhDay(value); const today = riyadhDay(Date.now()); const yesterday = riyadhDay(Date.now() - 86_400_000);
  return day === today ? 'Today' : day === yesterday ? 'Yesterday' : shortDate.format(new Date(value));
}

export function toTransaction(t: ServerTransaction): Transaction {
  const kind = t.kind === 'purchase' ? 'shopping' : t.kind;
  const detail = t.category ? categoryNames[t.category] : t.kind === 'transfer' ? `Transfer${t.note ? ` · ${t.note}` : ''}` : t.kind === 'topup' ? 'Money added' : t.kind === 'cashback' ? 'Rewards' : t.kind === 'savings' ? `Saving box${t.note ? ` · ${t.note}` : ''}` : 'Payment';
  return { id: t.id, title: t.seller, subtitle: `${detail} · ${time.format(new Date(t.date))}`, amount: t.amount, date: relativeDay(t.date), kind, category: t.category };
}

export const initials = (name: string) => name.split(/\s+/).filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase();
