import type { Page } from '@playwright/test';
import { apiToken, expect, fund, test } from './fixtures';

async function signInArabic(page: Page, name = 'Meshal', pin = '٣٠٠٣') {
  await page.goto('/');
  await page.getByRole('button', { name: 'العربية' }).click();
  await page.getByRole('button', { name, exact: true }).click();
  await page.getByLabel('الرقم السري (٤ أرقام)').fill(pin);
  await page.getByRole('button', { name: 'دخول' }).click();
  await expect(page.getByRole('navigation', { name: 'التنقل الرئيسي' })).toBeVisible();
}

test('the toggle switches the app to Arabic: right to left, Arabic digits, and it stays after a reload', async ({ page }) => {
  fund('meshal', 1365.5);
  await page.goto('/');
  await page.getByRole('button', { name: 'العربية' }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.getByText('اختر حسابك')).toBeVisible();
  // A wrong PIN typed in Arabic digits gets the server's answer in Arabic.
  await page.getByRole('button', { name: 'Meshal', exact: true }).click();
  await page.getByLabel('الرقم السري (٤ أرقام)').fill('١١١١');
  await page.getByRole('button', { name: 'دخول' }).click();
  await expect(page.getByRole('alert')).toHaveText('الاسم أو الرقم السري غلط.');
  await page.getByLabel('الرقم السري (٤ أرقام)').fill('٣٠٠٣');
  await page.getByRole('button', { name: 'دخول' }).click();
  await expect(page.locator('.balance-value')).toContainText('١٬٣٦٥');
  await expect(page.locator('.balance-value')).toContainText('٫٥٠');
  const nav = page.getByRole('navigation', { name: 'التنقل الرئيسي' });
  await expect(nav).toContainText('الرئيسية');
  // Right to left: Home is the rightmost tab.
  const home = await nav.getByRole('link', { name: 'الرئيسية' }).boundingBox();
  const more = await nav.getByRole('link', { name: 'المزيد' }).boundingBox();
  expect(home!.x).toBeGreaterThan(more!.x);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(nav).toContainText('المكافآت');
  // Back to English from the account sheet.
  await page.getByRole('button', { name: 'الحساب', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'English' }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  // The sheet stays open, now in English.
  await expect(page.getByRole('dialog')).toContainText('Your account');
  await expect(page.getByRole('main').getByText('Available balance', { exact: true })).toBeVisible();
});

test('Barq answers in Arabic when the app is in Arabic', async ({ page }) => {
  fund('meshal', 500);
  await signInArabic(page);
  await page.goto('/analyst');
  await expect(page.locator('.analyst-bubble')).toHaveText('نصيحة تجريبية لـMeshal');
  await expect(page.locator('.tip-list li').first()).toHaveText('خفّف زيارة كوفي وحدة بالأسبوع.');
  await page.getByRole('tab', { name: 'خطة اليوم' }).click();
  await page.getByRole('slider', { name: 'ميزانية اليوم' }).fill('150');
  await page.getByRole('button', { name: 'رتّب يومي' }).click();
  // Numbers inside Barq's text are shown with Arabic-Indic digits.
  await expect(page.locator('.analyst-bubble')).toHaveText('خطة تجريبية بميزانية ١٥٠ ريال.');
  await expect(page.locator('.plan-item').first()).toContainText('٠٨:٣٠');
  await expect(page.getByText('جاوبك برق.')).toBeVisible();
});

test('occasions, Eidia and the Saving box work in Arabic with Arabic digits', async ({ page }) => {
  fund('sultana', 1000);
  await signInArabic(page, 'Sultana', '٤٠٠٤');
  await page.goto('/occasions');
  await page.getByRole('radio', { name: 'عيد الفطر' }).click();
  await page.getByLabel('ميزانية المناسبة').fill('١٢٠٠');
  await page.getByRole('button', { name: 'سوّ الميزانية' }).click();
  await expect(page.getByRole('heading', { name: /^عيد الفطر [٠-٩]{4}$/ })).toBeVisible();
  await expect(page.getByRole('list', { name: 'بنود الميزانية' })).toContainText('ملابس العيد');
  await page.getByLabel('اسم صاحب العيدية').fill('نورة');
  await page.getByLabel('مبلغ العيدية').fill('١٠٠');
  await page.getByLabel('مبلغ العيدية').press('Enter');
  await expect(page.getByRole('list', { name: 'قائمة العيدية' })).toContainText('نورة');
  await expect(page.getByLabel('عيدية نورة')).toHaveValue('١٠٠');
  await page.getByRole('button', { name: 'قسّم باقي ميزانيتي' }).click();
  await expect(page.locator('.analyst-bubble')).toHaveText('خطة تجريبية لـعيد الفطر.');
  await page.goto('/savings');
  await page.getByLabel('هدف التوفير').fill('٨٠٠');
  await page.getByRole('button', { name: 'حدد الهدف' }).click();
  await page.getByLabel('المبلغ اللي تبي تحركه').fill('٣٠٠');
  await page.getByRole('button', { name: 'حطها في الحصّالة' }).click();
  await expect(page.getByText('انضاف ٣٠٠ ريال لحصّالتك.')).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'تقدّمك للهدف' })).toHaveAttribute('aria-valuenow', '38');
});

