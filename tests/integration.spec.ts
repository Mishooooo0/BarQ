import { addGroup, apiToken, expect, fund, signIn, test } from './fixtures';

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

test('AI Analyst plans a day from the wallet slider; Hangouts is its own page and plans for the group', async ({ page }) => {
  fund('meshal', 1860.4);
  await signIn(page);
  await page.getByRole('link', { name: /AI Analyst/ }).click();
  await expect(page.getByRole('heading', { name: 'AI Analyst', exact: true })).toBeVisible();
  await expect(page.getByText('Suggested budgets')).toBeVisible();
  await page.getByRole('tab', { name: 'Daily plan' }).click();
  const slider = page.getByRole('slider', { name: "Today's budget" });
  const max = Number(await slider.getAttribute('max'));
  expect(max).toBe(1860);
  await slider.fill('150');
  await page.getByRole('button', { name: 'Plan my day' }).click();
  await expect(page.locator('.plan-item').first()).toBeVisible();
  await expect(page.locator('.analyst-bubble')).toContainText('SAR 150');
  await expect(page.getByRole('tab', { name: 'Hangout' })).toHaveCount(0);
  await page.getByRole('link', { name: /Hangouts/ }).click();
  await expect(page.getByRole('heading', { name: 'Hangouts', exact: true })).toBeVisible();
  await page.getByRole('radio', { name: /BarQ Developers/ }).click();
  await page.getByRole('slider', { name: 'Your hangout budget' }).fill('120');
  await page.getByRole('button', { name: 'Plan the hangout' }).click();
  await expect(page.locator('.per-person')).toContainText('120.00');
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
  await expect(page.getByRole('heading', { name: 'Transactions', exact: true })).toBeVisible();
});

test('Barq advice appears in the Analyst bubble and tips, with no Claude name on screen', async ({ page }) => {
  await signIn(page);
  await page.goto('/analyst');
  await expect(page.locator('.analyst-bubble')).toHaveText('Fake advice for Meshal');
  await expect(page.locator('.tip-list li')).toHaveCount(2);
  await expect(page.locator('.ai-source')).toHaveText('Answered by Barq AI.');
  expect(await page.locator('body').innerText()).not.toMatch(/claude/i);
});

test('Hangouts opens from Home and More', async ({ page }) => {
  await signIn(page);
  await page.getByRole('link', { name: /Hangouts/ }).click();
  await expect(page.getByRole('heading', { name: 'Hangouts', exact: true })).toBeVisible();
  await page.goto('/more');
  await page.getByRole('link', { name: /Hangouts/ }).click();
  await expect(page.getByRole('list', { name: 'Members' })).toBeVisible();
});

