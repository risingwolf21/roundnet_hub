import { randomUUID } from 'node:crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { test, expect, flow } from './fixtures';
import { adminClient, ensureUser, grantUser, logPageOnFailure, signIn } from './helpers';

// Rights management (/admin/grants) and what missing rights look like for a user.
const stamp = Date.now();
const GROUP = randomUUID();
const GROUP_NAME = `E2E Rechte Gruppe ${stamp}`;
const MANAGER = { email: `e2e_gr_mgr_${stamp}@test.com`, name: `E2E Rechteverwalterin ${stamp}` };
const TARGET = { email: `e2e_gr_target_${stamp}@test.com`, name: `E2E Berechtigter ${stamp}` };

let admin: SupabaseClient;
const ids: Record<string, string> = {};

const directGrants = async (userId: string) => {
  const { data } = await admin.from('user_direct_grants').select('kind, key').eq('user', userId);
  return ((data ?? []) as { kind: string; key: string }[]).map((g) => `${g.kind}:${g.key}`).sort();
};

test.describe.configure({ mode: 'serial' });

test.describe('Rechte & Features', () => {
  test.beforeAll(async () => {
    admin = adminClient();
    for (const [k, u] of Object.entries({ MANAGER, TARGET })) ids[k] = await ensureUser(admin, u.email, u.name);
    await grantUser(admin, ids.MANAGER, { perms: ['grants.manage'] });
    // Make sure the keys we toggle exist in the catalogue shown by the editor.
    await grantUser(admin, ids.MANAGER, { feats: ['drinks'] });
    await admin.from('event_group').upsert({ id: GROUP, name: GROUP_NAME, visible: true }).throwOnError();
    await admin.from('group_user_mapping').upsert([{ user: ids.TARGET, group: GROUP, role: 'user' }]).throwOnError();
  });

  test.afterEach(async ({ page }, testInfo) => logPageOnFailure(page, testInfo));

  test('a route behind a missing feature shows the "not unlocked" page', { annotation: flow('grants.featurelock') }, async ({ page }) => {
    await signIn(page, TARGET.email);
    await page.goto('/drinks/list');
    await expect(page.getByText('Feature nicht freigeschaltet')).toBeVisible();
  });

  test('an admin route without the permission is refused', { annotation: flow('grants.unauthorized') }, async ({ page }) => {
    await signIn(page, TARGET.email);
    await page.goto('/admin/users');
    await expect(page.getByText('Zugriff verweigert')).toBeVisible();
  });

  test('the rights manager grants a user a feature and a permission', { annotation: flow('grants.manager', 'grants.edit') }, async ({ page }) => {
    await signIn(page, MANAGER.email);
    await page.goto('/admin/grants');
    await page.getByRole('tab', { name: 'Benutzer' }).click();
    await page.locator('button:has(svg.lucide-plus)').last().click();
    await page.getByText(TARGET.name, { exact: true }).click();

    await expect(page.getByRole('dialog').getByText(`Benutzer "${TARGET.name}" bearbeiten`)).toBeVisible();
    await page.getByRole('switch', { name: 'drinks', exact: true }).click();
    await page.getByRole('switch', { name: 'drinks.purchase', exact: true }).click();
    await page.getByRole('button', { name: 'Speichern' }).click();

    await expect.poll(() => directGrants(ids.TARGET)).toEqual(['feat:drinks', 'perm:drinks.purchase']);

    // …and the user's drinks page is unlocked now.
    await signIn(page, TARGET.email);
    await page.goto('/drinks/list');
    await expect(page.getByText('Feature nicht freigeschaltet')).toHaveCount(0);
  });

  test('the rights manager revokes the permission again', { annotation: flow('grants.edit') }, async ({ page }) => {
    await signIn(page, MANAGER.email);
    await page.goto('/admin/grants');
    await page.getByRole('tab', { name: 'Benutzer' }).click();
    await page.getByText(TARGET.name).first().click();
    await page.getByRole('switch', { name: 'drinks.purchase', exact: true }).click();
    await page.getByRole('button', { name: 'Speichern' }).click();
    await expect.poll(() => directGrants(ids.TARGET)).toEqual(['feat:drinks']);
  });

  test('the rights manager gives a whole group a feature', { annotation: flow('grants.edit') }, async ({ page }) => {
    await signIn(page, MANAGER.email);
    await page.goto('/admin/grants');
    await page.getByRole('tab', { name: 'Gruppen' }).click();
    await page.getByText(GROUP_NAME).first().click();
    await page.getByRole('switch', { name: 'drinks', exact: true }).click();
    await page.getByRole('button', { name: 'Speichern' }).click();
    await expect.poll(async () => {
      const { data } = await admin.from('group_features').select('feature').eq('group', GROUP);
      return (data ?? []).map((r) => (r as { feature: string }).feature);
    }).toEqual(['drinks']);
  });

  test.afterAll(async () => {
    try {
      await admin.from('group_features').delete().eq('group', GROUP);
      await admin.from('group_permissions').delete().eq('group', GROUP);
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
