import { randomUUID } from 'node:crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { test, expect, flow } from './fixtures';
import { adminClient, ensureUser, grantUser, logPageOnFailure, signIn } from './helpers';

// Tournament costs (personal cost tracker) and the key holder list (who has which key).
const stamp = Date.now();
const GROUP = randomUUID();
const TOURNAMENT = `E2E Cup ${stamp}`;
const KEY = `E2E Hallenschlüssel ${stamp}`;
const PLAYER = { email: `e2e_ck_player_${stamp}@test.com`, name: `E2E Reisende ${stamp}` };
const HOLDER = { email: `e2e_ck_holder_${stamp}@test.com`, name: `E2E Schlüsselträger ${stamp}` };
const NEXT = { email: `e2e_ck_next_${stamp}@test.com`, name: `E2E Nachfolgerin ${stamp}` };
const MANAGER = { email: `e2e_ck_mgr_${stamp}@test.com`, name: `E2E Schlüsselwart ${stamp}` };

let admin: SupabaseClient;
const ids: Record<string, string> = {};
let keyId = 0;

const costs = async () => {
  const { data } = await admin.from('tournament_costs').select('id, amount, category').eq('user_id', ids.PLAYER).eq('tournament', TOURNAMENT);
  return (data ?? []) as { id: string; amount: number; category: string }[];
};
const holderOfKey = async () => {
  const { data } = await admin.from('items').select('current_holder').eq('id', keyId).single();
  return (data as { current_holder: string | null }).current_holder;
};

test.describe.configure({ mode: 'serial' });

test.describe('Turnierkosten & Schlüssel', () => {
  test.beforeAll(async () => {
    admin = adminClient();
    for (const [k, u] of Object.entries({ PLAYER, HOLDER, NEXT, MANAGER })) ids[k] = await ensureUser(admin, u.email, u.name);
    await grantUser(admin, ids.PLAYER, { feats: ['costs'] });
    for (const k of ['HOLDER', 'NEXT']) await grantUser(admin, ids[k], { perms: ['items.update.holder'] });
    await grantUser(admin, ids.MANAGER, { perms: ['items.manage'] });
    // Keys belong to a group; only its members see and hand them over (key_handover RPC).
    await admin.from('event_group').upsert({ id: GROUP, name: `E2E Schlüssel Gruppe ${stamp}`, visible: false }).throwOnError();
    await admin.from('group_user_mapping').upsert(
      ['HOLDER', 'NEXT', 'MANAGER'].map((k) => ({ user: ids[k], group: GROUP, role: 'user' })),
    ).throwOnError();
    const { data } = await admin.from('items').insert({ name: KEY, type: 'mtvGym', current_holder: ids.HOLDER, group: GROUP }).select('id').single().throwOnError();
    keyId = (data as { id: number }).id;
  });

  test.afterEach(async ({ page }, testInfo) => logPageOnFailure(page, testInfo));

  test('a player records a tournament cost @mobile', { annotation: flow('costs.add', 'costs.view') }, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile' && (await costs()).length > 0, 'desktop already recorded it');
    await signIn(page, PLAYER.email);
    await page.goto('/costs');
    await page.locator('button:has(svg.lucide-plus)').first().click();
    await page.getByPlaceholder('Turniername').fill(TOURNAMENT);
    await page.getByPlaceholder('0.00').fill('42.5');
    await page.getByRole('dialog').getByRole('button', { name: 'Speichern' }).click();

    await expect.poll(async () => (await costs()).map((c) => Number(c.amount))).toEqual([42.5]);
    await expect(page.getByText(TOURNAMENT).first()).toBeVisible();
    await expect(page.getByText(/42,50\s*€|42\.50\s*€/).first()).toBeVisible();
  });

  test('a player edits and deletes the cost entry', { annotation: flow('costs.edit') }, async ({ page }) => {
    await signIn(page, PLAYER.email);
    await page.goto('/costs');
    await page.locator('[data-slot="item"]', { hasText: /42[,.]50/ }).first().click();
    await page.getByPlaceholder('0.00').fill('50');
    await page.getByRole('dialog').getByRole('button', { name: 'Speichern' }).click();
    await expect.poll(async () => (await costs()).map((c) => Number(c.amount))).toEqual([50]);

    await page.locator('[data-slot="item"]', { hasText: /50[,.]00/ }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Löschen' }).click();
    await page.getByRole('button', { name: 'Bestätigen' }).click();
    await expect.poll(async () => (await costs()).length).toBe(0);
  });

  test('the key list shows who holds which key', { annotation: flow('keys.list') }, async ({ page }) => {
    await signIn(page, NEXT.email);
    await page.goto('/keys');
    const row = page.locator('[data-slot="item"]', { has: page.getByText(KEY, { exact: true }) });
    await expect(row).toContainText(HOLDER.name);
  });

  test('the holder hands the key over to someone else', { annotation: flow('keys.handover') }, async ({ page }) => {
    await signIn(page, HOLDER.email);
    await page.goto('/keys');
    const row = page.locator('[data-slot="item"]', { has: page.getByText(KEY, { exact: true }) });
    await row.getByRole('button', { name: 'Abgeben' }).click();
    await page.getByText(NEXT.name, { exact: true }).click();
    await page.getByRole('button', { name: 'Bestätigen' }).click();
    await expect.poll(holderOfKey).toBe(ids.NEXT);
    await expect(row).toContainText(NEXT.name);
  });

  test('a key manager renames a key', { annotation: flow('keys.add') }, async ({ page }) => {
    await signIn(page, MANAGER.email);
    await page.goto('/keys');
    // Edit mode (pencil in the app bar), then the key's own pencil.
    await page.locator('button:has(svg.lucide-pencil)').first().click();
    const row = page.locator('[data-slot="item"]', { has: page.getByText(KEY, { exact: true }) });
    await row.locator('button:has(svg.lucide-pencil)').click();
    const renamed = `${KEY} neu`;
    await page.getByRole('dialog').locator('#item-name').first().fill(renamed);
    await page.getByRole('dialog').getByRole('button', { name: 'Speichern' }).click();
    await expect.poll(async () => (await admin.from('items').select('name').eq('id', keyId).single()).data?.name).toBe(renamed);
  });

  test('without items.manage there is no key administration', { annotation: flow('keys.add') }, async ({ page }) => {
    await signIn(page, HOLDER.email);
    await page.goto('/keys');
    await expect(page.getByText(KEY, { exact: false }).first()).toBeVisible();
    await expect(page.locator('button:has(svg.lucide-plus)')).toHaveCount(0);
    await expect(page.locator('button:has(svg.lucide-pencil)')).toHaveCount(0);
  });

  test.afterAll(async () => {
    try {
      await admin.from('tournament_costs').delete().eq('user_id', ids.PLAYER);
      await admin.from('item_history').delete().eq('item', keyId);
      await admin.from('items').delete().eq('id', keyId);
      await admin.from('group_user_mapping').delete().eq('group', GROUP);
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