test('Create a group: name it, pick friends, and it is selected on the Hangouts page', async ({ page }) => {
  await signIn(page);
  await page.goto('/hangouts');
  await page.getByRole('button', { name: 'Create a group' }).click();
  const form = page.getByRole('form', { name: 'Create a group' });
  await form.getByRole('button', { name: 'Create the group' }).click();
  await expect(form.getByRole('alert')).toHaveText('Give the group a name.');
  await form.getByLabel('Group name').fill('Weekend crew');
  await form.getByRole('button', { name: 'Create the group' }).click();
  await expect(form.getByRole('alert')).toHaveText('Choose at least one friend for the group.');
  await form.getByLabel('Sultana').check();
  await form.getByLabel('Rasel').check();
  await form.getByRole('button', { name: 'Create the group' }).click();
  await expect(page.getByRole('radio', { name: 'Weekend crew' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('list', { name: 'Members' }).getByRole('listitem')).toHaveCount(3);
  // Sultana sees the new group too.
  const sultana = await apiToken(page, 'sultana');
  const groups = await (await page.request.get('/api/me/groups', { headers: { authorization: `Bearer ${sultana}` } })).json();
  expect(groups.map((g: { name: string }) => g.name)).toContain('Weekend crew');
  // The same name again is refused.
  await page.getByRole('button', { name: 'Create a group' }).click();
  await page.getByLabel('Group name').fill('weekend crew');
  await page.getByLabel('Rasel').check();
  await page.getByRole('button', { name: 'Create the group' }).click();
  await expect(page.getByRole('form', { name: 'Create a group' }).getByRole('alert')).toHaveText('You already have a group called weekend crew.');
});

test('a member can add someone to a group on the Hangouts page', async ({ page }) => {
  addGroup('weekend', 'Weekend crew', ['meshal', 'abdullah-m']);
  await signIn(page);
  await page.goto('/hangouts');
  await page.getByRole('radio', { name: /Weekend crew/ }).click();
  await page.getByLabel('Add someone to Weekend crew').selectOption({ label: 'Sultana' });
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Sultana joined Weekend crew');
  await expect(page.getByRole('list', { name: 'Members' })).toContainText('Sultana');
  await page.getByRole('radio', { name: /BarQ Developers/ }).click();
  await expect(page.getByRole('list', { name: 'Members' }).getByRole('listitem')).toHaveCount(5);
});

test('Market pay at places saves a back-dated payment and charges the wallet', async ({ page }) => {
  fund('meshal', 500);
  await signIn(page);
  const start = 500;
  await page.goto('/market');
  await page.getByRole('link', { name: /Pay at places/ }).click();
  await expect(page.locator('.pay-row')).toHaveCount(208);
  await page.getByRole('radio', { name: 'Groceries' }).click();
  await expect(page.locator('.pay-row')).toHaveCount(10);
  const row = page.locator('.pay-row').first();
  const name = (await row.locator('h3').innerText()).trim();
  await row.click();
  const today = new Date(Date.now() + 3 * 3_600_000).toISOString().slice(0, 10);
  const lastMonth = new Date(Date.now() + 3 * 3_600_000 - 30 * 86_400_000).toISOString().slice(0, 10);
  await page.getByLabel('Payment date').fill('2099-01-01');
  await expect(page.getByRole('alert')).toContainText("can't be in the future");
  await page.getByLabel('Payment date').fill(lastMonth);
  await page.getByRole('button', { name: /^Pay/ }).click();
  const record = page.locator('.receipt-table');
  await expect(record).toContainText(name);
  await expect(record).toContainText('Groceries');
  await expect(record).toContainText(lastMonth);
  await expect(record).toContainText('120.00');
  await expect(page.locator('.payment-done .payment-mascot')).toBeVisible();
  await page.getByRole('button', { name: 'Choose another place' }).click();
  await expect(page.locator('.payments-table tbody tr')).toHaveCount(1);
  await page.getByRole('navigation').getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.getByLabel(`Available balance ${(start - 120).toFixed(2)} Saudi riyals`)).toBeVisible();
  expect(today > lastMonth).toBe(true);
});

async function planAndAsk(page: import('@playwright/test').Page) {
  await page.goto('/hangouts');
  await page.getByRole('slider', { name: 'Your hangout budget' }).fill('100');
  await page.getByRole('button', { name: 'Plan the hangout' }).click();
  await expect(page.locator('.plan-item').first()).toBeVisible();
  await page.getByRole('button', { name: "Ask the group: who's paying?" }).click();
  await expect(page.locator('.hangout-card')).toHaveCount(1);
  return page.locator('.hangout-card').first();
}
async function voteAs(page: import('@playwright/test').Page, id: string, choice: 'split' | 'own' | 'pay') {
  const token = await apiToken(page, id);
  const list = await (await page.request.get('/api/hangouts', { headers: { authorization: `Bearer ${token}` } })).json();
  const res = await page.request.post(`/api/hangouts/${list[0].id}/vote`, { headers: { authorization: `Bearer ${token}` }, data: { choice } });
  expect(res.status()).toBe(200);
}

test('who pays: one "I will pay it" wins and that person pays the bill', async ({ page }) => {
  fund('meshal', 1000);
  await signIn(page);
  const card = await planAndAsk(page);
  await expect(card).toContainText('0 of 5 voted');
  await card.getByRole('button', { name: 'I will pay it' }).click();
  await expect(card).toContainText('1 of 5 voted');
  for (const id of ['abdullah-m', 'abdullah-s', 'sultana']) await voteAs(page, id, 'split');
  await voteAs(page, 'rasel', 'own');
  await page.reload();
  await expect(card.locator('.hangout-result')).toHaveText('Meshal pays the bill');
  await expect(card).toContainText('split 3 · own 1 · I will pay 1');
  await card.getByRole('button', { name: /^Pay/ }).click();
  await expect(page.locator('.payment-done .payment-mascot')).toBeVisible();
  // Everyone who owed has paid, so the hangout ends and moves from Active to History.
  await expect(page.getByRole('tab', { name: 'Active (0)' })).toBeVisible();
  await page.getByRole('tab', { name: 'History (1)' }).click();
  const ended = page.locator('.hangout-card').first();
  await expect(ended.locator('.hangout-status')).toHaveText('Paid');
  await expect(ended.locator('.hangout-date')).toContainText('Ended');
  await expect(ended.locator('.hangout-result')).toHaveText('Meshal pays the bill');
});

test('who pays: two volunteers play three games, Flappy Bird first, and the highest total pays', async ({ page }) => {
  fund('meshal', 500);
  await signIn(page);
  const card = await planAndAsk(page);
  await card.getByRole('button', { name: 'I will pay it' }).click();
  await voteAs(page, 'sultana', 'pay');
  for (const id of ['abdullah-m', 'abdullah-s']) await voteAs(page, id, 'split');
  await voteAs(page, 'rasel', 'own');
  await page.reload();
  await expect(card.locator('.hangout-result')).toHaveText('Meshal vs Sultana: the highest total pays');
  await card.getByRole('link', { name: 'Play the games' }).click();
  const sultana = await apiToken(page, 'sultana');
  const auth = { headers: { authorization: `Bearer ${sultana}` } };
  const hangouts = await (await page.request.get('/api/hangouts', auth)).json();
  const session = await (await page.request.get(`/api/game-sessions/${hangouts[0].sessionId}`, auth)).json();
  const games = await (await page.request.get('/api/games')).json() as { id: string; name: string; engine: string }[];
  const order = session.rounds.map((round: { gameId: string }) => games.find(g => g.id === round.gameId)!);
  expect(order.map(g => g.engine)[0]).toBe('fly');
  expect(new Set(order.map(g => g.id)).size).toBe(3);
  await expect(page.getByRole('list', { name: 'The games' })).toHaveText(order.map((g, i) => `${i + 1}${g.name}`).join(''));
  // Playing the real games in a test is not practical, so each frame reports a finished game the way the games do.
  const play = async (i: number, points: number) => {
    await page.getByRole('button', { name: `Play ${order[i].name}` }).click();
    await expect(page.getByText(`Game ${i + 1} of 3: ${order[i].name}`)).toBeVisible();
    const frame = page.frameLocator(`iframe[title="${order[i].name}"]`);
    await expect(frame.locator(`#g-${order[i].engine}`)).toBeVisible();
    // A score from a different game is ignored; only the game being played counts.
    const wrong = games.find(g => g.engine !== order[i].engine)!.engine;
    await frame.locator('body').evaluate((_, [game, value]) => parent.postMessage({ type: 'points-games:score', game, score: value }, location.origin), [wrong, 999] as const);
    await frame.locator('body').evaluate((_, [game, value]) => parent.postMessage({ type: 'points-games:score', game, score: value }, location.origin), [order[i].engine, points] as const);
    await expect(page.locator('iframe')).toHaveCount(0);
  };
  // Meshal plays his three games in order on his phone, without waiting for Sultana.
  await play(0, 3);
  await expect(page.getByRole('list', { name: 'Scores' })).toContainText('1 of 3 games played');
  await play(1, 40);
  await play(2, 20);
  await expect(page.getByRole('list', { name: 'Scores' })).toContainText('Played every game');
  await expect(page.getByRole('list', { name: 'Scores' })).toContainText('63 points');
  await expect(page.getByText('You have played all 3 games.')).toBeVisible();
  // Sultana plays on her own phone: her games are recorded through the API, and Meshal's board updates by itself.
  for (const [i, points] of [8, 50, 30].entries()) {
    const scored = await page.request.post(`/api/game-sessions/${session.id}/scores`, { ...auth, data: { playerId: 'sultana', points, gameId: session.rounds[i].gameId } });
    expect(scored.status()).toBe(200);
  }
  await expect(page.getByRole('heading', { name: 'Sultana pays the bill' })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('Highest total: 88 points.')).toBeVisible();
  await page.getByRole('link', { name: 'Back to Hangouts' }).click();
  await expect(page.locator('.hangout-card').first().locator('.hangout-result')).toHaveText('Sultana pays the bill');
});

test('who pays: a split/own tie ends as everyone pays their own', async ({ page }) => {
  fund('meshal', 500);
  await signIn(page);
  const card = await planAndAsk(page);
  await card.getByRole('button', { name: 'Split the bill' }).click();
  await voteAs(page, 'abdullah-m', 'split');
  await voteAs(page, 'abdullah-s', 'own');
  await voteAs(page, 'sultana', 'own');
  await page.reload();
  await card.getByRole('button', { name: 'End the vote now' }).click();
  await expect(card.locator('.hangout-result')).toHaveText('Everyone pays their own');
  await expect(card.locator('.dues-list li')).toHaveCount(5);
  await card.getByRole('button', { name: /^Pay/ }).click();
  await expect(card.locator('.dues-list li').filter({ hasText: 'You' })).toContainText('Paid');
  await expect(card.locator('.hangout-status')).toHaveText('Decided');
});

test('when Claude-Dev is slow the Ring API plans the day and the screen says so', async ({ page }) => {
  fund('meshal', 500);
  await signIn(page);
  await page.goto('/analyst');
  await expect(page.locator('.ai-source').first()).toHaveText('Answered by Barq AI.');
  await page.getByRole('tab', { name: 'Daily plan' }).click();
  await page.getByRole('slider', { name: "Today's budget" }).fill('99');
  await page.getByRole('button', { name: 'Plan my day' }).click();
  await expect(page.locator('.plan-item').first()).toBeVisible();
  await expect(page.locator('.ai-source')).toContainText('Answered by Barq AI (backup engine, because the main one was slow or unavailable).');
});

test('top-up works when randomUUID is unavailable (LAN HTTP address)', async ({ page }) => {
  // Browsers only offer crypto.randomUUID on HTTPS or localhost; the app must not depend on it.
  await page.addInitScript(() => Object.defineProperty(window.crypto, 'randomUUID', { value: undefined, configurable: true }));
  await signIn(page);
  await page.getByRole('button', { name: 'Add money', exact: true }).click();
  await page.getByLabel('Amount (SAR)').fill('100');
  await page.getByRole('button', { name: 'Review top-up' }).click();
  await page.getByRole('button', { name: 'Confirm top-up' }).click();
  await expect(page.getByRole('status')).toContainText('Money added');
  await page.getByRole('button', { name: 'Close dialog' }).click();
  await expect(page.getByLabel('Available balance 100.00 Saudi riyals')).toBeVisible();
});

test('no phone status bar (time, signal, battery) on any screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Meshal', exact: true })).toBeVisible();
  await expect(page.locator('.status-bar')).toHaveCount(0);
  await signIn(page);
  for (const path of ['/', '/more', '/occasions', '/savings', '/hangouts']) {
    await page.goto(path);
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
    await expect(page.locator('.status-bar, .battery')).toHaveCount(0);
    expect(await page.locator('.phone').innerText()).not.toMatch(/\b5G\b|12:10/);
  }
});

