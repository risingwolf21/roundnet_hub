import { randomUUID } from 'node:crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { test, expect, flow } from './fixtures';
import { adminClient, ensureUser, grantGroup, grantUser, logPageOnFailure, signIn } from './helpers';

// Laptops (1280 px and wider): lists open their items next to the list instead of as a new page.
const stamp = Date.now();
const GROUP = randomUUID();
const EVENT = randomUUID();
const TITLE = `E2E Breit ${stamp}`;
const BOSS = { email: `e2e_wide_boss_${stamp}@test.com`, name: `E2E Breit Vorstand ${stamp}` };
const MEMBER = { email: `e2e_wide_member_${stamp}@test.com`, name: `E2E Breit Mitglied ${stamp}` };

let admin: SupabaseClient;
const ids: Record<string, string> = {};

test.describe.configure({ mode: 'serial' });

test.describe('Breite Bildschirme @wide', () => {
  test.beforeAll(async () => {
    admin = adminClient();
    for (const [k, u] of Object.entries({ BOSS, MEMBER })) ids[k] = await ensureUser(admin, u.email, u.name);
    await admin.from('event_group').upsert({ id: GROUP, name: `E2E Breit Gruppe ${stamp}`, visible: true }).throwOnError();
    await grantGroup(admin, GROUP, { feats: ['events'] });
    await grantUser(admin, ids.BOSS, { perms: ['users.manage'] });
    await admin.from('group_user_mapping').upsert([
      { user: ids.BOSS, group: GROUP, role: 'admin' },
      { user: ids.MEMBER, group: GROUP, role: 'user' },
    ]).throwOnError();
    const start = new Date(Date.now() + 2 * 864e5);
    await admin.from('events').insert({
      id: EVENT, title: TITLE, description: '—', group: GROUP,
      startingDateTime: start.toISOString(), endDateTime: new Date(+start + 2 * 36e5).toISOString(),
    }).throwOnError();
  });

  test.afterEach(async ({ page }, testInfo) => logPageOnFailure(page, testInfo));

  test('an event opens next to the list', { annotation: flow('misc.wide.events') }, async ({ page }) => {
    await signIn(page, MEMBER.email);
    await page.goto('/training/list');
    await expect(page.getByText('Kein Termin ausgewählt')).toBeVisible();

    await page.getByText(TITLE).click();
    await expect(page).toHaveURL(new RegExp(`/training/event/${EVENT}`));
    // The list stays, with the open event marked; the event page needs no back button.
    await expect(page.locator('[aria-current="true"]')).toContainText(TITLE);
    await expect(page.getByText('Kein Termin ausgewählt')).toHaveCount(0);
  });

  test('the profile opens a section next to the overview', { annotation: flow('misc.wide.profile') }, async ({ page }) => {
    await signIn(page, MEMBER.email);
    await page.goto('/user');
    // The first section is open right away.
    await expect(page.getByRole('link', { name: /Benachrichtigungen/ })).toHaveAttribute('aria-current', 'page');

    await page.getByRole('link', { name: /^Account/ }).click();
    await expect(page).toHaveURL(/\/user\/account/);
    await expect(page.locator('#multi-step-personal-info-display-name')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
  });

  test('a user manager edits a member in the side panel', { annotation: flow('misc.wide.admin') }, async ({ page }) => {
    await signIn(page, BOSS.email);
    await page.goto('/admin/users');
    await expect(page.getByText('Kein Benutzer ausgewählt')).toBeVisible();
    await page.getByText(MEMBER.name).first().click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.locator('#displayName').fill(`Breit ${stamp}`);
    await page.getByRole('button', { name: 'Änderungen speichern' }).click();
    await expect(page.getByText('Benutzer erfolgreich aktualisiert!')).toBeVisible();
    await expect.poll(async () => (await admin.from('user').select('displayName').eq('id', ids.MEMBER).single()).data?.displayName)
      .toBe(`Breit ${stamp}`);
  });

  test.afterAll(async () => {
    try {
      await admin.from('events').delete().eq('id', EVENT);
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
