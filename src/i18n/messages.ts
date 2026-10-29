// Turns the server's English error messages into the chosen language. Fixed messages are looked up in ar.ts;
// messages with names or numbers in them are matched here. Anything unknown becomes a general message in Arabic.
import { isArabic, num, sar, t } from './index';
import { ar } from './ar';

const fields: Record<string, string> = { Merchant: 'Merchant', Name: 'Name', Label: 'Label', 'Group name': 'Group name', 'Each line needs a name': 'Each line needs a name', 'Each Eidia needs a name': 'Each Eidia needs a name' };
const amountFields: Record<string, string> = { amount: 'an amount', budget: 'a budget', bill: 'a bill amount', goal: 'a goal', 'a budget': 'a budget', 'each amount': 'each amount', 'each Eidia': 'each Eidia' };
const reasons: Record<string, string> = { 'it took too long': 'it took too long', 'it is busy': 'it is busy', 'it could not be reached': 'it could not be reached', 'it returned an error': 'it returned an error' };
const money = (text: string) => sar(Number(text.replace(/,/g, '')));

const patterns: [RegExp, (...groups: string[]) => string][] = [
  [/^(.+) is required\.$/, field => t('{field} is required.', { field: t(fields[field] ?? field) })],
  [/^(.+) must be (\d+) characters or fewer\.$/, (field, max) => t('{field} must be {max} characters or fewer.', { field: t(fields[field] ?? field), max: Number(max) })],
  [/^Enter (?:a )?(.+?) from SAR ([\d.,]+) to SAR ([\d.,]+)(, with up to two decimals)?\.$/, (field, min, max) => t('Enter {field} from {min} to {max}.', { field: t(amountFields[field] ?? 'an amount'), min: money(min), max: money(max) })],
  [/^An occasion can have up to (\d+) budget lines\.$/, max => t('An occasion can have up to {max} budget lines.', { max: Number(max) })],
  [/^The Eidia list can have up to (\d+) people\.$/, max => t('The Eidia list can have up to {max} people.', { max: Number(max) })],
  [/^Unknown category "(.+)"\.$/, () => t('Unknown category.')],
  [/^(.+) is already in (.+)\.$/, (person, group) => t('{person} is already in {group}.', { person, group })],
  [/^(.+) doesn't have enough balance for this bill\.$/, person => t("{person} doesn't have enough balance for this bill.", { person })],
  [/^The Saving box has only SAR ([\d.,]+)\.$/, amount => t('The Saving box has only {amount}.', { amount: money(amount) })],
  [/^You can plan up to (\d+) occasions\. Delete an old one first\.$/, max => t('You can plan up to {max} occasions. Delete an old one first.', { max: Number(max) })],
  [/^A group can have up to (\d+) people\.$/, max => t('A group can have up to {max} people.', { max: Number(max) })],
  [/^You can be in up to (\d+) groups\.$/, max => t('You can be in up to {max} groups.', { max: Number(max) })],
  [/^You already have a group called (.+)\.$/, name => t('You already have a group called {name}.', { name })],
  [/^Too many attempts\. Try again in (\d+) seconds\.$/, wait => t('Too many attempts. Try again in {seconds} seconds.', { seconds: Number(wait) })],
  [/^Barq AI could not answer right now \((.+)\)\. Please try again\.$/, reason => t('Barq AI could not answer right now ({reason}). Please try again.', { reason: t(reasons[reason] ?? 'its answer was unusable') })],
  [/^Request failed \((\d+)\)\.$/, status => t('Request failed ({status}).', { status: num(Number(status), { useGrouping: false }) })],
];

/** The message to show for an error from the server (or from the API client). */
export function messageText(message: string) {
  if (!isArabic()) return message;
  if (typeof ar[message] === 'string') return t(message);
  for (const [pattern, render] of patterns) {
    const match = message.match(pattern);
    if (match) return render(...match.slice(1));
  }
  return t('Something went wrong. Please try again.');
}