test('Occasions: plan Eid al-Fitr with an Eidia list and use Barq\'s split', async ({ page }) => {
  await signIn(page, 'sultana');
  await page.getByRole('link', { name: /Occasions/ }).click();
  await expect(page.getByText('Nothing planned yet')).toBeVisible();
  await page.getByRole('radio', { name: 'Eid al-Fitr' }).click();
  await page.getByLabel('Occasion budget').fill('1200');
  await page.getByRole('button', { name: 'Create the budget' }).click();
  await expect(page.getByRole('heading', { name: /Eid al-Fitr \d{4}/ })).toBeVisible();
  const lines = page.getByRole('list', { name: 'Budget lines' });
  await expect(lines.getByRole('listitem')).toHaveCount(4);
  await page.getByLabel('Eidia name').fill('Noura');
  await page.getByLabel('Eidia amount').fill('100');
  await page.getByLabel('Eidia amount').press('Enter');
  await page.getByLabel('Eidia name').fill('Faisal');
  await page.getByLabel('Eidia amount').fill('200');
  await page.getByLabel('Eidia amount').press('Enter');
  await expect(page.getByRole('heading', { name: /Eidia · .*300\.00 for 2 people/ })).toBeVisible();
  // The saving plan: what is not bought or given yet, per day and per month until Eid.
  const plan = page.locator('.occasion-summary').getByRole('region', { name: 'Saving plan' });
  await expect(plan).toContainText('Per day');
  await expect(plan).toContainText('Per month');
  await expect(page.locator('.analyst-bubble')).toContainText('a day, or');
  await page.getByLabel('Given to Faisal').check();
  await expect(page.getByText(/Bought or given so far: .*200\.00/)).toBeVisible();
  await page.getByRole('button', { name: 'Split the rest of my budget' }).click();
  await expect(page.locator('.analyst-bubble')).toHaveText('Fake plan for Eid al-Fitr.');
  await expect(page.getByText('Answered by Barq AI.')).toBeVisible();
  // Barq's answer includes the saving plan until the date: per day and per month.
  const split = page.locator('.info-panel').filter({ hasText: "Barq's split" });
  await expect(split.getByRole('region', { name: 'Saving plan' })).toContainText('Per day');
  await expect(split.getByRole('region', { name: 'Saving plan' })).toContainText('Per month');
  await expect(split.locator('.saving-tip')).toHaveText('Move it to the Saving box on payday.');
  await page.getByRole('button', { name: 'Use this split' }).click();
  await expect(lines.getByRole('listitem')).toHaveCount(3);
  await expect(lines).toContainText('Clothes');
  // Saved on the server: the list shows the occasion and stays within the budget.
  await page.reload();
  await expect(page.getByRole('list', { name: 'Eidia list' }).getByRole('listitem')).toHaveCount(2);
  await expect(page.getByLabel('Given to Faisal')).toBeChecked();
  await page.getByRole('button', { name: 'Go back' }).click();
  await expect(page.locator('.occasion-card')).toHaveCount(1);
  await expect(page.locator('.occasion-card')).not.toContainText('Over budget');
});

