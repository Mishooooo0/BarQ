import { expect, test } from '@playwright/test';
const captureDir = process.env.BARQ_CAPTURE_DIR ?? 'test-results/visual';

test('lower Products matches the reference and its new tiles open working demos', async ({ page }) => {
  await page.goto('/more');
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => page.locator('main').evaluate(el => getComputedStyle(el).opacity)).toBe('1');
  await page.locator('.screen-scroll').evaluate(el => { el.scrollTop = 490; });
  await expect.poll(async () => (await page.locator('.more-phone .page-header').boundingBox())?.y).toBe(54);
  await expect(page.getByRole('button', { name: 'Offers', exact: true })).toBeInViewport();
  await page.screenshot({ path: `${captureDir}/more-lower.png` });
  await page.getByRole('button', { name: 'Youth Accounts', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('YOUTH-DEMO-01');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Domestic Labor Salaries', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm demo salary payment' }).click();
  await expect(page.getByRole('status')).toContainText('Demo salary recorded');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Domestic Labor Salaries', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Confirm demo salary payment' })).toBeDisabled();
  await expect(page.getByRole('alert')).toContainText('Not enough demo balance');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Offers', exact: true }).click();
  await page.getByRole('dialog').getByRole('link', { name: 'barq Marathon' }).click();
  await expect(page.getByRole('button', { name: 'Join demo marathon' })).toBeVisible();
  await page.getByRole('navigation').getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.getByLabel('Available balance 434.50 Saudi riyals')).toBeVisible();
});

test('Home lower promotion preserves the supplied artwork and opens a demo ranking', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => page.locator('main').evaluate(el => getComputedStyle(el).opacity)).toBe('1');
  await page.locator('.screen-scroll').evaluate(el => { el.scrollTop = 237; });
  await expect(page.locator('.phone')).toHaveClass(/is-scrolled/);
  await expect(page.getByRole('button', { name: /barq Marathon — click/ })).toBeInViewport();
  await page.screenshot({ path: `${captureDir}/home-lower.png` });
  await page.getByRole('button', { name: /barq Marathon — click/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Your demo ranking');
  await page.getByRole('link', { name: 'Explore marathon' }).click();
  await expect(page.getByRole('button', { name: 'Join demo marathon' })).toBeVisible();
});

