import { test, expect, Page } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Event signup → waitlist → promotion, driven through the UI, asserted in the DB.
// The DB-level waitlist logic is covered by pgTAP (021/022); this proves the UI path
// (Teilnehmen / Warteliste / Absagen) wires into it end to end.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = process.env.TEST_USER_PASSWORD ?? 'password';

const GROUP = '33333333-0000-0000-0000-000000000033';
const EVENT = 'dddddddd-0000-0000-0000-0000000000d4';
const stamp = Date.now();
const U1 = `e2e_wl_first_${stamp}@test.com`;
const U2 = `e2e_wl_second_${stamp}@test.com`;

let admin: SupabaseClient;

async function ensureUser(email: string, displayName: string): Promise<string> {
  const { data: existing } = await admin.from('user').select('id').eq('email', email).maybeSingle();
  if ((existing as { id?: string } | null)?.id) return (existing as { id: string }).id;
  const { data: created } = await admin.auth.admin.createUser({
    email, password: PASSWORD, email_confirm: true,
    user_metadata: { name: displayName, displayName },
  } as never);
  const id = (created as { user?: { id?: string } } | null)?.user?.id;
  if (!id) throw new Error('could not create ' + email);
  await admin.from('user').upsert({ id, email, displayName, name: displayName, role: 'user' }).throwOnError();
  return id;
}

async function stateFor(eventId: string, userId: string): Promise<string | null> {
  const { data } = await admin
    .from('event_attendance_user_mapping').select('state').eq('event', eventId).eq('user', userId).maybeSingle();
  return (data as { state?: string } | null)?.state ?? null;
}

async function signIn(page: Page, email: string) {
  await page.goto('/auth/login');
  await page.fill('#email', email);
  await page.fill('#password', PASSWORD);
  await page.click('button:has-text("Login")');
  await page.waitForFunction(
    () => { try { return Object.keys(window.localStorage).some((k) => k.includes('auth-token')); } catch { return false; } },
    undefined, { timeout: 30_000 },
  );
}

let u1 = '';
let u2 = '';

test.describe.configure({ mode: 'serial' });

test.describe('Event waitlist', () => {
  test.beforeAll(async () => {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) throw new Error('stack env missing');
    admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    u1 = await ensureUser(U1, 'Waitlist First');
    u2 = await ensureUser(U2, 'Waitlist Second');

    await admin.from('event_group')
      .upsert({ id: GROUP, name: `WL Grp ${stamp}`, visible: true, is_public: true, need_request_to_join: false })
      .throwOnError();
    await admin.from('group_user_mapping').upsert([
      { user: u1, group: GROUP, role: 'user' },
      { user: u2, group: GROUP, role: 'user' },
    ]).throwOnError();
    // event.signup must be present in the JWT at login, so grant before signing in.
    await admin.from('user_direct_grants').upsert([
      { user: u1, kind: 'perm', key: 'event.signup' },
      { user: u2, kind: 'perm', key: 'event.signup' },
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
    // clean any stale attendance
    await admin.from('event_attendance_user_mapping').delete().eq('event', EVENT);
  });

  test('first attendee takes the only seat, second lands on the waitlist, decline promotes', async ({ page }) => {
    // U1 attends -> only seat taken.
    await signIn(page, U1);
    await page.goto(`/training/event/${EVENT}`);
    await page.getByRole('button', { name: 'Teilnehmen' }).click();
    await expect.poll(() => stateFor(EVENT, u1), { timeout: 30_000 }).toBe('Attending');

    // U2 sees the event is full -> the control is "Warteliste".
    await signIn(page, U2);
    await page.goto(`/training/event/${EVENT}`);
    await page.getByRole('button', { name: 'Warteliste' }).click();
    await expect.poll(() => stateFor(EVENT, u2), { timeout: 30_000 }).toBe('Waiting');

    // U1 declines -> the freed seat auto-promotes U2.
    await signIn(page, U1);
    await page.goto(`/training/event/${EVENT}`);
    await page.getByRole('button', { name: 'Absagen' }).click();
    await expect.poll(() => stateFor(EVENT, u1), { timeout: 30_000 }).toBe('Declined');
    await expect.poll(() => stateFor(EVENT, u2), { timeout: 30_000 }).toBe('Attending');
  });

  test.afterAll(async () => {
    try {
      await admin.from('event_attendance_user_mapping').delete().eq('event', EVENT);
      await admin.from('events').delete().eq('id', EVENT);
      await admin.from('group_user_mapping').delete().eq('group', GROUP);
      await admin.from('event_group').delete().eq('id', GROUP);
      for (const id of [u1, u2]) if (id) await admin.auth.admin.deleteUser(id);
    } catch {
      // best-effort
    }
  });
});
