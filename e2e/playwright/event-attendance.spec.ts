import { expect, Page, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { seedPlaywright } from './seed';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = 'password';

let adminClient: any;

// Helpers
async function ensureUser(admin: any, email: string, displayName: string) {
  const { data: existing } = await admin.from('user').select('id').eq('email', email).maybeSingle();
  if (existing && (existing as any).id) return (existing as any).id;
  try {
    const { data: created } = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { displayName, name: displayName },
    } as any);
    const userId = (created as any)?.user?.id;
    if (userId) {
      await admin.from('user').upsert({ id: userId, email, displayName, name: displayName, role: 'user' }).throwOnError();
      return userId;
    }
  } catch (e) {
    // ignore
  }
  const { data: found } = await admin.from('user').select('id').eq('email', email).maybeSingle();
  if ((found as any)?.id) return (found as any).id;
  throw new Error('Could not create or find user ' + email);
}

async function signUp(page: Page, email: string, password: string, name = 'Test', surname = 'User') {
  await page.goto('/auth/signup');
  await page.fill('#email', email);
  await page.fill('#name', name);
  await page.fill('#surname', surname);
  await page.fill('#password', password);
  await page.fill('#repeat-password', password);
  await page.click('button:has-text("Registrieren")');
  await page.waitForTimeout(1500);
  await page.goto('/');
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/auth/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button:has-text("Login")');
  await page.waitForTimeout(1500);
  await page.goto('/');
}

// Test data constants
const GROUP_A = '11111111-0000-0000-0000-000000000011';
const GROUP_B = '22222222-0000-0000-0000-000000000022';
const EVENT_A = 'aaaaaaaa-0000-0000-0000-0000000000a1';
const EVENT_B = 'bbbbbbbb-0000-0000-0000-0000000000b2';
const EVENT_DEADLINE_PAST = 'cccccccc-0000-0000-0000-0000000000c3';

test.beforeAll(async () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment for e2e tests');
  }
  adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // seed baseline data
  await seedPlaywright();

  // create groups
  await adminClient.from('event_group').upsert([
    { id: GROUP_A, name: 'Test Group A', visible: true, is_public: true, need_request_to_join: false },
    { id: GROUP_B, name: 'Test Group B', visible: true, is_public: true, need_request_to_join: false },
  ]).throwOnError();

  // create users
  const memberEmail = `e2e_member_${Date.now()}@test.com`;
  const nonMemberEmail = `e2e_nonmember_${Date.now()}@test.com`;
  const trainerEmail = `e2e_trainer_${Date.now()}@test.com`;

  const memberId = await ensureUser(adminClient, memberEmail, 'Member');
  const nonMemberId = await ensureUser(adminClient, nonMemberEmail, 'NonMember');
  const trainerId = await ensureUser(adminClient, trainerEmail, 'Trainer');

  // store emails/ids on adminClient for tests (attach to client object)
  (adminClient as any)._testData = { memberEmail, memberId, nonMemberEmail, nonMemberId, trainerEmail, trainerId };

  // map member and trainer into GROUP_A
  await adminClient.from('group_user_mapping').upsert([
    { user: memberId, group: GROUP_A, role: 'user' },
    { user: trainerId, group: GROUP_A, role: 'user' },
  ]).throwOnError();

  // create events
  const now = new Date();
  const inTwoDays = new Date(now.getTime() + 2 * 24 * 3600 * 1000);
  const inOneDay = new Date(now.getTime() + 1 * 24 * 3600 * 1000);
  const twoHoursLater = new Date(inTwoDays.getTime() + 2 * 3600 * 1000);
  const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);

  // Event A: in group A, answerDeadline in future
  await adminClient.from('events').upsert([{
    id: EVENT_A,
    title: 'E2E Event A',
    startingDateTime: inTwoDays.toISOString(),
    endDateTime: twoHoursLater.toISOString(),
    group: GROUP_A,
    answerDeadline: inOneDay.toISOString()
  }]).throwOnError();

  // Event B: in group B
  await adminClient.from('events').upsert([{
    id: EVENT_B,
    title: 'E2E Event B',
    startingDateTime: inTwoDays.toISOString(),
    endDateTime: twoHoursLater.toISOString(),
    group: GROUP_B,
    answerDeadline: inOneDay.toISOString()
  }]).throwOnError();

  // Event with past answer deadline
  await adminClient.from('events').upsert([{
    id: EVENT_DEADLINE_PAST,
    title: 'E2E Event Past Deadline',
    startingDateTime: inTwoDays.toISOString(),
    endDateTime: twoHoursLater.toISOString(),
    group: GROUP_A,
    answerDeadline: yesterday.toISOString()
  }]).throwOnError();

  // grant trainer permission to trainerId and event.signup to memberId — perform via an authenticated admin user client
  const adminUserClient = createClient(SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY || '');
  const { data: signInData, error: signInError } = await adminUserClient.auth.signInWithPassword({ email: 'admin@test.com', password: PASSWORD });
  if (signInError) {
    throw signInError;
  }
  await adminUserClient.rpc('grant_user_grants', { p_user: trainerId, p_perms: ['event.signup.trainer'], p_feats: [] }).throwOnError();

  // grant event.signup to memberId by default for one test; we'll grant/revoke later per-case
  await adminUserClient.rpc('grant_user_grants', { p_user: memberId, p_perms: ['event.signup'], p_feats: [] }).throwOnError();

  // store adminUserClient for use in tests (revoke calls)
  (adminClient as any)._testData.adminUserClient = adminUserClient;
});

