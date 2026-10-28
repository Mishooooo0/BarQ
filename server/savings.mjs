// The Saving box: money moved out of the wallet into `user.savings`, with one goal — an amount to reach by the end of
// the current year (Riyadh time). Moves are recorded as wallet transactions of kind "savings", which never count as spending.
import { dayKey, daysBetween } from './time.mjs';

export const MAX_GOAL = 1000000;
const round2 = value => Math.round(value * 100) / 100;

export function savingsView(user, now = new Date()) {
  const today = dayKey(now);
  const deadline = `${today.slice(0, 4)}-12-31`;
  const saved = round2(user.savings ?? 0);
  const target = user.savingsGoal?.target ?? null;
  const daysLeft = daysBetween(today, deadline) + 1; // today counts as a saving day
  const remaining = target == null ? null : round2(Math.max(0, target - saved));
  const weeksLeft = Math.max(1, Math.ceil(daysLeft / 7));
  return {
    saved, target, deadline, daysLeft, remaining,
    progress: target ? Math.min(1, saved / target) : 0,
    reached: target != null && saved >= target,
    perWeek: remaining ? Math.ceil(remaining / weeksLeft) : 0,
    perDay: remaining ? Math.ceil(remaining / daysLeft) : 0,
    setAt: user.savingsGoal?.setAt ?? null,
    history: user.transactions.filter(t => t.kind === 'savings').slice(0, 20),
  };
}
