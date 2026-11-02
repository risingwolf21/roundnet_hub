import { randomUUID } from 'node:crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { test, expect, flow } from './fixtures';
import { adminClient, ensureUser, grantGroup, grantUser, logPageOnFailure, signIn } from './helpers';

// Challenges: create one, list it, enter points during its running period, see the leaderboard.
const stamp = Date.now();
const GROUP = randomUUID();
const GROUP_NAME = `E2E Challenge Gruppe ${stamp}`;
const TITLE = `E2E Liegestütz-Challenge ${stamp}`;
const RUNNING = `E2E Laufende Challenge ${stamp}`;
const HOST = { email: `e2e_ch_host_${stamp}@test.com`, name: `E2E Challengerin ${stamp}` };
const ATHLETE = { email: `e2e_ch_ath_${stamp}@test.com`, name: `E2E Sportler ${stamp}` };

let admin: SupabaseClient;
const ids: Record<string, string> = {};
let runningId = '';

const pointsOf = async (userId: string) => {
  const { data } = await admin.from('challenge_stats').select('count').eq('challenge', runningId).eq('user', userId);
  return ((data ?? []) as { count: number }[]).reduce((s, r) => s + Number(r.count), 0);
};

test.describe.configure({ mode: 'serial' });

test.describe('Challenges', () => {
  test.beforeAll(async () => {
    admin = adminClient();
    for (const [k, u] of Object.entries({ HOST, ATHLETE })) ids[k] = await ensureUser(admin, u.email, u.name);
    await admin.from('event_group').upsert({ id: GROUP, name: GROUP_NAME, visible: false }).throwOnError();
    await grantGroup(admin, GROUP, { feats: ['challenges'], perms: ['challenges.stats.write'] });
    await grantUser(admin, ids.HOST, { perms: ['challenge.create'] });
    await admin.from('group_user_mapping').upsert([
      { user: ids.HOST, group: GROUP, role: 'admin' },
      { user: ids.ATHLETE, group: GROUP, role: 'user' },
    ]).throwOnError();
    // A challenge that runs from a week ago until next week.
    const { data } = await admin.from('challenge').insert({
      name: RUNNING, description: 'Läuft gerade', group: GROUP, max_points_per_day: 5,
      start_date: new Date(Date.now() - 7 * 864e5).toISOString(),
      end_date: new Date(Date.now() + 7 * 864e5).toISOString(),
    }).select('id').single().throwOnError();
    runningId = (data as { id: string }).id;
  });

  test.afterEach(async ({ page }, testInfo) => logPageOnFailure(page, testInfo));

  test('a member with challenge.create starts a new challenge', { annotation: flow('challenges.create') }, async ({ page }) => {
    await signIn(page, HOST.email);
    await page.goto('/challenges/list');
    await page.locator('button:has(svg.lucide-plus)').first().click();
    await page.locator('#challenge-title').fill(TITLE);
    await page.locator('#challenge-description').fill('Jeden Tag Liegestütze');
    await page.locator('#challenge-group').click();
    await page.getByRole('option', { name: GROUP_NAME }).click();
    await page.getByRole('button', { name: 'Erstellen' }).click();

    await expect(page.getByText('Challenge wurde erfolgreich erstellt.')).toBeVisible();
    await expect(page).toHaveURL(/\/challenges\/[0-9a-f-]{36}/);
    await expect.poll(async () => (await admin.from('challenge').select('id').eq('name', TITLE)).data?.length).toBe(1);
  });

  test('the challenge list shows the group’s challenges @mobile', { annotation: flow('challenges.list') }, async ({ page }) => {
    await signIn(page, ATHLETE.email);
    await page.goto('/challenges/list');
    await expect(page.getByText(RUNNING).first()).toBeVisible();
  });

  test('a member enters points in a running challenge', { annotation: flow('challenges.points') }, async ({ page }) => {
    await signIn(page, ATHLETE.email);
    await page.goto(`/challenges/${runningId}`);
    await page.getByRole('button', { name: 'Neuen Challengepunkt erstellen' }).click();
    await expect(page.getByRole('dialog').getByText('Punkt hinzufügen')).toBeVisible();
    const confirm = page.getByRole('dialog').getByRole('button', { name: 'Bestätigen' });
    await expect(confirm).toBeDisabled(); // no date yet
    await page.getByRole('button', { name: 'Datum wählen' }).click();
    await page.locator('td[data-today="true"] button:not([disabled])').first().click();
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await expect(page.getByText('Punkt erfolgreich hinzugefügt')).toBeVisible();
    await expect.poll(() => pointsOf(ids.ATHLETE)).toBeGreaterThan(0);
  });

  test('the leaderboard ranks the members', { annotation: flow('challenges.leaderboard') }, async ({ page }) => {
    if ((await pointsOf(ids.ATHLETE)) === 0) {
      await admin.from('challenge_stats').insert({ challenge: runningId, user: ids.ATHLETE, count: 3 }).throwOnError();
    }
    await signIn(page, HOST.email);
    await page.goto(`/challenges/${runningId}`);
    await page.getByRole('tab', { name: 'Leaderboard' }).click();
    await expect(page.getByText(ATHLETE.name).first()).toBeVisible();
  });

  test.afterAll(async () => {
    try {
      const { data } = await admin.from('challenge').select('id').eq('group', GROUP);
      const cids = ((data ?? []) as { id: string }[]).map((c) => c.id);
      if (cids.length) {
        await admin.from('challenge_stats').delete().in('challenge', cids);
        await admin.from('challenge').delete().in('id', cids);
      }
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
