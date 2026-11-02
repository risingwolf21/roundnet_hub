import { test, expect, Page } from '@playwright/test';
import { SupabaseClient } from '@supabase/supabase-js';
import { adminClient, ensureUser, grantUser, logPageOnFailure, signIn } from './helpers';

// Drinks: book drinks on /drinks/list and see the open amount on /drinks/payments.
// This is also the first real coverage of the add_drinks_history RPC (pgTAP 080 only checks
// that auth.users.id exists).
const stamp = Date.now();
const DRINK_NAME = `E2E Mate ${stamp}`;
const PRICE = 2;
const EMAIL = `e2e_drinks_${stamp}@test.com`;

let admin: SupabaseClient;
let userId = '';
let drinkId = '';

/** The drink's row: the innermost element holding both its name and a button. */
function drinkRow(page: Page) {
  return page
    .locator('div', { has: page.getByText(DRINK_NAME, { exact: true }) })
    .filter({ has: page.getByRole('button') })
    .last();
}

async function bookedTotals() {
  const { data } = await admin.from('history').select('count, amount').eq('user', userId).eq('drink', drinkId);
  const rows = (data ?? []) as { count: number | null; amount: number | null }[];
  return {
    count: rows.reduce((s, r) => s + (r.count ?? 0), 0),
    amount: rows.reduce((s, r) => s + (r.amount ?? 0), 0),
  };
}

test.describe.configure({ mode: 'serial' });

test.describe('Drinks', () => {
  test.beforeAll(async () => {
    admin = adminClient();
    userId = await ensureUser(admin, EMAIL, `E2E Drinker ${stamp}`);
    // /drinks is gated on the `drinks` feature; the confirm button on `drinks.purchase`.
    await grantUser(admin, userId, { feats: ['drinks'], perms: ['drinks.purchase'] });

    const { data } = await admin.from('drink')
      // type 'Drink': the list only shows visibleTypes, which default to ['Drink'].
      .insert({ name: DRINK_NAME, price: PRICE, active: true, type: 'Drink' })
      .select('id').single().throwOnError();
    drinkId = (data as { id: string }).id;
  });

  test.afterEach(async ({ page }, testInfo) => logPageOnFailure(page, testInfo));

  test('a user books two drinks', async ({ page }) => {
    await signIn(page, EMAIL);
    await page.goto('/drinks/list');

    const row = drinkRow(page);
    await expect(row).toBeVisible();
    // The "+" is the row's last button (a "−" and the count appear once something is added).
    await row.getByRole('button').last().click();
    await row.getByRole('button').last().click();
    await expect(row.getByText('2', { exact: true })).toBeVisible();

    // Floating confirm button (rendered only with drinks.purchase and something added).
    await page.locator('div.fixed.right-6 button').click();
    await expect(page.getByText('Getränke erfolgreich gebucht!')).toBeVisible();

    await expect.poll(bookedTotals).toEqual({ count: 2, amount: 2 * PRICE });
  });

  test('the payments screen shows the open amount', async ({ page }) => {
    await signIn(page, EMAIL);
    await page.goto('/drinks/payments');

    await expect(page.getByText(DRINK_NAME, { exact: true })).toBeVisible();
    await expect(page.locator('div.flex.justify-between', { hasText: 'Gesamtkosten' }))
      .toContainText(`${2 * PRICE} €`);
  });

  test.afterAll(async () => {
    try {
      await admin.from('history').delete().eq('user', userId);
      await admin.from('payments').delete().eq('user', userId);
      if (drinkId) await admin.from('drink').delete().eq('id', drinkId);
      await admin.from('user_direct_grants').delete().eq('user', userId);
      if (userId) await admin.auth.admin.deleteUser(userId);
    } catch {
      // best-effort
    }
  });
});
