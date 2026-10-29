import { formatDate, t } from '../i18n';
import { categoryName, noteText, sellerText } from '../i18n/data';
import type { Transaction } from '../types';
import type { CategoryId, ServerTransaction } from '../types/api';

const zone = 'Asia/Riyadh';
const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' });

export const categoryNames: Record<CategoryId, string> = { food: 'Food', cafe: 'Cafe', health: 'Health', shopping: 'Shopping', groceries: 'Groceries', transportation: 'Transportation', entertainment: 'Entertainment' };
/** Riyadh calendar date as YYYY-MM-DD (for comparisons and the API, not for display). */
export const riyadhDay = (value: string | number | Date) => dayFormat.format(new Date(value));
/** "29 Oct" from a YYYY-MM-DD date key, with the year when it isn't this year. */
export const shortDay = (key: string) => formatDate(`${key}T00:00:00Z`, { timeZone: 'UTC', day: 'numeric', month: 'short', ...(key.slice(0, 4) === riyadhDay(Date.now()).slice(0, 4) ? {} : { year: 'numeric' }) });
/** "19:30" in Riyadh time. */
export const clockTime = (value: string | number | Date) => formatDate(value, { timeZone: zone, hour: '2-digit', minute: '2-digit', hour12: false });

export function relativeDay(value: string) {
  const day = riyadhDay(value); const today = riyadhDay(Date.now()); const yesterday = riyadhDay(Date.now() - 86_400_000);
  return day === today ? t('Today') : day === yesterday ? t('Yesterday') : formatDate(value, { timeZone: zone, day: 'numeric', month: 'short' });
}

export function toTransaction(tx: ServerTransaction): Transaction {
  const kind = tx.kind === 'purchase' ? 'shopping' : tx.kind;
  const note = tx.note ? ` · ${noteText(tx.note)}` : '';
  const detail = tx.category ? categoryName(tx.category) : tx.kind === 'transfer' ? `${t('Transfer')}${note}` : tx.kind === 'topup' ? t('Money added') : tx.kind === 'cashback' ? t('Rewards') : tx.kind === 'savings' ? `${t('Saving box')}${note}` : t('Payment');
  return { id: tx.id, title: sellerText(tx.seller), subtitle: `${detail} · ${clockTime(tx.date)}`, amount: tx.amount, date: relativeDay(tx.date), kind, category: tx.category };
}

export const initials = (name: string) => name.split(/\s+/).filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase();
