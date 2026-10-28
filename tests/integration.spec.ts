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
