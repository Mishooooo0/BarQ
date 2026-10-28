import { account, expect, fund, signIn, test } from './fixtures';
const captureDir = process.env.BARQ_CAPTURE_DIR ?? 'test-results/visual';
const balanceLabel = (value: number) => `Available balance ${value.toFixed(2)} Saudi riyals`;

test('sign-in rejects a wrong PIN and lists the five accounts', async ({ page }) => {
  await page.goto('/');
  for (const name of ['Abdullah M', 'Abdullah S', 'Meshal', 'Sultana', 'Rasel']) await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
  await page.screenshot({ path: `${captureDir}/login.png` });
  await page.getByRole('button', { name: 'Meshal', exact: true }).click();
  await page.getByLabel('4-digit PIN').fill('0000');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert')).toContainText('Name or PIN is incorrect');
  await page.getByLabel('4-digit PIN').fill(account('meshal').pin);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByLabel(balanceLabel(0))).toBeVisible();
  await expect(page.getByText('MESHAL', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel(balanceLabel(0))).toBeVisible();
});

test('no Demo wording is left in the main screens', async ({ page }) => {
  await signIn(page);
  for (const path of ['/', '/rewards', '/cards', '/market', '/more', '/analyst', '/transactions']) {
    await page.goto(path);
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
    expect(await page.locator('body').innerText()).not.toMatch(/demo/i);
  }
});

test('lower Products tiles open and show no sample records', async ({ page }) => {
  await signIn(page, 'rasel');
  await page.goto('/more');
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => page.locator('main').evaluate(el => getComputedStyle(el).opacity)).toBe('1');
  await page.getByRole('button', { name: 'Offers', exact: true }).scrollIntoViewIfNeeded();
  await expect.poll(async () => (await page.locator('.more-phone .page-header').boundingBox())?.y).toBe(0);
  await page.screenshot({ path: `${captureDir}/more-lower.png` });
  await page.getByRole('button', { name: 'Youth Accounts', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('No youth accounts yet');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Domestic Labor Salaries', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('No salary payees yet');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Offers', exact: true }).click();
  await page.getByRole('dialog').getByRole('link', { name: 'barq Marathon' }).click();
  await expect(page.getByRole('button', { name: 'Join the marathon' })).toBeVisible();
  await page.getByRole('navigation').getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.getByLabel(balanceLabel(0))).toBeVisible();
});

