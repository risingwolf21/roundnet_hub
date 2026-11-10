import { randomUUID } from 'node:crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { test, expect, flow } from './fixtures';
import { adminClient, ensureUser, grantGroup, logPageOnFailure, signIn, trackErrors } from './helpers';

// Guest trials: a group admin creates an invite link, a newcomer opens it, starts as a guest
// (anonymous sign-in) with just a name, sees "Noch x von y Probetrainings", signs up for an event
// open for trials and is stopped once the trainings of the link are used up.
const stamp = Date.now();
const GROUP = randomUUID();
const GROUP_NAME = `E2E Gast Gruppe ${stamp}`;
const OPEN_A = randomUUID();
const OPEN_B = randomUUID();
const CLOSED = randomUUID();
const ADMIN = { email: `e2e_guest_admin_${stamp}@test.com`, name: `E2E Gast Admin ${stamp}` };
const GUEST_NAME = `Gast ${stamp}`;

let admin: SupabaseClient;
const ids: Record<string, string> = {};
let token = '';

const event = (id: string, title: string, days: number, trialsOpen: boolean) => {
  const start = Date.now() + days * 864e5;
  return {
    id, title, description: '—', group: GROUP, trials_open: trialsOpen,
    startingDateTime: new Date(start).toISOString(),
    endDateTime: new Date(start + 2 * 36e5).toISOString(),
  };
};

const guestId = async () => {
  const { data } = await admin.from('user').select('id').eq('displayName', GUEST_NAME).maybeSingle();
  return (data as { id?: string } | null)?.id ?? null;
};
const guestState = async (eventId: string) => {
  const id = await guestId();
  if (!id) return null;
  const { data } = await admin.from('event_attendance_user_mapping').select('state').eq('event', eventId).eq('user', id).maybeSingle();
  return (data as { state?: string } | null)?.state ?? null;
};

test.describe.configure({ mode: 'serial' });

test.describe('Gast-Probetraining', () => {
  test.beforeAll(async () => {
    admin = adminClient();
    ids.ADMIN = await ensureUser(admin, ADMIN.email, ADMIN.name);
    await admin.from('event_group').upsert({ id: GROUP, name: GROUP_NAME, visible: true, is_public: true, need_request_to_join: true }).throwOnError();
    // Only the trial features: guests get `events` and `event.signup` implied by events.trials.
    await grantGroup(admin, GROUP, { feats: ['events.trials', 'events.trials.guests'] });
    await grantGroup(admin, GROUP, { feats: ['events'] }); // for the admin's own event pages
    await admin.from('group_user_mapping').upsert([{ user: ids.ADMIN, group: GROUP, role: 'admin' }]).throwOnError();
    await admin.from('events').insert([
      event(OPEN_A, `E2E Gast offen A ${stamp}`, 2, true),
      event(OPEN_B, `E2E Gast offen B ${stamp}`, 3, true),
      event(CLOSED, `E2E Gast geschlossen ${stamp}`, 4, false),
    ]).throwOnError();
  });

  test.afterEach(async ({ page }, testInfo) => logPageOnFailure(page, testInfo));

  test('a group admin creates an invite link', { annotation: flow('trials.guest.invite') }, async ({ page }) => {
    await signIn(page, ADMIN.email);
    await page.goto(`/groups/${GROUP}`);
    await page.getByRole('button', { name: 'Neuer Einladungslink' }).click();
    await page.getByRole('button', { name: 'Link erstellen' }).click();
    await expect(page.getByText('Link erstellt')).toBeVisible();

    await expect.poll(async () => {
      const { data } = await admin.from('trial_invites').select('token, event_limit').eq('group', GROUP).eq('active', true);
      return (data ?? []).length;
    }).toBe(1);
    const { data } = await admin.from('trial_invites').select('token').eq('group', GROUP).single().throwOnError();
    token = (data as { token: string }).token;
    // One training per guest keeps the next test short.
    await admin.from('trial_invites').update({ event_limit: 1 }).eq('token', token).throwOnError();
  });

  test('a guest joins with the link, signs up once and is stopped at the limit', { annotation: flow('trials.guest.join', 'trials.guest.attend', 'trials.guest.limit') }, async ({ page }) => {
    trackErrors(page);
    await page.goto(`/probe/${token}`);
    await expect(page.getByText(`Du wurdest zur Gruppe ${GROUP_NAME} eingeladen.`)).toBeVisible();
    await expect(page.getByText('1 Probetraining', { exact: true })).toBeVisible();

    await test.step('start as a guest with a name', async () => {
      await page.getByLabel('Wie heißt du?').fill(GUEST_NAME);
      await page.getByRole('button', { name: 'Probetraining starten' }).click();
      await expect(page).toHaveURL(/\/home/);
      await expect(page.getByText('Noch 1 von 1 Probetrainings')).toBeVisible();
      await expect(page.getByText('Konto sichern')).toBeVisible();
      await expect.poll(async () => {
        const id = await guestId();
        if (!id) return null;
        const { data } = await admin.from('group_user_mapping').select('role, trial_event_limit').eq('group', GROUP).eq('user', id).maybeSingle();
        return data;
      }).toEqual({ role: 'trial', trial_event_limit: 1 });
    });

    await test.step('sign up for an event open for trials', async () => {
      await page.goto(`/training/event/${OPEN_A}`);
      await page.getByRole('button', { name: 'Teilnehmen', exact: true }).click();
      await expect.poll(() => guestState(OPEN_A)).toBe('AttendingAsTrial');
      await page.goto('/home');
      await expect(page.getByText('Noch 0 von 1 Probetrainings')).toBeVisible();
    });

    await test.step('the next sign-up is refused with a reason', async () => {
      await page.goto(`/training/event/${OPEN_B}`);
      await page.getByRole('button', { name: 'Teilnehmen', exact: true }).click();
      await expect(page.getByText(/Deine Probetrainings sind aufgebraucht/)).toBeVisible();
      await expect.poll(() => guestState(OPEN_B)).toBeNull();
    });

    await test.step('an event closed for trials is not shown', async () => {
      await page.goto('/training/list');
      await expect(page.getByText(`E2E Gast offen A ${stamp}`)).toBeVisible();
      await expect(page.getByText(`E2E Gast geschlossen ${stamp}`)).toHaveCount(0);
    });
  });

  test.afterAll(async () => {
    try {
      const id = await guestId();
      await admin.from('event_attendance_user_mapping').delete().in('event', [OPEN_A, OPEN_B, CLOSED]);
      await admin.from('events').delete().in('id', [OPEN_A, OPEN_B, CLOSED]);
      await admin.from('trial_invites').delete().eq('group', GROUP);
      await admin.from('group_user_mapping').delete().eq('group', GROUP);
      await admin.from('group_features').delete().eq('group', GROUP);
      await admin.from('event_group').delete().eq('id', GROUP);
      for (const userId of [ids.ADMIN, id].filter(Boolean) as string[]) {
        await admin.from('user_direct_grants').delete().eq('user', userId);
        await admin.auth.admin.deleteUser(userId);
      }
    } catch {
      // best-effort
    }
  });
});
