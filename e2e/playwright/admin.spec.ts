import { randomUUID } from 'node:crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { test, expect, flow } from './fixtures';
import { adminClient, ensureUser, grantUser, logPageOnFailure, signIn } from './helpers';

// Administration: dashboard, user management, notifying a group, merging a guest player.
const stamp = Date.now();
const GROUP = randomUUID();
const GROUP_NAME = `E2E Admin Gruppe ${stamp}`;
const BOSS = { email: `e2e_adm_boss_${stamp}@test.com`, name: `E2E Vorstand ${stamp}` };
const MEMBER = { email: `e2e_adm_member_${stamp}@test.com`, name: `E2E Mitglied ${stamp}` };
const GUEST = `E2E Gast ${stamp}`;
const NOTE_TITLE = `E2E Hallenwechsel ${stamp}`;

let admin: SupabaseClient;
const ids: Record<string, string> = {};
let guestPlayer = '';

test.describe.configure({ mode: 'serial' });

test.describe('Administration', () => {
  test.beforeAll(async () => {
    admin = adminClient();
    for (const [k, u] of Object.entries({ BOSS, MEMBER })) ids[k] = await ensureUser(admin, u.email, u.name);
    await grantUser(admin, ids.BOSS, {
      feats: ['games'],
      perms: ['drinks.confirm.payments', 'users.manage', 'admin.notify_users', 'games.admin.merge_accounts'],
    });
    await admin.from('event_group').upsert({ id: GROUP, name: GROUP_NAME, visible: false }).throwOnError();
    await admin.from('group_user_mapping').upsert([
      { user: ids.BOSS, group: GROUP, role: 'admin' },
      { user: ids.MEMBER, group: GROUP, role: 'user' },
    ]).throwOnError();
    const { data } = await admin.schema('games').from('players').insert({ display_name: GUEST }).select('player').single().throwOnError();
    guestPlayer = (data as { player: string }).player;
    // The dashboard's "waits for you" row needs an open payment; don't rely on the seed for it.
    await admin.from('payments').insert({ user: ids.MEMBER, amountToPay: 2, paymentState: 'Open' }).throwOnError();
  });

  test.afterEach(async ({ page }, testInfo) => logPageOnFailure(page, testInfo));

  test('the admin dashboard shows the tiles the admin may use', { annotation: flow('admin.dashboard') }, async ({ page }) => {
    await signIn(page, BOSS.email);
    await page.goto('/admin');
    // The "waits for you" row appears once the open payments are loaded.
    await page.getByRole('button', { name: /^Offene Zahlungen/ }).click();
    await expect(page).toHaveURL(/\/admin\/drinks\/payments/);
  });

  test('a user manager renames a member', { annotation: flow('admin.users') }, async ({ page }) => {
    await signIn(page, BOSS.email);
    await page.goto('/admin/users');
    await page.getByText(MEMBER.name).first().click();
    const name = page.getByRole('dialog').locator('#displayName');
    await name.fill(`Umbenannt ${stamp}`);
    await page.getByRole('dialog').getByRole('button', { name: 'Änderungen speichern' }).click();
    await expect(page.getByText('Benutzer erfolgreich aktualisiert!')).toBeVisible();
    await expect.poll(async () => (await admin.from('user').select('displayName').eq('id', ids.MEMBER).single()).data?.displayName)
      .toBe(`Umbenannt ${stamp}`);
  });

  test('an admin notifies a whole group', { annotation: flow('admin.notify') }, async ({ page }) => {
    await signIn(page, BOSS.email);
    await page.goto('/admin/notify_users');
    await page.getByRole('combobox').filter({ hasText: 'Gruppe auswählen' }).click();
    await page.getByRole('option', { name: GROUP_NAME }).click();
    await page.getByRole('combobox').filter({ hasText: 'Thema auswählen' }).click();
    await page.getByRole('option').first().click();
    await page.getByPlaceholder('Titel').fill(NOTE_TITLE);
    await page.getByPlaceholder('Nachricht').fill('Training findet heute in Halle 2 statt.');
    await page.getByRole('button', { name: /An \d+ Empfänger senden|Senden/ }).click();

    await expect(page.getByText(/Benachrichtigung an \d+ Nutzer gesendet/)).toBeVisible();
    // In-app notification rows are written; actual push delivery is the external part.
    await expect.poll(async () => {
      const { data } = await admin.schema('notifications').from('notifications').select('user').eq('title', NOTE_TITLE);
      return ((data ?? []) as { user: string }[]).map((r) => r.user).includes(ids.MEMBER);
    }).toBe(true);
  });

  test('a games admin merges a guest player into a member account', { annotation: flow('admin.merge') }, async ({ page }) => {
    await signIn(page, BOSS.email);
    await page.goto('/admin/merge_accounts');
    const row = page.locator('[data-slot="item"]', { hasText: GUEST });
    await row.getByRole('button', { name: 'Zuordnen' }).click();
    // The picker filters by display name (renamed in the previous test) — pick the row by e-mail.
    await page.getByRole('dialog').getByText(MEMBER.email, { exact: true }).click();
    await page.getByRole('button', { name: 'Bestätigen' }).click();
    await expect(page.getByText('Die Accounts wurden erfolgreich gemerged!')).toBeVisible();
    await expect(row).toHaveCount(0);
  });

  test.afterAll(async () => {
    try {
      await admin.schema('notifications').from('notifications').delete().eq('title', NOTE_TITLE);
      await admin.schema('games').from('players').delete().eq('player', guestPlayer);
      await admin.from('payments').delete().eq('user', ids.MEMBER);
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
