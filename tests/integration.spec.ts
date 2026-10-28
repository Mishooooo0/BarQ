import { test, expect } from '@playwright/test';

test('places dataset is reachable through the UI', async ({ page }) => {
  await page.goto('/more');
  await page.getByRole('link', { name: 'Riyadh places' }).click();
  await expect(page.getByRole('heading', { name: 'Places' })).toBeVisible();
  await page.getByLabel('Place category').selectOption('Groceries');
  await expect(page.locator('article.product-row')).toHaveCount(10);
});

test('points challenges opens from Products', async ({ page }) => {
  await page.goto('/more');
  await page.getByRole('link', { name: /Points Challenges/ }).click();
  await expect(page.locator('iframe[title="Points Challenges"]')).toBeVisible();
});

test('demo top-up works when randomUUID is unavailable on a network IP', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window.crypto, 'randomUUID', { value: undefined, configurable: true }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Add money', exact: true }).click();
  await page.getByLabel('Amount (SAR)').fill('100');
  await page.getByRole('button', { name: 'Review top-up' }).click();
  await page.getByRole('button', { name: 'Confirm demo top-up' }).click();
  await expect(page.getByRole('status')).toContainText('Demo money added');
  await expect(page.getByLabel('Available balance 1384.50 Saudi riyals')).toBeVisible();
});