test('in Arabic, groups are "شلة": create one from the Hangouts page', async ({ page }) => {
  await signInArabic(page, 'Sultana', '٤٠٠٤');
  await page.goto('/hangouts');
  await page.getByRole('button', { name: 'أضف شلة جديدة' }).click();
  const form = page.getByRole('form', { name: 'أضف شلة جديدة' });
  await form.getByLabel('اسم الشلة').fill('شلة الويكند');
  await form.getByLabel('Meshal').check();
  await form.getByRole('button', { name: 'سوّ الشلة' }).click();
  await expect(page.getByRole('radio', { name: 'شلة الويكند' })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('list', { name: 'الأعضاء' }).getByRole('listitem')).toHaveCount(2);
});

// Words that may stay in Latin letters: people's names, the group name, the "English" toggle, card brand marks and
// reference codes. Place names, addresses and districts from the Places database are added below.
const allowed = new Set(['Abdullah', 'ABDULLAH', 'M', 'S', 'Meshal', 'MESHAL', 'Sultana', 'Rasel', 'BarQ', 'Developers', 'English', 'J', 'Q', 'K', 'A', 'BARQ']);

test('Arabic screens and sheets show no English', async ({ page }) => {
  test.setTimeout(120_000); // visits every screen and sheet
  fund('meshal', 2500);
  const token = await apiToken(page, 'meshal');
  const places = (await (await page.request.get('/api/places?limit=250')).json()).items as { record_id: string; name: string; address: string; district?: string; categoryId: string }[];
  for (const place of places) for (const word of `${place.name} ${place.address} ${place.district ?? ''}`.match(/[A-Za-z][A-Za-z'’.-]*/g) ?? []) allowed.add(word.replace(/[.'’-]+$/, ''));
  const auth = { headers: { authorization: `Bearer ${token}` } };
  await page.request.post('/api/payments', { ...auth, data: { placeId: places.find(p => p.categoryId === 'cafe')!.record_id } });
  await page.request.post('/api/transfers', { ...auth, data: { to: 'sultana', amount: 50 } });
  await page.request.post('/api/savings/deposit', { ...auth, data: { amount: 100 } });
  const occasion = await (await page.request.post('/api/occasions', { ...auth, data: { type: 'eid-adha', budget: 900, title: 'عيد الأضحى' } })).json();
  await signInArabic(page);
  const scan = async (where: string) => {
    const text = await page.evaluate(() => {
      const parts = [(document.querySelector('.phone') as HTMLElement | null)?.innerText ?? '', (document.querySelector('dialog[open]') as HTMLElement | null)?.innerText ?? ''];
      for (const el of document.querySelectorAll('.phone [aria-label], .phone [placeholder], dialog[open] [aria-label], dialog[open] [placeholder]')) parts.push(el.getAttribute('aria-label') ?? '', el.getAttribute('placeholder') ?? '');
      return parts.join(' ');
    });
    const english = [...new Set((text.match(/[A-Za-z][A-Za-z'’.-]*/g) ?? []).map(w => w.replace(/[.'’-]+$/, '')).filter(w => w && !allowed.has(w)))];
    expect(english, `English on ${where}`).toEqual([]);
  };
  for (const path of ['/', '/rewards', '/rewards/wheel', '/rewards/quests', '/rewards/marathon', '/cards', '/cards/national', '/market', '/market/category/gaming', '/market/product/ps', '/market/cart', '/market/pay', '/more', '/places', '/analyst', '/hangouts', '/occasions', `/occasions/${occasion.id}`, '/savings', '/transactions', '/nope']) {
    await page.goto(path);
    await expect(page.getByRole('navigation', { name: 'التنقل الرئيسي' })).toBeVisible();
    await page.waitForLoadState('networkidle');
    await scan(path);
  }
  for (const sheet of ['account', 'notifications', 'statistics', 'add-money', 'add-card', 'help', 'support', 'transfer-wallet', 'request-money', 'international', 'local-bank', 'baloot', 'new-account', 'promotion', 'categories', 'salary', 'offers']) {
    await page.goto(`/?sheet=${sheet}`);
    await expect(page.getByRole('dialog')).toBeVisible();
    await scan(`sheet ${sheet}`);
  }
});
