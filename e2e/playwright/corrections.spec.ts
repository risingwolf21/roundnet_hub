import { randomUUID } from 'node:crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { test, expect, flow } from './fixtures';
import { adminClient, ensureUser, grantGroup, grantUser, logPageOnFailure, signIn } from './helpers';

// Corrections and additions that the earlier specs left out: a member fixes a drink booking,
// a challenge manager edits a challenge, a key manager adds a new key.
const stamp = Date.now();
const GROUP = randomUUID();
const DRINK = `E2E Wasser ${stamp}`;
const CHALLENGE = `E2E Sit-up-Challenge ${stamp}`;
const NEW_KEY = `E2E Neuer Schlüssel ${stamp}`;
const DRINKER = { email: `e2e_cor_drinker_${stamp}@test.com`, name: `E2E Korrigierer ${stamp}` };
const MANAGER = { email: `e2e_cor_mgr_${stamp}@test.com`, name: `E2E Verwalter ${stamp}` };

let admin: SupabaseClient;
const ids: Record<string, string> = {};
let drinkId = '';
let paymentId = 0;
let challengeId = '';

test.describe.configure({ mode: 'serial' });

test.describe('Korrekturen', () => {
  test.beforeAll(async () => {
    admin = adminClient();
    for (const [k, u] of Object.entries({ DRINKER, MANAGER })) ids[k] = await ensureUser(admin, u.email, u.name);
    await grantUser(admin, ids.DRINKER, { feats: ['drinks'], perms: ['drinks.purchase'] });
    await grantUser(admin, ids.MANAGER, { perms: ['challenge.manage', 'items.manage'] });

    const { data: d } = await admin.from('drink').insert({ name: DRINK, price: 1, active: true, type: 'Drink' }).select('id').single().throwOnError();
    drinkId = (d as { id: string }).id;
    const { data: p } = await admin.from('payments').insert({ user: ids.DRINKER, amountToPay: 0, paymentState: 'Open' }).select('id').single().throwOnError();
    paymentId = (p as { id: number }).id;
    await admin.from('history').insert({ user: ids.DRINKER, drink: drinkId, count: 3, payment: paymentId, amount: 3 }).throwOnError();

    await admin.from('event_group').upsert({ id: GROUP, name: `E2E Korrektur Gruppe ${stamp}`, visible: false }).throwOnError();
    await grantGroup(admin, GROUP, { feats: ['challenges'] });
    await admin.from('group_user_mapping').upsert({ user: ids.MANAGER, group: GROUP, role: 'admin' }).throwOnError();
    const { data: c } = await admin.from('challenge').insert({ name: CHALLENGE, description: 'Vor der Änderung', group: GROUP }).select('id').single().throwOnError();
    challengeId = (c as { id: string }).id;
  });

  test.afterEach(async ({ page }, testInfo) => logPageOnFailure(page, testInfo));

  test('a member corrects a drink booking in their history', { annotation: flow('drinks.history.edit') }, async ({ page }) => {
    await signIn(page, DRINKER.email);
    await page.goto('/drinks/history');
    const row = page.locator('[data-slot="item"]', { has: page.getByText(DRINK, { exact: true }) }).first();
    await row.locator('button:has(svg.lucide-pencil)').click();
    const dialog = page.getByRole('dialog', { name: 'Getränk bearbeiten' });
    await dialog.locator('button:has(svg.lucide-minus)').click();
    await expect(dialog.getByText('2', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Speichern' }).click();

    await expect(page.getByText('Eintrag aktualisiert')).toBeVisible();
    await expect.poll(async () => {
      const { data } = await admin.from('history').select('count, amount').eq('user', ids.DRINKER).eq('drink', drinkId).single();
      return data;
    }).toEqual({ count: 2, amount: 2 });
  });

  test('a challenge manager edits a challenge', { annotation: flow('challenges.create') }, async ({ page }) => {
    await signIn(page, MANAGER.email);
    await page.goto(`/challenges/${challengeId}`);
    await page.locator('button:has(svg.lucide-pen-line), button:has(svg.lucide-square-pen), button:has(svg.lucide-edit)').first().click();
    await page.locator('#challenge-description').fill('Nach der Änderung');
    await page.getByRole('button', { name: 'Aktualisieren' }).click();

    await expect(page.getByText('Challenge wurde erfolgreich aktualisiert.')).toBeVisible();
    await expect.poll(async () => (await admin.from('challenge').select('description').eq('id', challengeId).single()).data?.description)
      .toBe('Nach der Änderung');
  });

  test('a key manager adds a new key', { annotation: flow('keys.add') }, async ({ page }) => {
    await signIn(page, MANAGER.email);
    await page.goto('/keys');
    await page.locator('button:has(svg.lucide-plus)').first().click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('#item-name').first().fill(NEW_KEY);
    await dialog.getByRole('combobox').click();
    await page.getByRole('option', { name: 'MTV Keller' }).click();
    await dialog.getByRole('button', { name: 'Speichern' }).click();

    await expect.poll(async () => (await admin.from('items').select('type').eq('name', NEW_KEY)).data).toEqual([{ type: 'mtvStorage' }]);
    await expect(page.getByText(NEW_KEY, { exact: true })).toBeVisible();
  });

  test.afterAll(async () => {
    try {
      await admin.from('history').delete().eq('user', ids.DRINKER);
      await admin.from('payments').delete().eq('user', ids.DRINKER);
      await admin.from('drink').delete().eq('id', drinkId);
      await admin.from('challenge').delete().eq('id', challengeId);
      await admin.from('items').delete().eq('name', NEW_KEY);
      await admin.from('group_user_mapping').delete().eq('group', GROUP);
      await admin.from('group_features').delete().eq('group', GROUP);
      await admin.from('event_group').delete().eq('id', GROUP);
      for (const id of Object.values(ids)) {
        await admin.from('user_direct_grants').delete().eq('user', id);
        await admin.auth.admin.deleteUser(id);
      }
    } catch {
      // best-effort
    }
  });
});
