import { test, expect, flow } from './fixtures';
import { SupabaseClient } from '@supabase/supabase-js';
import { adminClient, ensureUser, grantGroup, logPageOnFailure, signIn } from './helpers';

// Event signup → waitlist → promotion, driven through the UI, asserted in the DB.
// The DB-level waitlist logic is covered by pgTAP (021/022); this proves the UI path
// (Teilnehmen / Warteliste / Absagen) wires into it end to end.
const stamp = Date.now();
const GROUP = '33333333-0000-0000-0000-000000000033';
const EVENT = 'dddddddd-0000-0000-0000-0000000000d4';
const U1 = `e2e_wl_first_${stamp}@test.com`;
const U2 = `e2e_wl_second_${stamp}@test.com`;

let admin: SupabaseClient;
let u1 = '';
let u2 = '';

async function stateFor(userId: string): Promise<string | null> {
  const { data } = await admin
    .from('event_attendance_user_mapping').select('state').eq('event', EVENT).eq('user', userId).maybeSingle();
  return (data as { state?: string } | null)?.state ?? null;
}

async function openEvent(page: import('@playwright/test').Page) {
  await page.goto(`/training/event/${EVENT}`);
  await expect(page.getByText(`WL Event ${stamp}`).first()).toBeVisible();
}

test.describe.configure({ mode: 'serial' });

test.describe('Event waitlist', () => {
  test.beforeAll(async () => {
    admin = adminClient();
    u1 = await ensureUser(admin, U1, 'Waitlist First');
    u2 = await ensureUser(admin, U2, 'Waitlist Second');

    await admin.from('event_group')
      .upsert({ id: GROUP, name: `WL Grp ${stamp}`, visible: true, is_public: true, need_request_to_join: false })
      .throwOnError();
    // /training is gated on the `events` feature and the signup buttons on `event.signup`;
    // both reach members through the group.
    await grantGroup(admin, GROUP, { feats: ['events'], perms: ['event.signup'] });
    await admin.from('group_user_mapping').upsert([
      { user: u1, group: GROUP, role: 'user' },
      { user: u2, group: GROUP, role: 'user' },
    ]).throwOnError();

    const now = Date.now();
    await admin.from('events').upsert({
      id: EVENT,
      title: `WL Event ${stamp}`,
      description: '—',
      startingDateTime: new Date(now + 2 * 864e5).toISOString(),
      endDateTime: new Date(now + 2 * 864e5 + 2 * 36e5).toISOString(),
      answerDeadline: new Date(now + 1 * 864e5).toISOString(),
      group: GROUP,
      maxAttendees: 1,
    }).throwOnError();
    await admin.from('event_attendance_user_mapping').delete().eq('event', EVENT);
  });

  test.afterEach(async ({ page }, testInfo) => logPageOnFailure(page, testInfo));

  test('first attendee takes the only seat, second lands on the waitlist, decline promotes', { annotation: flow('attendance.waitlist', 'attendance.promote', 'attendance.decline') }, async ({ page }) => {
    // U1 attends -> takes the only seat.
    await signIn(page, U1);
    await openEvent(page);
    await page.getByRole('button', { name: 'Teilnehmen', exact: true }).click();
    await expect.poll(() => stateFor(u1)).toBe('Attending');

    // U2 sees the event is full -> the control is "Warteliste".
    await signIn(page, U2);
    await openEvent(page);
    await page.getByRole('button', { name: 'Warteliste', exact: true }).click();
    await expect.poll(() => stateFor(u2)).toBe('Waiting');

    // U1 declines -> the freed seat auto-promotes U2.
    await signIn(page, U1);
    await openEvent(page);
    await page.getByRole('button', { name: 'Absagen', exact: true }).click();
    await expect.poll(() => stateFor(u1)).toBe('Declined');
    await expect.poll(() => stateFor(u2)).toBe('Attending');
  });

  test.afterAll(async () => {
    try {
      await admin.from('event_attendance_user_mapping').delete().eq('event', EVENT);
      await admin.from('events').delete().eq('id', EVENT);
      await admin.from('group_user_mapping').delete().eq('group', GROUP);
      await admin.from('group_features').delete().eq('group', GROUP);
      await admin.from('group_permissions').delete().eq('group', GROUP);
      await admin.from('event_group').delete().eq('id', GROUP);
      for (const id of [u1, u2]) if (id) await admin.auth.admin.deleteUser(id);
    } catch {
      // best-effort
    }
  });
});
