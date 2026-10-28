import { expect, test as base, type Page } from '@playwright/test';
// @ts-expect-error plain JavaScript modules without type declarations
import { ensureDb } from '../server/db.mjs';
// @ts-expect-error plain JavaScript modules without type declarations
import { SEED_ACCOUNTS } from '../server/seed.mjs';

type Account = { id: string; name: string; pin: string; balance: number };
export const accounts = SEED_ACCOUNTS as Account[];
export const account = (id: string) => accounts.find(a => a.id === id)!;

/** Every test starts from a fresh copy of the seeded databases. */
export const test = base.extend<{ freshDb: void }>({
  freshDb: [async ({}, use) => { ensureDb({ reset: true }); await use(); }, { auto: true }],
});
export { expect };

export async function signIn(page: Page, id = 'meshal') {
  const { name, pin } = account(id);
  await page.goto('/');
  await page.getByRole('button', { name, exact: true }).click();
  await page.getByLabel('4-digit PIN').fill(pin);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
}
