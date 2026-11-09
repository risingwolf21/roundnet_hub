import { randomUUID } from 'node:crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { test, expect, flow } from './fixtures';
import { adminClient, ensureUser, grantGroup, logPageOnFailure, signIn } from './helpers';

// Trial ("Probetraining") rules beyond the join flow covered in groups-trial.spec.ts:
// the per-event trial cap, promoting a trial member to a regular one, and expiry.
const stamp = Date.now();
const GROUP = randomUUID();
const EVENT = randomUUID();
const TITLE = `E2E Probe-Limit ${stamp}`;
const ADMIN = { email: `e2e_tr_admin_${stamp}@test.com`, name: `E2E Probe Admin ${stamp}` };
const TRIAL_A = { email: `e2e_tr_a_${stamp}@test.com`, name: `E2E Probe A ${stamp}` };
const TRIAL_B = { email: `e2e_tr_b_${stamp}@test.com`, name: `E2E Probe B ${stamp}` };

let admin: SupabaseClient;
const ids: Record<string, string> = {};

const stateOf = async (userId: string) => {
  const { data } = await admin.from('event_attendance_user_mapping').select('state').eq('event', EVENT).eq('user', userId).maybeSingle();
  return (data as { state?: string } | null)?.state ?? null;
};
const roleOf = async (userId: string) => {
  const { data } = await admin.from('group_user_mapping').select('role').eq('group', GROUP).eq('user', userId).maybeSingle();
  return (data as { role?: string } | null)?.role ?? null;
};

test.describe.configure({ mode: 'serial' });

test.describe('Probetraining', () => {
  test.beforeAll(async () => {
    admin = adminClient();
    for (const [k, u] of Object.entries({ ADMIN, TRIAL_A, TRIAL_B })) ids[k] = await ensureUser(admin, u.email, u.name);
    await admin.from('event_group').upsert({ id: GROUP, name: `E2E Probe Gruppe ${stamp}`, visible: true, is_public: true, need_request_to_join: true }).throwOnError();
    await grantGroup(admin, GROUP, { feats: ['events', 'events.trials'], perms: ['event.signup'] });
    await admin.from('group_user_mapping').upsert([
      { user: ids.ADMIN, group: GROUP, role: 'admin' },
      { user: ids.TRIAL_A, group: GROUP, role: 'trial' },
      { user: ids.TRIAL_B, group: GROUP, role: 'trial' },
    ]).throwOnError();
    const now = Date.now();
    await admin.from('events').insert({
      id: EVENT, title: TITLE, description: '—', group: GROUP, max_trial_attendees: 1,
      startingDateTime: new Date(now + 4 * 864e5).toISOString(),
      endDateTime: new Date(now + 4 * 864e5 + 2 * 36e5).toISOString(),
    }).throwOnError();
  });

  test.afterEach(async ({ page }, testInfo) => logPageOnFailure(page, testInfo));

  test('only max_trial_attendees trial members get a seat, the next one waits', { annotation: flow('trials.limit') }, async ({ page }) => {
    await signIn(page, TRIAL_A.email);
    await page.goto(`/training/event/${EVENT}`);
    await page.getByRole('button', { name: 'Teilnehmen', exact: true }).click();
    await expect.poll(() => stateOf(ids.TRIAL_A)).toBe('AttendingAsTrial');

    await signIn(page, TRIAL_B.email);
    await page.goto(`/training/event/${EVENT}`);
    await page.getByRole('button', { name: 'Teilnehmen', exact: true }).click();
    await expect.poll(() => stateOf(ids.TRIAL_B)).toBe('WaitingAsTrial');
  });

  test('a group admin promotes a trial member to a regular member', { annotation: flow('trials.promote') }, async ({ page }) => {
    await signIn(page, ADMIN.email);
    await page.goto(`/groups/${GROUP}`);
    // Trial rows show the remaining trial time.
    await expect(page.getByText(/noch \d+ Tage?/).first()).toBeVisible();

    await page.getByRole('button', { name: `Aktionen für ${TRIAL_A.name}` }).click();
    await page.getByRole('menuitem', { name: 'Als Vollmitglied aufnehmen' }).click();
    await page.getByRole('button', { name: 'Bestätigen' }).click();

    await expect(page.getByText('Rolle aktualisiert.')).toBeVisible();
    await expect.poll(() => roleOf(ids.TRIAL_A)).toBe('user');
  });

  test('an expired trial falls back to a join request and loses future trial seats', { annotation: flow('trials.expire') }, async ({ page }) => {
    // The nightly job (pg_cron → expire_trial_memberships) — run it directly after backdating.
    await admin.from('group_user_mapping').update({ trial_started_at: new Date(Date.now() - 60 * 864e5).toISOString() })
      .eq('group', GROUP).eq('user', ids.TRIAL_B).throwOnError();
    const { error } = await admin.rpc('expire_trial_memberships');
    expect(error).toBeNull();

    await expect.poll(() => roleOf(ids.TRIAL_B)).toBe('joinRequested');
    await expect.poll(() => stateOf(ids.TRIAL_B)).toBeNull();

    // The admin now sees them as an open join request again.
    await signIn(page, ADMIN.email);
    await page.goto(`/groups/${GROUP}`);
    await page.getByRole('button', { name: 'Prüfen' }).click();
    await expect(page.getByText('Anfrage zum Beitritt')).toBeVisible();
    await expect(page.getByText(TRIAL_B.name, { exact: true })).toBeVisible();
  });

  test.afterAll(async () => {
    try {
      await admin.from('event_attendance_user_mapping').delete().eq('event', EVENT);
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
