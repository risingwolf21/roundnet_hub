import { randomUUID } from 'node:crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { test, expect, flow } from './fixtures';
import { adminClient, ensureUser, grantGroup, logPageOnFailure, signIn } from './helpers';

// Start page, help page, member search and the phone navigation (sidebar drawer).
const stamp = Date.now();
const GROUP = randomUUID();
const EVENT = randomUUID();
const EVENT_TITLE = `E2E Startseiten-Event ${stamp}`;
const ME = { email: `e2e_gen_me_${stamp}@test.com`, name: `E2E Sucherin ${stamp}` };
const MATE = { email: `e2e_gen_mate_${stamp}@test.com`, name: `E2E Mitspieler ${stamp}` };
const STRANGER = { email: `e2e_gen_stranger_${stamp}@test.com`, name: `E2E Fremder ${stamp}` };

let admin: SupabaseClient;
const ids: Record<string, string> = {};

test.describe.configure({ mode: 'serial' });

test.describe('Allgemein', () => {
  test.beforeAll(async () => {
    admin = adminClient();
    for (const [k, u] of Object.entries({ ME, MATE, STRANGER })) ids[k] = await ensureUser(admin, u.email, u.name);
    await admin.from('event_group').upsert({ id: GROUP, name: `E2E Allgemein Gruppe ${stamp}`, visible: false }).throwOnError();
    await grantGroup(admin, GROUP, { feats: ['events'], perms: ['event.signup'] });
    await admin.from('group_user_mapping').upsert([
      { user: ids.ME, group: GROUP, role: 'user' },
      { user: ids.MATE, group: GROUP, role: 'user' },
    ]).throwOnError();
    const start = Date.now() + 864e5;
    await admin.from('events').insert({
      id: EVENT, title: EVENT_TITLE, description: '—', group: GROUP,
      startingDateTime: new Date(start).toISOString(), endDateTime: new Date(start + 36e5).toISOString(),
    }).throwOnError();
  });

  test.afterEach(async ({ page }, testInfo) => logPageOnFailure(page, testInfo));

  test('a member lands on the start page with their upcoming events @mobile', { annotation: flow('misc.home') }, async ({ page }) => {
    await signIn(page, ME.email);
    await page.goto('/');
    await expect(page).toHaveURL(/\/home/);
    await expect(page.getByText(EVENT_TITLE).first()).toBeVisible();
  });

  test('the help page explains the app', { annotation: flow('misc.help') }, async ({ page }) => {
    await signIn(page, ME.email);
    await page.goto('/help');
    await expect(page.getByText(/Pull-to-Refresh/).first()).toBeVisible();
  });

  test('the member search finds people from shared groups only', { annotation: flow('misc.search') }, async ({ page }) => {
    await signIn(page, ME.email);
    await page.goto('/search');
    await page.getByPlaceholder('Name suchen...').first().fill('E2E Mitspieler');
    await expect(page.getByText(MATE.name).first()).toBeVisible();
    await page.getByPlaceholder('Name suchen...').first().fill('E2E Fremder');
    await expect(page.getByText(STRANGER.name)).toHaveCount(0);
    await expect(page.getByText('Keine Spieler gefunden')).toBeVisible();
    // Regression: the search box used to vanish with the last hit, leaving no way to fix the query.

    // A hit opens the member's profile.
    await page.getByPlaceholder('Name suchen...').first().fill('E2E Mitspieler');
    await page.getByText(MATE.name).first().click();
    await expect(page.getByRole('dialog').getByText(MATE.name).first()).toBeVisible();
  });

  test('on a phone the menu opens as a drawer and navigates @mobile', { annotation: flow('misc.nav.mobile') }, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'phone layout only');
    await signIn(page, ME.email);
    await page.goto('/home');
    await page.getByRole('button', { name: 'Toggle Sidebar' }).first().click();
    await page.getByRole('link', { name: 'Gruppen' }).or(page.getByRole('button', { name: 'Gruppen' })).first().click();
    await expect(page).toHaveURL(/\/groups/);
  });

  test.afterAll(async () => {
    try {
      await admin.from('events').delete().eq('id', EVENT);
      await admin.from('group_user_mapping').delete().eq('group', GROUP);
      await admin.from('group_features').delete().eq('group', GROUP);
      await admin.from('group_permissions').delete().eq('group', GROUP);
      await admin.from('event_group').delete().eq('id', GROUP);
      for (const id of Object.values(ids)) await admin.auth.admin.deleteUser(id);
    } catch {
      // best-effort
    }
  });
});
