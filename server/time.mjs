// Riyadh is UTC+3 all year (no daylight saving), so day boundaries use a fixed offset.
export const DAY_MS = 86_400_000;
const OFFSET_MS = 3 * 3_600_000;

/** Riyadh calendar date, YYYY-MM-DD. */
export const dayKey = value => new Date(new Date(value).getTime() + OFFSET_MS).toISOString().slice(0, 10);
/** Whole days from Riyadh date `from` to Riyadh date `to`. */
export const daysBetween = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);
export const addDays = (key, days) => new Date(Date.parse(key) + days * DAY_MS).toISOString().slice(0, 10);
