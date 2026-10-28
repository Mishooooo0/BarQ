// "Who pays?" for a group hangout. Every member votes one of three choices:
//   split - split the bill equally      own - everyone pays for their own meal      pay - "I will pay it"
// Rules when the vote ends:
//   exactly one "I will pay it"          -> that person pays (even if everyone else chose something else)
//   two or more "I will pay it"          -> those people play the game; the highest score pays
//   nobody volunteers                    -> split or own, whichever has more votes; a tie means everyone pays their own
export const CHOICES = ['split', 'own', 'pay'];
export const CHOICE_LABELS = { split: 'Split the bill', own: 'Everyone pays their own', pay: 'I will pay it' };

export function tally(hangout) {
  const counts = { split: 0, own: 0, pay: 0 };
  for (const choice of Object.values(hangout.votes)) counts[choice] += 1;
  return counts;
}

/** The outcome for the votes cast so far, in member order. */
export function decide(hangout) {
  const counts = tally(hangout);
  const volunteers = hangout.members.filter(id => hangout.votes[id] === 'pay');
  if (volunteers.length === 1) return { outcome: 'volunteer', payer: volunteers[0], tally: counts };
  if (volunteers.length > 1) return { outcome: 'game', players: volunteers, payer: null, tally: counts };
  return { outcome: counts.split > counts.own ? 'split' : 'own', payer: null, tally: counts };
}

/** Who still has to pay, and how much each, once the outcome is known. */
export function dues(hangout) {
  const { result } = hangout;
  if (!result || (result.outcome === 'game' && !result.payer)) return [];
  if (result.outcome === 'volunteer' || result.outcome === 'game') return [{ userId: result.payer, amount: hangout.billAmount }];
  const share = Math.round((hangout.billAmount / hangout.members.length) * 100) / 100;
  return hangout.members.map(userId => ({ userId, amount: result.outcome === 'own' ? hangout.perPerson : share }));
}
