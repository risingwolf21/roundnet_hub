import { randomUUID } from 'node:crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { test, expect, flow } from './fixtures';
import { adminClient, ensureUser, grantGroup, grantUser, logPageOnFailure, signIn } from './helpers';

// The "Teilnehmer" tab: attendees are listed by state, and a trainer with
// event.manage.attendees accepts a pending request (RequestedAttendance → Attending).
const stamp = Date.now();
const GROUP = randomUUID();
const EVENT = randomUUID();
const TITLE = `E2E Teilnehmerliste ${stamp}`;
const TRAINER = { email: `e2e_att_trainer_${stamp}@test.com`, name: `E2E Trainerin ${stamp}` };
const ATTENDEE = { email: `e2e_att_yes_${stamp}@test.com`, name: `E2E Zusager ${stamp}` };
const REQUESTER = { email: `e2e_att_req_${stamp}@test.com`, name: `E2E Anfrager ${stamp}` };

let admin: SupabaseClient;
const ids: Record<string, string> = {};

const stateOf = async (userId: string) => {
  const { data } = await admin.from('event_attendance_user_mapping').select('state')
    .eq('event', EVENT).eq('user', userId).maybeSingle();
  return (data as { state?: string } | null)?.state ?? null;
};

test.describe.configure({ mode: 'serial' });

test.describe('Teilnehmerliste', () => {
  test.beforeAll(async () => {
    admin = adminClient();
    for (const [k, u] of Object.entries({ TRAINER, ATTENDEE, REQUESTER })) ids[k] = await ensureUser(admin, u.email, u.name);

    await admin.from('event_group').upsert({ id: GROUP, name: `E2E Att Group ${stamp}`, visible: false }).throwOnError();
    await grantGroup(admin, GROUP, { feats: ['events'], perms: ['event.signup'] });
    await grantUser(admin, ids.TRAINER, { perms: ['event.manage.attendees'] });
    await admin.from('group_user_mapping').upsert(
      Object.values(ids).map((user) => ({ user, group: GROUP, role: 'user' })),
    ).throwOnError();

    const now = Date.now();
    await admin.from('events').insert({
      id: EVENT, title: TITLE, description: '—', group: GROUP,
      startingDateTime: new Date(now + 3 * 864e5).toISOString(),
      endDateTime: new Date(now + 3 * 864e5 + 2 * 36e5).toISOString(),
    }).throwOnError();
    await admin.from('event_attendance_user_mapping').insert([
      { event: EVENT, user: ids.ATTENDEE, state: 'Attending' },
      { event: EVENT, user: ids.REQUESTER, state: 'RequestedAttendance' },
    ]).throwOnError();
  });

  test.afterEach(async ({ page }, testInfo) => logPageOnFailure(page, testInfo));

  test('the attendance tab lists attendees and open requests', { annotation: flow('attendance.list') }, async ({ page }) => {
    await signIn(page, TRAINER.email);
    await page.goto(`/training/event/${EVENT}`);
    await page.getByRole('tab', { name: /Teilnehmer/ }).click();

    await expect(page.getByText('Zusagen (1)')).toBeVisible();
    await expect(page.getByText(ATTENDEE.name, { exact: true })).toBeVisible();
    await expect(page.getByText('Anfragen (1)')).toBeVisible();
    await expect(page.getByText(REQUESTER.name, { exact: true })).toBeVisible();
  });

  test('a trainer accepts a pending request', { annotation: flow('attendance.admin') }, async ({ page }) => {
    await signIn(page, TRAINER.email);
    await page.goto(`/training/event/${EVENT}`);
    await page.getByRole('tab', { name: /Teilnehmer/ }).click();

    const row = page.locator('div.flex.items-center.gap-3', { has: page.getByText(REQUESTER.name, { exact: true }) });
    await row.locator('button:has(svg.lucide-check)').click();

    await expect.poll(() => stateOf(ids.REQUESTER)).toBe('Attending');
    await expect(page.getByText('Zusagen (2)')).toBeVisible();
  });

  test('a member without event.manage.attendees cannot accept requests', { annotation: flow('attendance.admin') }, async ({ page }) => {
    await admin.from('event_attendance_user_mapping').update({ state: 'RequestedAttendance' })
      .eq('event', EVENT).eq('user', ids.REQUESTER).throwOnError();
    await signIn(page, ATTENDEE.email);
    await page.goto(`/training/event/${EVENT}`);
    await page.getByRole('tab', { name: /Teilnehmer/ }).click();
    await expect(page.getByText(REQUESTER.name, { exact: true })).toBeVisible();
    await expect(page.locator('button:has(svg.lucide-check)')).toHaveCount(0);
  });

  test.afterAll(async () => {
    try {
      await admin.from('event_attendance_user_mapping').delete().eq('event', EVENT);
      await admin.from('events').delete().eq('id', EVENT);
      await admin.from('group_user_mapping').delete().eq('group', GROUP);
      await admin.from('group_features').delete().eq('group', GROUP);
      await admin.from('group_permissions').delete().eq('group', GROUP);
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
