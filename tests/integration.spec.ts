import { expect, signIn, test } from './fixtures';

test('places dataset is reachable through the UI', async ({ page }) => {
  await signIn(page);
  await page.goto('/more');
  await page.getByRole('link', { name: 'Riyadh places' }).click();
  await expect(page.getByRole('heading', { name: 'Places' })).toBeVisible();
  await page.getByLabel('Place category').selectOption('groceries');
  await expect(page.locator('article.product-row')).toHaveCount(10);
});

test('points challenges opens from Products', async ({ page }) => {
  await signIn(page);
  await page.goto('/more');
  await page.getByRole('link', { name: /Points Challenges/ }).click();
  await expect(page.locator('iframe[title="Points Challenges"]')).toBeVisible();
});

test('AI Analyst shows insights, plans a day from the wallet slider and plans a hangout', async ({ page }) => {
  await signIn(page);
  await page.getByRole('link', { name: /AI Analyst/ }).click();
  await expect(page.getByRole('heading', { name: 'AI Analyst' })).toBeVisible();
  await expect(page.getByText('Suggested budgets')).toBeVisible();
  await expect(page.getByText('Upcoming subscriptions')).toBeVisible();
  await page.getByRole('tab', { name: 'Daily plan' }).click();
  const slider = page.getByRole('slider', { name: "Today's budget" });
  const max = Number(await slider.getAttribute('max'));
  expect(max).toBe(1860);
  await slider.fill('150');
  await page.getByRole('button', { name: 'Plan my day' }).click();
  await expect(page.locator('.plan-item').first()).toBeVisible();
  await expect(page.locator('.analyst-bubble')).toContainText('SAR 150');
  await page.getByRole('tab', { name: 'Hangout' }).click();
  await page.getByRole('radio', { name: /The Shilla/ }).click();
  await page.getByRole('slider', { name: 'Your hangout budget' }).fill('300');
  await page.getByRole('button', { name: 'Plan the hangout' }).click();
  await expect(page.locator('.per-person')).toContainText('80.00');
  await expect(page.locator('.plan-item').first()).toBeVisible();
});

test('a failing backend shows an error state instead of breaking the app', async ({ page }) => {
  await signIn(page);
  await page.route('**/api/analyst/insights', route => route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"Simulated outage"}' }));
  await page.getByRole('link', { name: /AI Analyst/ }).click();
  await expect(page.getByRole('alert').first()).toContainText('Simulated outage');
  await page.unroute('**/api/analyst/insights');
  await page.getByRole('button', { name: 'Try again' }).first().click();
  await expect(page.getByText('Suggested budgets')).toBeVisible();
  await page.route('**/api/**', route => route.abort());
  await page.getByRole('navigation').getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  await page.getByRole('link', { name: 'Transactions', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible();
});
