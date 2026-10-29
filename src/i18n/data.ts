// Text that the server stores or sends in English (transaction sellers, category names, occasion types and their
// starting lines, hangout results, spending alerts), shown in the chosen language.
import { isArabic, percent, sar, t } from './index';
import { ar } from './ar';
import type { CategoryId, Hangout, Insights, OccasionTypeId, VoteChoice } from '../types/api';

const categoryEn: Record<CategoryId, string> = { food: 'Food', cafe: 'Cafe', health: 'Health', shopping: 'Shopping', groceries: 'Groceries', transportation: 'Transportation', entertainment: 'Entertainment' };
export const categoryName = (id: CategoryId | string) => t(categoryEn[id as CategoryId] ?? id);

const occasionEn: Record<OccasionTypeId, string> = { 'eid-fitr': 'Eid al-Fitr', 'eid-adha': 'Eid al-Adha', graduation: 'Graduation', 'home-party': 'Home party', holiday: 'Holiday trip' };
export const occasionTypeName = (id: OccasionTypeId | string) => t(occasionEn[id as OccasionTypeId] ?? id);

/** Translates a known English label (an occasion's starting lines, the ride note); people's own labels stay as written. */
export const knownText = (text: string) => isArabic() && typeof ar[text] === 'string' ? t(text) : text;

const choiceEn: Record<VoteChoice, string> = { split: 'Split the bill', own: 'Everyone pays their own', pay: 'I will pay it' };
export const choiceLabel = (choice: VoteChoice) => t(choiceEn[choice]);

const hangoutParts: Record<string, string> = { 'split bill': 'split bill', 'my share': 'my share', bill: 'bill' };
/** Wallet transaction titles the server writes in English; places and people keep their names. */
export function sellerText(seller: string) {
  if (!isArabic()) return seller;
  if (typeof ar[seller] === 'string') return t(seller);
  let match = seller.match(/^Transfer to (.+)$/);
  if (match) return t('Transfer to {name}', { name: match[1] });
  match = seller.match(/^Transfer from (.+)$/);
  if (match) return t('Transfer from {name}', { name: match[1] });
  match = seller.match(/^(.+) hangout \((split bill|my share|bill)\)$/);
  if (match) return t('{group} hangout ({part})', { group: match[1], part: t(hangoutParts[match[2]]) });
  return seller;
}
const notes: Record<string, string> = { 'barq wallet': 'barq wallet', 'local bank': 'local bank', international: 'international', 'added to the box': 'added to the box', 'back to the wallet': 'back to the wallet' };
export const noteText = (note: string) => notes[note] ? t(notes[note]) : note;

/** The result line of a hangout vote, built from the result itself so it follows the language. */
export function hangoutResultText(result: NonNullable<Hangout['result']>) {
  if (!isArabic()) return result.label;
  if (result.payerName) return t('{name} pays the bill', { name: result.payerName });
  if (result.outcome === 'game') return t('{players}: the highest score pays', { players: (result.players ?? []).map(p => p.name).join(t(' vs ')) });
  return result.outcome === 'split' ? t('Split the bill') : t('Everyone pays their own');
}

/** A spending alert from the analyst, written from its numbers. */
export function alertText(alert: Insights['alerts'][number]) {
  if (!isArabic()) return alert.message;
  if (alert.type === 'daily-limit') return t("Today you've spent {amount}, over your suggested daily budget of {limit}.", { amount: sar(alert.amount), limit: sar(alert.usual) });
  const category = alert.category ? categoryName(alert.category) : '';
  if (alert.usual > 0) return t('You spent {amount} on {category} this week, {percent} more than your usual {usual}.', { amount: sar(alert.amount), category, percent: percent(alert.amount / alert.usual - 1), usual: sar(alert.usual) });
  return t('You spent {amount} on {category} this week, which is new for you.', { amount: sar(alert.amount), category });
}
