import { Page } from '@playwright/test';
import { SupabaseClient } from '@supabase/supabase-js';
import { test, expect, flow } from './fixtures';
import { adminClient, ensureUser, grantUser, logPageOnFailure, signIn } from './helpers';

// Drinks beyond booking (drinks.spec.ts): the own history, the drinks admin (create / edit /
// delete a drink), the admin history and confirming a pending payment.
const stamp = Date.now();
const DRINK = `E2E Schorle ${stamp}`;
const DRINK_NEW = `E2E Apfelsaft ${stamp}`;
const DRINKER = { email: `e2e_dra_drinker_${stamp}@test.com`, name: `E2E Durstige ${stamp}` };
const KEEPER = { email: `e2e_dra_keeper_${stamp}@test.com`, name: `E2E Kassenwart ${stamp}` };

let admin: SupabaseClient;
const ids: Record<string, string> = {};
let drinkId = '';
let paymentId = 0;

const drinksNamed = async (name: string) => {
  const { data } = await admin.from('drink').select('id, price, active, deleted').eq('name', name);
  return (data ?? []) as { id: string; price: number; active: boolean; deleted: boolean }[];
};

/** Turn on the drinks list's edit mode (pencil in the app bar). */
async function editMode(page: Page) {
  await page.goto('/drinks/list');
  await page.locator('header button:has(svg.lucide-pencil), [data-slot="appbar"] button:has(svg.lucide-pencil)').first()
    .or(page.locator('button:has(svg.lucide-pencil)').first()).click();
}

test.describe.configure({ mode: 'serial' });

test.describe('Getränke-Verwaltung', () => {
  test.beforeAll(async () => {
    admin = adminClient();
    for (const [k, u] of Object.entries({ DRINKER, KEEPER })) ids[k] = await ensureUser(admin, u.email, u.name);
    await grantUser(admin, ids.DRINKER, { feats: ['drinks'], perms: ['drinks.purchase'] });
    await grantUser(admin, ids.KEEPER, {
      feats: ['drinks'],
      perms: ['drinks.edit', 'drinks.history.admin', 'drinks.confirm.payments'],
    });
    // A drink and an open payment with two bookings (what add_drinks_history produces).
    const { data: d } = await admin.from('drink').insert({ name: DRINK, price: 1.5, active: true, type: 'Drink' }).select('id').single().throwOnError();
    drinkId = (d as { id: string }).id;
    const { data: p } = await admin.from('payments').insert({ user: ids.DRINKER, amountToPay: 0, paymentState: 'Open' }).select('id').single().throwOnError();
    paymentId = (p as { id: number }).id;
    await admin.from('history').insert({ user: ids.DRINKER, drink: drinkId, count: 2, payment: paymentId, amount: 3 }).throwOnError();
  });

  test.afterEach(async ({ page }, testInfo) => logPageOnFailure(page, testInfo));

  test('a member sees their own drink history', { annotation: flow('drinks.history') }, async ({ page }) => {
    await signIn(page, DRINKER.email);
    await page.goto('/drinks/history');
    await expect(page.getByText(DRINK).first()).toBeVisible();
  });

  test('the drinks admin sees everyone’s history', { annotation: flow('drinks.admin.history') }, async ({ page }) => {
    await signIn(page, KEEPER.email);
    await page.goto('/admin/drinks/history');
    await expect(page.getByText(DRINK).first()).toBeVisible();
    await expect(page.getByText(DRINKER.name).first()).toBeVisible();
  });

  test('the drinks admin confirms a pending payment', { annotation: flow('drinks.admin.confirm') }, async ({ page }) => {
    await signIn(page, KEEPER.email);
    await page.goto('/admin/drinks/payments');
    const row = page.locator('[data-slot="item"]', { has: page.getByText(DRINKER.name, { exact: true }) });
    await expect(row).toContainText('3 €');
    await row.getByRole('button', { name: 'Bestätigen' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Speichern' }).click();

    await expect.poll(async () => {
      const { data } = await admin.from('payments').select('paymentState').eq('id', paymentId).single();
      return (data as { paymentState: string }).paymentState;
    }).toBe('Fulfilled');
    await expect(row).toHaveCount(0);
  });

  test('the drinks admin creates, edits and deletes a drink', { annotation: flow('drinks.admin.manage') }, async ({ page }) => {
    await signIn(page, KEEPER.email);
    await page.goto('/drinks/list');
    await page.locator('button:has(svg.lucide-plus)').first().click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('#name').fill(DRINK_NEW);
    await dialog.locator('#price').fill('2');
    await dialog.getByRole('switch').click(); // active
    await dialog.getByRole('button', { name: 'Speichern' }).click();
    await expect(page.getByText('Getränk erfolgreich hinzugefügt')).toBeVisible();
    await expect.poll(async () => (await drinksNamed(DRINK_NEW)).map((d) => [Number(d.price), d.active])).toEqual([[2, true]]);
    await expect(page.getByText(DRINK_NEW, { exact: true })).toBeVisible();

    // Edit the price in edit mode.
    await editMode(page);
    const row = page.locator('div', { has: page.getByText(DRINK_NEW, { exact: true }) }).filter({ has: page.getByRole('button') }).last();
    await row.locator('button:has(svg.lucide-pencil)').click();
    await page.getByRole('dialog').locator('#price').fill('2.5');
    await page.getByRole('dialog').getByRole('button', { name: 'Speichern' }).click();
    await expect(page.getByText('Getränk erfolgreich aktualisiert')).toBeVisible();
    await expect.poll(async () => Number((await drinksNamed(DRINK_NEW))[0]?.price)).toBe(2.5);

    // Delete it.
    await row.getByRole('button').last().click();
    await page.getByRole('button', { name: 'Bestätigen' }).click();
    await expect(page.getByText('Getränk erfolgreich gelöscht')).toBeVisible();
    await expect.poll(async () => {
      const rows = await drinksNamed(DRINK_NEW);
      return rows.length === 0 || rows.every((d) => d.deleted);
    }).toBe(true);
  });

  test.afterAll(async () => {
    try {
      await admin.from('history').delete().eq('user', ids.DRINKER);
      await admin.from('payments').delete().eq('user', ids.DRINKER);
      await admin.from('drink').delete().in('name', [DRINK, DRINK_NEW]);
      for (const id of Object.values(ids)) {
        await admin.from('user_direct_grants').delete().eq('user', id);
        await admin.auth.admin.deleteUser(id);
      }
    } catch {
      // best-effort
    }
  });
});
