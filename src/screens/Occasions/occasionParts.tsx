import { useEffect, useState } from 'react';
import type { Occasion } from '../../types/api';

const dayFormat = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' });
/** "16 May 2027" from a YYYY-MM-DD date key. */
export const formatDay = (key: string) => dayFormat.format(new Date(`${key}T00:00:00Z`));
/** Today in Riyadh, YYYY-MM-DD. */
export const todayKey = () => new Date(Date.now() + 3 * 3_600_000).toISOString().slice(0, 10);
export const addDaysKey = (key: string, days: number) => new Date(Date.parse(`${key}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

export function countdown(o: Pick<Occasion, 'past' | 'daysLeft'>) {
  return o.past ? 'Past' : o.daysLeft === 0 ? 'Today' : o.daysLeft === 1 ? 'Tomorrow' : `In ${o.daysLeft} days`;
}

/** A riyal amount field that saves when it loses focus (or on Enter), only if the value changed and is valid. */
export function AmountInput({ value, label, onCommit, disabled }: { value: number; label: string; onCommit: (value: number) => void; disabled?: boolean }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { setDraft(String(value)); }, [value]);
  const commit = () => {
    const n = Number(draft);
    if (draft.trim() === '' || !Number.isFinite(n) || n < 0) { setDraft(String(value)); return; }
    const rounded = Math.round(n * 100) / 100;
    if (rounded !== value) onCommit(rounded);
  };
  return <input className="amount-input" aria-label={label} type="number" inputMode="decimal" min="0" step="1" value={draft} disabled={disabled}
    onChange={e => setDraft(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} />;
}
