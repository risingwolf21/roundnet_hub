import { Page } from '@playwright/test';
import { test, expect, flow } from './fixtures';
import { SupabaseClient } from '@supabase/supabase-js';
import { adminClient, ensureUser, grantGroup, grantUser, logPageOnFailure, signIn } from './helpers';

// Event visibility + signup permissions through the UI.
// Grants model (see user_grants_view): the group carries the `events` feature so every member can
// open /training; `event.signup` / `event.signup.trainer` are granted per user, so a member without
// them must NOT see the signup buttons.
const stamp = Date.now();
const GROUP_A = '11111111-0000-0000-0000-000000000011';
const GROUP_B = '22222222-0000-0000-0000-000000000022';
const EVENT_A = 'aaaaaaaa-0000-0000-0000-0000000000a1';
const EVENT_B = 'bbbbbbbb-0000-0000-0000-0000000000b2';
const EVENT_DEADLINE_PAST = 'cccccccc-0000-0000-0000-0000000000c3';
const TITLE_A = `E2E Event A ${stamp}`;
const TITLE_B = `E2E Event B ${stamp}`;
const TITLE_PAST = `E2E Event Past Deadline ${stamp}`;

const memberEmail = `e2e_member_${stamp}@test.com`;
const nonMemberEmail = `e2e_nosignup_${stamp}@test.com`;
const trainerEmail = `e2e_trainer_${stamp}@test.com`;

let admin: SupabaseClient;
let memberId = '';
let nonMemberId = '';
let trainerId = '';

async function stateFor(eventId: string, userId: string): Promise<string | null> {
  const { data } = await admin
    .from('event_attendance_user_mapping').select('state').eq('event', eventId).eq('user', userId).maybeSingle();
  return (data as { state?: string } | null)?.state ?? null;
}

async function openEvent(page: Page, id: string, title: string) {
  await page.goto(`/training/event/${id}`);
  await expect(page.getByText(title).first()).toBeVisible();
}

test.describe.configure({ mode: 'serial' });

test.describe('Event attendance', () => {
  test.beforeAll(async () => {
    admin = adminClient();

    await admin.from('event_group').upsert([
      { id: GROUP_A, name: `Test Group A ${stamp}`, visible: true, is_public: true, need_request_to_join: false },
      { id: GROUP_B, name: `Test Group B ${stamp}`, visible: true, is_public: true, need_request_to_join: false },
    ]).throwOnError();
    await grantGroup(admin, GROUP_A, { feats: ['events'] });

    memberId = await ensureUser(admin, memberEmail, 'Member');
    nonMemberId = await ensureUser(admin, nonMemberEmail, 'NoSignup');
    trainerId = await ensureUser(admin, trainerEmail, 'Trainer');

    await admin.from('group_user_mapping').upsert([
      { user: memberId, group: GROUP_A, role: 'user' },
      { user: nonMemberId, group: GROUP_A, role: 'user' },
      { user: trainerId, group: GROUP_A, role: 'user' },
    ]).throwOnError();
    await grantUser(admin, memberId, { perms: ['event.signup'] });
    await grantUser(admin, trainerId, { perms: ['event.signup.trainer'] });

    const now = Date.now();
    const start = new Date(now + 2 * 864e5).toISOString();
    const end = new Date(now + 2 * 864e5 + 2 * 36e5).toISOString();
    await admin.from('events').upsert([
      { id: EVENT_A, title: TITLE_A, description: '—', startingDateTime: start, endDateTime: end, group: GROUP_A, answerDeadline: new Date(now + 864e5).toISOString() },
      { id: EVENT_B, title: TITLE_B, description: '—', startingDateTime: start, endDateTime: end, group: GROUP_B, answerDeadline: new Date(now + 864e5).toISOString() },
      { id: EVENT_DEADLINE_PAST, title: TITLE_PAST, description: '—', startingDateTime: start, endDateTime: end, group: GROUP_A, answerDeadline: new Date(now - 864e5).toISOString() },
    ]).throwOnError();
    await admin.from('event_attendance_user_mapping').delete().in('event', [EVENT_A, EVENT_B, EVENT_DEADLINE_PAST]);
  });

  test.afterEach(async ({ page }, testInfo) => logPageOnFailure(page, testInfo));

  test('a member sees the events of their own groups and not of others', { annotation: flow('events.list') }, async ({ page }) => {
    await signIn(page, memberEmail);
    await page.goto('/training/list');
    await expect(page.getByText(TITLE_A, { exact: true })).toBeVisible();
    await expect(page.getByText(TITLE_B, { exact: true })).toHaveCount(0);
  });

  test('a member with event.signup can attend; a member without it gets no signup buttons', { annotation: flow('attendance.attend', 'attendance.noperm') }, async ({ page }) => {
    await signIn(page, memberEmail);
    await openEvent(page, EVENT_A, TITLE_A);
    await page.getByRole('button', { name: 'Teilnehmen', exact: true }).click();
    await expect.poll(() => stateFor(EVENT_A, memberId)).toBe('Attending');

    await signIn(page, nonMemberEmail);
    await openEvent(page, EVENT_A, TITLE_A);
    await expect(page.getByRole('button', { name: 'Teilnehmen', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Absagen', exact: true })).toHaveCount(0);
  });

  test('past the answer deadline the member gets the request flow instead', { annotation: flow('attendance.deadline') }, async ({ page }) => {
    await signIn(page, memberEmail);
    await openEvent(page, EVENT_DEADLINE_PAST, TITLE_PAST);
    await expect(page.getByRole('button', { name: 'Teilnehmen', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Teilnahme anfragen', exact: true }).click();
    await expect.poll(() => stateFor(EVENT_DEADLINE_PAST, memberId)).toBe('RequestedAttendance');
  });

  test('a trainer can attend as trainer', { annotation: flow('attendance.trainer') }, async ({ page }) => {
    await signIn(page, trainerEmail);
    await openEvent(page, EVENT_A, TITLE_A);
    await page.getByRole('button', { name: 'Als Trainer teilnehmen', exact: true }).click();
    await expect.poll(() => stateFor(EVENT_A, trainerId)).toBe('AttendingAsTrainer');
  });

  test.afterAll(async () => {
    try {
      const events = [EVENT_A, EVENT_B, EVENT_DEADLINE_PAST];
      await admin.from('event_attendance_user_mapping').delete().in('event', events);
      await admin.from('events').delete().in('id', events);
      await admin.from('group_user_mapping').delete().in('group', [GROUP_A, GROUP_B]);
      await admin.from('group_features').delete().in('group', [GROUP_A, GROUP_B]);
      await admin.from('user_direct_grants').delete().in('user', [memberId, trainerId]);
      await admin.from('event_group').delete().in('id', [GROUP_A, GROUP_B]);
      for (const id of [memberId, nonMemberId, trainerId]) if (id) await admin.auth.admin.deleteUser(id);
    } catch {
      // best-effort
    }
  });
});