test('Home lower promotion preserves the supplied artwork and opens the ranking', async ({ page }) => {
  await signIn(page);
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => page.locator('main').evaluate(el => getComputedStyle(el).opacity)).toBe('1');
  await page.getByRole('button', { name: /barq Marathon — click/ }).scrollIntoViewIfNeeded();
  await expect(page.locator('.phone')).toHaveClass(/is-scrolled/);
  await page.screenshot({ path: `${captureDir}/home-lower.png` });
  await page.getByRole('button', { name: /barq Marathon — click/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Your ranking');
  await page.getByRole('link', { name: 'Explore marathon' }).click();
  await expect(page.getByRole('button', { name: 'Join the marathon' })).toBeVisible();
});

test('main screens render with navigation and no runtime errors', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await signIn(page);
  for (const [path, name] of [['/', 'home'], ['/rewards', 'rewards'], ['/cards', 'cards'], ['/market', 'market'], ['/more', 'more'], ['/analyst', 'analyst']]) {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
    await expect.poll(() => page.locator('main').evaluate(el => getComputedStyle(el).opacity)).toBe('1');
    await expect.poll(() => page.evaluate(() => [...document.querySelectorAll('svg image')].every(el => !!el.getAttribute('href')))).toBe(true);
    await page.screenshot({ path: `${captureDir}/${name}.png` });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
});

test('all bottom tabs navigate and More scrolls above the fixed navigation', async ({ page }) => {
  await signIn(page);
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
  await signIn(page);
  const start = 0;
  await page.getByRole('button', { name: 'Hide balance' }).click();
  await expect(page.getByLabel('Balance hidden', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Show balance' }).click();
  await page.getByRole('button', { name: 'Add money', exact: true }).click();
  await page.getByRole('button', { name: 'Review top-up' }).click();
  await expect(page.getByRole('alert')).toContainText('Enter an amount');
  await page.getByLabel('Amount (SAR)').fill('100');
  await page.getByRole('button', { name: 'Review top-up' }).click();
  await page.getByRole('button', { name: 'Confirm top-up' }).click();
  await expect(page.getByRole('status')).toContainText('Money added');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.getByLabel(balanceLabel(start + 100))).toBeVisible();
  await page.getByRole('link', { name: 'Transactions', exact: true }).click();
  await expect(page.getByRole('button', { name: /Wallet top-up/ }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Money out', exact: true }).click();
  await expect(page.getByRole('button', { name: /Wallet top-up/ })).toHaveCount(0);
  // The top-up is stored on the server, so it survives a reload.
  await page.goto('/');
  await expect(page.getByLabel(balanceLabel(start + 100))).toBeVisible();
});

test('card freezing survives navigation and no credentials are requested', async ({ page }) => {
  await signIn(page);
  await page.goto('/cards');
  await page.getByRole('link', { name: /National Day/ }).click();
  await page.getByRole('button', { name: 'Freeze card' }).click();
  await expect(page.getByRole('button', { name: 'Unfreeze card' })).toBeVisible();
  await page.getByRole('button', { name: 'Card details' }).click();
  await expect(page.getByText('No card number, expiry or security code is stored.')).toBeVisible();
  await expect(page.getByText('Cardholder: Meshal')).toBeVisible();
  await page.getByRole('navigation').getByRole('link', { name: 'Cards', exact: true }).click();
  await page.getByRole('link', { name: /National Day/ }).click();
  await expect(page.getByRole('button', { name: 'Unfreeze card' })).toBeVisible();
});

test('market search, favorites and checkout charge the stored wallet', async ({ page }) => {
  fund('meshal', 200);
  await signIn(page);
  await page.goto('/market');
  await page.getByRole('textbox', { name: 'Search market' }).fill('Xbox');
  await page.getByRole('link', { name: /Xbox gift card/ }).click();
  await page.getByRole('button', { name: 'Save to favorites' }).click();
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'Market', exact: true }).click();
  await page.getByRole('button', { name: 'Favorites', exact: true }).click();
  await expect(page.getByRole('link', { name: /Xbox gift card/ })).toBeVisible();
  await page.getByRole('link', { name: 'Shopping cart, 1 items' }).click();
  await page.getByRole('button', { name: 'Complete order' }).click();
  await expect(page.getByRole('heading', { name: 'Order complete' })).toBeVisible();
  await page.getByRole('navigation').getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.getByLabel(balanceLabel(150))).toBeVisible();
});

test('wheel credits cashback once, quests complete and marathon entry is simulated', async ({ page }) => {
  await signIn(page);
  await page.goto('/rewards');
  await page.getByRole('link', { name: /Spin the Wheel/ }).click();
  await page.getByRole('button', { name: 'Spin the wheel', exact: true }).click();
  await expect(page.getByText('You won SAR 5 in cashback!')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Spin used' })).toBeDisabled();
  await page.getByRole('navigation').getByRole('link', { name: 'Rewards', exact: true }).click();
  await expect(page.locator('.cashback-summary')).toContainText('5.00');
  await page.getByRole('link', { name: /Quests/ }).click();
  await page.getByRole('link', { name: 'Explore', exact: false }).first().click();
  await page.goBack();
  await expect(page.getByText('Done', { exact: true })).toBeVisible();
  await page.getByRole('navigation').getByRole('link', { name: 'Rewards', exact: true }).click();
  await page.getByRole('link', { name: /barq Marathon/ }).click();
  await page.getByRole('button', { name: 'Join the marathon' }).click();
  await expect(page.getByRole('status')).toContainText('No real prize draw');
});

test('transfer rejects overspending, requires review and credits the other account', async ({ page }) => {
  fund('meshal', 100);
  await signIn(page);
  const start = 100;
  await page.goto('/more');
  await page.getByRole('button', { name: 'Transfer to barq wallet' }).click();
  await page.getByLabel('Recipient').selectOption({ label: 'Sultana' });
  await page.getByLabel('Amount (SAR)').fill(String(Math.ceil(start + 100)));
  await page.getByRole('button', { name: 'Review transfer' }).click();
  await expect(page.getByRole('alert')).toContainText('Not enough balance');
  await page.getByLabel('Amount (SAR)').fill('20');
  await page.getByRole('button', { name: 'Review transfer' }).click();
  await page.getByRole('button', { name: 'Confirm transfer' }).click();
  await expect(page.getByRole('status')).toContainText('Sultana has received the money');
  await page.keyboard.press('Escape');
  await page.getByRole('navigation').getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.getByLabel(balanceLabel(start - 20))).toBeVisible();
  await page.getByRole('button', { name: 'Account', exact: true }).click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByRole('button', { name: 'Sultana', exact: true }).click();
  await page.getByLabel('4-digit PIN').fill(account('sultana').pin);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByLabel(balanceLabel(20))).toBeVisible();
});

test('dialog traps focus and browser Back closes it', async ({ page }) => {
  await signIn(page);
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
  await signIn(page);
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto('/cards');
  const box = await page.locator('.phone').boundingBox();
  expect(box?.width).toBe(402);
  expect(Math.abs((box!.x + box!.width / 2) - 640)).toBeLessThan(1);
  await page.screenshot({ path: `${captureDir}/desktop.png` });
  for (const width of [320, 375, 430]) {
    await page.setViewportSize({ width, height: 874 });
    for (const path of ['/', '/rewards', '/cards', '/market', '/more', '/analyst']) {
      await page.goto(path);
      await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});