// Helpers for DB assertions
async function getAttendanceFor(eventId: string, userId: string) {
  const { data } = await adminClient.from('event_attendance_user_mapping').select('*').eq('event', eventId).eq('user', userId);
  return data ?? [];
}

// Tests
test('user can view events for groups he is in and cannot see others', async ({ page }) => {
  const { memberEmail } = (adminClient as any)._testData;
  await signIn(page, memberEmail, PASSWORD);
  await page.goto('/training/list');

  // should see Event A
  await page.waitForSelector(`text=E2E Event A`);
  const eventAText = await page.locator('text=E2E Event A').count();
  expect(eventAText).toBeGreaterThan(0);

  // should NOT see Event B
  const eventBCount = await page.locator('text=E2E Event B').count();
  expect(eventBCount).toBe(0);
});

test('user can attend event when having permission and cannot without permission', async ({ page }) => {
  const { memberEmail, memberId, nonMemberEmail, nonMemberId } = (adminClient as any)._testData;

  // member with permission (memberId already has event.signup granted in beforeAll)
  await signIn(page, memberEmail, PASSWORD);
  await page.goto(`/training/event/${EVENT_A}`);
  await page.waitForSelector('text=Teilnehmen');
  await page.click('text=Teilnehmen');

  // check DB mapping
  const mapping = await getAttendanceFor(EVENT_A, memberId);
  expect(mapping.length).toBeGreaterThan(0);

  // create a user without permission but who is member of group A
  // ensure nonMember is in group A
  await adminClient.from('group_user_mapping').upsert([{ user: nonMemberId, group: GROUP_A, role: 'user' }]).throwOnError();
  // ensure nonMember has no event.signup permission (revoke if needed)
  try {
    const adminUserClient = (adminClient as any)._testData.adminUserClient;
    await adminUserClient.rpc('revoke_user_grants', { p_user: nonMemberId, p_perms: ['event.signup'], p_feats: [] }).catch(() => { /* ignore */ });
  } catch (e) {
    // fallback to service-role revoke (if available)
    await adminClient.rpc('revoke_user_grants', { p_user: nonMemberId, p_perms: ['event.signup'], p_feats: [] }).catch(() => { /* ignore */ });
  }

  await signIn(page, nonMemberEmail, PASSWORD);
  await page.goto(`/training/event/${EVENT_A}`);
  // attendance UI is wrapped with Has perm{'event.signup'} -> should not show the attend buttons
  const attendVisible = await page.locator('text=Teilnehmen').count();
  expect(attendVisible).toBe(0);
});

test('user can attend if answer deadline not exceeded, but gets request flow if exceeded', async ({ page }) => {
  const { memberEmail, memberId } = (adminClient as any)._testData;

  // Event A has future deadline -> can attend
  await signIn(page, memberEmail, PASSWORD);
  await page.goto(`/training/event/${EVENT_A}`);
  await page.waitForSelector('text=Teilnehmen');
  await page.click('text=Teilnehmen');
  const mappingA = await getAttendanceFor(EVENT_A, memberId);
  expect(mappingA.length).toBeGreaterThan(0);

  // Event with past deadline -> should show 'Teilnahme anfragen' instead of 'Teilnehmen'
  await page.goto(`/training/event/${EVENT_DEADLINE_PAST}`);
  await page.waitForSelector('text=Teilnahme anfragen');
  // click request
  await page.click('text=Teilnahme anfragen');
  const mappingPast = await getAttendanceFor(EVENT_DEADLINE_PAST, memberId);
  expect(mappingPast.length).toBeGreaterThan(0);
});

test('user can attend as trainer when having trainer permission', async ({ page }) => {
  const { trainerEmail, trainerId } = (adminClient as any)._testData;

  // trainer has event.signup.trainer granted in beforeAll
  await signIn(page, trainerEmail, PASSWORD);
  await page.goto(`/training/event/${EVENT_A}`);
  await page.waitForSelector('text=Als Trainer teilnehmen');
  await page.click('text=Als Trainer teilnehmen');

  const mapping = await getAttendanceFor(EVENT_A, trainerId);
  expect(mapping.length).toBeGreaterThan(0);
  // state should include AttendingAsTrainer or similar - best effort check
  const states = (mapping as any[]).map((m) => m.state ?? m['event_attendance'] ?? null);
  expect(states.filter(Boolean).length).toBeGreaterThan(0);
});

// Cleanup
test.afterAll(async () => {
  try {
    await adminClient.from('events').delete().in('id', [EVENT_A, EVENT_B, EVENT_DEADLINE_PAST]).throwOnError();
    await adminClient.from('group_user_mapping').delete().in('group', [GROUP_A, GROUP_B]).throwOnError();
    await adminClient.from('event_attendance_user_mapping').delete().in('event', [EVENT_A, EVENT_B, EVENT_DEADLINE_PAST]).throwOnError();
    await adminClient.from('event_group').delete().in('id', [GROUP_A, GROUP_B]).throwOnError();
  } catch (e) {
    // ignore cleanup errors
  }
});