test('five reference-sized screens render with navigation and no runtime errors', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  for (const [path, name] of [['/', 'home'], ['/rewards', 'rewards'], ['/cards', 'cards'], ['/market', 'market'], ['/more', 'more']]) {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
    await expect(page.locator('.bottom-nav a[aria-current="page"]')).toHaveCount(1);
    await expect.poll(() => page.locator('main').evaluate(el => getComputedStyle(el).opacity)).toBe('1');
    await expect.poll(() => page.evaluate(() => [...document.querySelectorAll('svg image')].every(el => !!el.getAttribute('href')))).toBe(true);
    await page.screenshot({ path: `${captureDir}/${name}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
});

test('all bottom tabs navigate and More scrolls above the fixed navigation', async ({ page }) => {
  await page.goto('/');
  for (const [label, heading] of [['Rewards', 'Rewards'], ['Cards', 'Cards'], ['Market', 'Market'], ['More', 'Products']]) {
    await page.getByRole('navigation').getByRole('link', { name: label, exact: true }).click();
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Youth Accounts', exact: true }).scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Youth Accounts', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('balance visibility, validated top-up and transaction history stay consistent', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Hide balance' }).click();
  await expect(page.getByLabel('Balance hidden', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Show balance' }).click();
  await page.getByRole('button', { name: 'Add money', exact: true }).click();
  await page.getByRole('button', { name: 'Review top-up' }).click();
  await expect(page.getByRole('alert')).toContainText('Enter an amount');
  await page.getByLabel('Amount (SAR)').fill('100');
  await page.getByRole('button', { name: 'Review top-up' }).click();
  await page.getByRole('button', { name: 'Confirm demo top-up' }).click();
  await expect(page.getByRole('status')).toContainText('Demo money added');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.getByLabel('Available balance 1384.50 Saudi riyals')).toBeVisible();
  await page.getByRole('link', { name: 'Transactions', exact: true }).click();
  await expect(page.getByRole('button', { name: /Demo wallet top-up/ })).toBeVisible();
  await page.getByRole('button', { name: 'Money out', exact: true }).click();
  await expect(page.getByRole('button', { name: /Demo wallet top-up/ })).toHaveCount(0);
});

test('card freezing survives navigation and no credentials are requested', async ({ page }) => {
  await page.goto('/cards');
  await page.getByRole('link', { name: /National Day/ }).click();
  await page.getByRole('button', { name: 'Freeze card' }).click();
  await expect(page.getByRole('button', { name: 'Unfreeze card' })).toBeVisible();
  await page.getByRole('button', { name: 'Card details' }).click();
  await expect(page.getByText('No card number, expiry or security code is stored.')).toBeVisible();
  await page.getByRole('navigation').getByRole('link', { name: 'Cards', exact: true }).click();
  await page.getByRole('link', { name: /National Day/ }).click();
  await expect(page.getByRole('button', { name: 'Unfreeze card' })).toBeVisible();
});

test('market search, favorites and checkout update the same mock wallet', async ({ page }) => {
  await page.goto('/market');
  await page.getByRole('textbox', { name: 'Search market' }).fill('Xbox');
  await page.getByRole('link', { name: /Xbox gift card/ }).click();
  await page.getByRole('button', { name: 'Save to favorites' }).click();
  await page.getByRole('button', { name: 'Add to demo cart' }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'Market', exact: true }).click();
  await page.getByRole('button', { name: 'Favorites', exact: true }).click();
  await expect(page.getByRole('link', { name: /Xbox gift card/ })).toBeVisible();
  await page.getByRole('link', { name: 'Shopping cart, 1 items' }).click();
  await page.getByRole('button', { name: 'Complete demo order' }).click();
  await expect(page.getByRole('heading', { name: 'Demo order complete' })).toBeVisible();
  await page.getByRole('navigation').getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.getByLabel('Available balance 1234.50 Saudi riyals')).toBeVisible();
});

test('wheel credits only once, quests complete and marathon entry is simulated', async ({ page }) => {
  await page.goto('/rewards');
  await page.getByRole('link', { name: /Spin the Wheel/ }).click();
  await page.getByRole('button', { name: 'Spin the wheel', exact: true }).click();
  await expect(page.getByText('You won SAR 5 in demo cashback!')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Spin used' })).toBeDisabled();
  await page.getByRole('navigation').getByRole('link', { name: 'Rewards', exact: true }).click();
  await expect(page.locator('.cashback-summary')).toContainText('162.44');
  await page.getByRole('link', { name: /Quests/ }).click();
  await page.getByRole('link', { name: 'Explore', exact: false }).first().click();
  await page.goBack();
  await expect(page.getByText('Done', { exact: true })).toBeVisible();
  await page.getByRole('navigation').getByRole('link', { name: 'Rewards', exact: true }).click();
  await page.getByRole('link', { name: /barq Marathon/ }).click();
  await page.getByRole('button', { name: 'Join demo marathon' }).click();
  await expect(page.getByRole('status')).toContainText('No real prize draw');
});

test('transfer rejects overspending, requires review and does not use real details', async ({ page }) => {
  await page.goto('/more');
  await page.getByRole('button', { name: 'Transfer to barq wallet' }).click();
  await page.getByLabel('Amount (SAR)').fill('2000');
  await page.getByRole('button', { name: 'Review transfer' }).click();
  await expect(page.getByRole('alert')).toContainText('Not enough demo balance');
  await page.getByLabel('Amount (SAR)').fill('20');
  await page.getByRole('button', { name: 'Review transfer' }).click();
  await expect(page.getByRole('button', { name: 'Confirm demo transfer' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm demo transfer' }).click();
  await expect(page.getByRole('status')).toContainText('Demo transfer complete');
  await page.keyboard.press('Escape');
  await page.getByRole('navigation').getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.getByLabel('Available balance 1264.50 Saudi riyals')).toBeVisible();
});

test('dialog traps focus and browser Back closes it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Add money', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true);
  }
  await page.goBack();
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('desktop is centered and narrow screens have no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto('/cards');
  const box = await page.locator('.phone').boundingBox();
  expect(box?.width).toBe(402);
  expect(Math.abs((box!.x + box!.width / 2) - 640)).toBeLessThan(1);
  await page.screenshot({ path: `${captureDir}/desktop.png` });
  for (const width of [320, 375, 430]) {
    await page.setViewportSize({ width, height: 874 });
    for (const path of ['/', '/rewards', '/cards', '/market', '/more']) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});
