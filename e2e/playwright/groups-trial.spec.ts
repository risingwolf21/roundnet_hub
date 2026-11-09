import { Page } from '@playwright/test';
import { test, expect, flow } from './fixtures';
import { SupabaseClient } from '@supabase/supabase-js';
import { adminClient, ensureUser, grantGroup, logPageOnFailure, signIn } from './helpers';

// Trial membership: a group admin accepts a join request as "Probenutzer" (role → trial),
// and the trial user's event signup lands in the trial pool (AttendingAsTrial).
const stamp = Date.now();
const GROUP = '44444444-0000-0000-0000-000000000044';
const EVENT = 'eeeeeeee-0000-0000-0000-0000000000e5';
const EVENT_TITLE = `E2E Trial Event ${stamp}`;
const ADMIN_EMAIL = `e2e_trial_admin_${stamp}@test.com`;
const TRIAL_EMAIL = `e2e_trial_user_${stamp}@test.com`;
const TRIAL_NAME = `E2E Trial User ${stamp}`;

let admin: SupabaseClient;
let adminId = '';
let trialId = '';

async function roleOf(userId: string) {
  const { data } = await admin.from('group_user_mapping').select('role').eq('user', userId).eq('group', GROUP).maybeSingle();
  return (data as { role?: string } | null)?.role ?? null;
}

async function attendanceOf(userId: string) {
  const { data } = await admin
    .from('event_attendance_user_mapping').select('state').eq('event', EVENT).eq('user', userId).maybeSingle();
  return (data as { state?: string } | null)?.state ?? null;
}

/** A member row on the group page: the innermost element holding the name and the given button. */
function memberRow(page: Page, name: string, button: string) {
  return page
    .locator('div', { has: page.getByText(name, { exact: true }) })
    .filter({ has: page.getByRole('button', { name: button }) })
    .last();
}

test.describe.configure({ mode: 'serial' });

test.describe('Trial membership', () => {
  test.beforeAll(async () => {
    admin = adminClient();
    adminId = await ensureUser(admin, ADMIN_EMAIL, `E2E Trial Admin ${stamp}`);
    trialId = await ensureUser(admin, TRIAL_EMAIL, TRIAL_NAME);

    await admin.from('event_group')
      .upsert({ id: GROUP, name: `E2E Trial Group ${stamp}`, visible: true, is_public: true, need_request_to_join: true })
      .throwOnError();
    // `events.trials` unlocks the "Probenutzer" action; trials get `events` + `event.signup`
    // through the group (see user_grants_view).
    await grantGroup(admin, GROUP, { feats: ['events', 'events.trials'], perms: ['event.signup'] });
    await admin.from('group_user_mapping').upsert([
      { user: adminId, group: GROUP, role: 'admin' },
      { user: trialId, group: GROUP, role: 'joinRequested' },
    ]).throwOnError();

    const now = Date.now();
    await admin.from('events').upsert({
      id: EVENT,
      title: EVENT_TITLE,
      description: '—',
      startingDateTime: new Date(now + 2 * 864e5).toISOString(),
      endDateTime: new Date(now + 2 * 864e5 + 2 * 36e5).toISOString(),
      answerDeadline: new Date(now + 864e5).toISOString(),
      group: GROUP,
    }).throwOnError();
    await admin.from('event_attendance_user_mapping').delete().eq('event', EVENT);
  });

  test.afterEach(async ({ page }, testInfo) => logPageOnFailure(page, testInfo));

  test('an admin accepts a join request as trial member', { annotation: flow('trials.accept') }, async ({ page }) => {
    await signIn(page, ADMIN_EMAIL);
    await page.goto(`/groups/${GROUP}`);
    await page.getByRole('radio', { name: /^Anfragen/ }).click();

    await memberRow(page, TRIAL_NAME, 'Bearbeiten').getByRole('button', { name: 'Bearbeiten' }).click();
    await page.getByRole('menuitem', { name: 'Probenutzer' }).click();
    await page.getByRole('button', { name: 'Akzeptieren', exact: true }).click();

    await expect.poll(() => roleOf(trialId)).toBe('trial');
  });

  test('a trial member signing up lands in the trial pool', { annotation: flow('trials.attend') }, async ({ page }) => {
    await signIn(page, TRIAL_EMAIL);
    await page.goto(`/training/event/${EVENT}`);
    await expect(page.getByText(EVENT_TITLE).first()).toBeVisible();

    await page.getByRole('button', { name: 'Teilnehmen', exact: true }).click();
    await expect.poll(() => attendanceOf(trialId)).toBe('AttendingAsTrial');
  });

  test.afterAll(async () => {
    try {
      await admin.from('event_attendance_user_mapping').delete().eq('event', EVENT);
      await admin.from('events').delete().eq('id', EVENT);
      await admin.from('group_user_mapping').delete().eq('group', GROUP);
      await admin.from('group_features').delete().eq('group', GROUP);
      await admin.from('group_permissions').delete().eq('group', GROUP);
      await admin.from('event_group').delete().eq('id', GROUP);
      for (const id of [adminId, trialId]) if (id) await admin.auth.admin.deleteUser(id);
    } catch {
      // best-effort
    }
  });
});
