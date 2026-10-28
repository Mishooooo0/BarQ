import { expect, test as base, type Page } from '@playwright/test';
// @ts-expect-error plain JavaScript modules without type declarations
import { ensureDb, update } from '../server/db.mjs';
// @ts-expect-error plain JavaScript modules without type declarations
import { SEED_ACCOUNTS } from '../server/seed.mjs';

type Account = { id: string; name: string; pin: string };
export const accounts = SEED_ACCOUNTS as Account[];
export const account = (id: string) => accounts.find(a => a.id === id)!;

/** Every test starts from a fresh copy of the seeded (empty) databases. */
export const test = base.extend<{ freshDb: void }>({
  freshDb: [async ({}, use) => { ensureDb({ reset: true }); await use(); }, { auto: true }],
});
export { expect };

type UsersDb = { users: { id: string; balance: number }[]; groups: { id: string; name: string; members: string[] }[] };
/** Accounts start at zero; tests give a wallet money directly in the test database. */
export function fund(id: string, amount: number) {
  update('users', (db: UsersDb) => { db.users.find(u => u.id === id)!.balance = amount; });
}
export function addGroup(id: string, name: string, members: string[]) {
  update('users', (db: UsersDb) => { db.groups.push({ id, name, members }); });
}

export async function signIn(page: Page, id = 'meshal') {
  const { name, pin } = account(id);
  await page.goto('/');
  await page.getByRole('button', { name, exact: true }).click();
  await page.getByLabel('4-digit PIN').fill(pin);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
}

/** Signs in through the API (for other group members' actions) and returns their token. */
export async function apiToken(page: Page, id: string) {
  const res = await page.request.post('/api/auth/login', { data: { userId: id, pin: account(id).pin } });
  return (await res.json()).token as string;
}