test('Saving box: set an end-of-year goal and move money from the wallet', async ({ page }) => {
  fund('abdullah-m', 1000);
  await signIn(page, 'abdullah-m');
  await page.getByRole('link', { name: /Saving box/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Saving box' })).toBeVisible();
  await page.getByLabel('Saving goal').fill('800');
  await page.getByRole('button', { name: 'Set goal' }).click();
  await expect(page.locator('.analyst-bubble')).toContainText('a week');
  await page.getByLabel('Amount to move').fill('300');
  await page.getByRole('button', { name: 'Add to the box' }).click();
  await expect(page.getByText('SAR 300 added to your Saving box.')).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Progress to your goal' })).toHaveAttribute('aria-valuenow', '38');
  await expect(page.getByLabel('Amount to move')).toHaveValue('');
  await page.getByLabel('Amount to move').fill('500');
  await page.getByRole('button', { name: 'Add to the box' }).click();
  await expect(page.locator('.analyst-bubble')).toContainText('You reached your goal');
  await page.getByLabel('Amount to move').fill('5000');
  await page.getByRole('button', { name: 'Take out' }).click();
  await expect(page.getByRole('alert')).toContainText('only SAR 800');
  await page.goto('/');
  await expect(page.locator('.savings-strip')).toContainText('800.00');
  await expect(page.getByLabel(/Available balance 200\.00/)).toBeVisible();
});
