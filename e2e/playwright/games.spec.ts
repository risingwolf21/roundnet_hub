import { randomUUID } from 'node:crypto';
import { Page } from '@playwright/test';
import { SupabaseClient } from '@supabase/supabase-js';
import { test, expect, flow } from './fixtures';
import { adminClient, ensureUser, grantUser, logPageOnFailure, signIn } from './helpers';

// Games: enter a 2v2 match with sets, then find it in the list, the match page, the
// leaderboard and a player's game history.
const stamp = Date.now();
const P = {
  ME: { email: `e2e_gm_me_${stamp}@test.com`, name: `E2E Spielerin Eins ${stamp}` },
  MATE: { email: `e2e_gm_mate_${stamp}@test.com`, name: `E2E Partner Zwei ${stamp}` },
  OPP1: { email: `e2e_gm_opp1_${stamp}@test.com`, name: `E2E Gegner Drei ${stamp}` },
  OPP2: { email: `e2e_gm_opp2_${stamp}@test.com`, name: `E2E Gegner Vier ${stamp}` },
};

let admin: SupabaseClient;
const ids: Record<string, string> = {};
let matchId = '';
const GROUP = randomUUID();
const EVENT = randomUUID();
const CONST_EVENT = randomUUID();

async function pickPlayer(page: Page, slot: number, name: string) {
  const dialog = page.getByRole('dialog', { name: 'Spiel erstellen' });
  await dialog.locator('[data-slot="item"]').nth(slot).click();
  const picker = page.getByRole('dialog').last();
  await picker.getByRole('searchbox').fill(name);
  await picker.getByText(name, { exact: true }).click();
  await expect(dialog.getByText(name, { exact: true })).toBeVisible();
}

test.describe.configure({ mode: 'serial' });

test.describe('Spiele', () => {
  test.beforeAll(async () => {
    admin = adminClient();
    for (const [k, u] of Object.entries(P)) {
      ids[k] = await ensureUser(admin, u.email, u.name);
      await grantUser(admin, ids[k], { feats: ['games'] });
    }
    // An event of a group with games, for the event's "Spiele" tab.
    await admin.from('event_group').upsert({ id: GROUP, name: `E2E Spiele Gruppe ${stamp}`, visible: false }).throwOnError();
    await admin.from('group_features').insert([{ group: GROUP, feature: 'events' }, { group: GROUP, feature: 'games' }]).throwOnError();
    await admin.from('group_user_mapping').upsert(Object.values(ids).map((user) => ({ user, group: GROUP, role: 'user' }))).throwOnError();
    await admin.from('events').insert({
      id: EVENT, title: `E2E Spieleabend ${stamp}`, description: '—', group: GROUP,
      startingDateTime: new Date(Date.now() - 36e5).toISOString(), endDateTime: new Date(Date.now() + 36e5).toISOString(),
    }).throwOnError();
  });

  test.afterEach(async ({ page }, testInfo) => logPageOnFailure(page, testInfo));

  test('a player enters a 2v2 match with its sets', { annotation: flow('games.report') }, async ({ page }) => {
    await signIn(page, P.ME.email);
    await page.goto('/matches/list');
    await page.locator('div.fixed.right-6 button').click();
    const dialog = page.getByRole('dialog', { name: 'Spiel erstellen' });
    await expect(dialog).toBeVisible();
    // Slot 0 (Team A, player 1) is the signed-in player.
    await pickPlayer(page, 1, P.OPP1.name);
    await pickPlayer(page, 2, P.MATE.name);
    await pickPlayer(page, 3, P.OPP2.name);

    const scores = dialog.locator('input[type="number"]');
    if ((await scores.count()) < 2) await dialog.getByRole('button', { name: /Satz/ }).first().click();
    await scores.nth(0).fill('21');
    await scores.nth(1).fill('15');
    await dialog.getByRole('button', { name: 'Speichern' }).click();

    await expect.poll(async () => {
      const { data } = await admin.schema('games').from('match').select('id').order('created_at', { ascending: false }).limit(5);
      for (const m of (data ?? []) as { id: string }[]) {
        const { data: sets } = await admin.schema('games').from('sets').select('team_a_score, team_b_score').eq('match', m.id);
        if ((sets ?? []).some((s) => (s as { team_a_score: number }).team_a_score === 21 && (s as { team_b_score: number }).team_b_score === 15)) {
          matchId = m.id;
          return true;
        }
      }
      return false;
    }).toBe(true);
  });

  test('the match shows up in the list and opens its page', { annotation: flow('games.list', 'games.detail') }, async ({ page }) => {
    await signIn(page, P.MATE.email);
    await page.goto('/matches/list');
    // Rows show "Lastname / Lastname" per team (the e2e users' last name is the stamp) and the set scores.
    const row = page.locator('[data-slot="item"]', { hasText: String(stamp) }).first();
    await expect(row).toContainText('21');
    await expect(row).toContainText('15');
    await row.click();
    await expect(page).toHaveURL(new RegExp(`/matches/${matchId}`));
    await expect(page.getByText('Sätze')).toBeVisible();
    await expect(page.getByText(P.OPP1.name.split(' ')[0], { exact: false }).first()).toBeVisible();
  });

  test('the leaderboard lists the players and opens a game history', { annotation: flow('games.leaderboard', 'games.history') }, async ({ page }) => {
    await signIn(page, P.ME.email);
    await page.goto('/matches/leaderboard');
    const row = page.locator('[data-slot="item"]', { hasText: P.ME.name }).first();
    await expect(row).toBeVisible();
    await row.getByRole('button').first().click();
    await expect(page.getByRole('dialog').locator('[data-slot="item"]', { hasText: String(stamp) }).first()).toBeVisible();
  });

  test('a match is booked on the players\' own player records', { annotation: flow('games.report') }, async () => {
    // New accounts have a random player id linked via linked_user_id — the match must be booked
    // on that real player, not on a ghost guest created for the user id.
    const { data } = await admin.schema('games').from('match').select('a_player_1').eq('id', matchId).single();
    const { data: me } = await admin.schema('games').from('players').select('player').eq('linked_user_id', ids.ME).single();
    expect((data as { a_player_1: string }).a_player_1).toBe((me as { player: string }).player);
    // No ghost guest players (player = user id, unlinked) were created…
    const { data: ghosts } = await admin.schema('games').from('players').select('player').in('player', Object.values(ids));
    expect(ghosts ?? []).toEqual([]);
    // …and the other participants got the "new game" notification (user ids, not player ids).
    await expect.poll(async () => {
      const { data: n } = await admin.schema('notifications').from('notifications').select('user').eq('topic', 'game.added').eq('user', ids.MATE);
      return (n ?? []).length;
    }).toBeGreaterThan(0);
  });

  test('a match entered from an event shows up in the event\'s games tab', { annotation: flow('events.matches') }, async ({ page }) => {
    await signIn(page, P.ME.email);
    await page.goto(`/training/event/${EVENT}`);
    await page.getByRole('tab', { name: /Spiele \(0\)/ }).click();
    await expect(page.getByText('Noch keine Spiele.', { exact: false })).toBeVisible();
    await page.getByRole('tabpanel').getByRole('button').first().click();
    await pickPlayer(page, 1, P.OPP1.name);
    await pickPlayer(page, 2, P.MATE.name);
    await pickPlayer(page, 3, P.OPP2.name);
    const dialog = page.getByRole('dialog', { name: 'Spiel erstellen' });
    const scores = dialog.locator('input[type="number"]');
    await scores.nth(0).fill('19');
    await scores.nth(1).fill('21');
    await dialog.getByRole('button', { name: 'Speichern' }).click();

    await expect.poll(async () => (await admin.schema('games').from('match').select('id').eq('event', EVENT)).data?.length).toBe(1);
    await page.reload();
    await page.getByRole('tab', { name: /Spiele \(1\)/ }).click();
    await expect(page.getByRole('tabpanel').locator('[data-slot="item"]').first()).toContainText('19');
  });

  test('a trainer generates constellations for the attendees and saves the round', { annotation: flow('events.constellations') }, async ({ page }) => {
    await grantUser(admin, ids.ME, { perms: ['event.create.constellations'] });
    await admin.from('events').insert({
      id: CONST_EVENT, title: `E2E Konstellationen ${stamp}`, description: '—', group: GROUP, constellations_enabled: true,
      startingDateTime: new Date(Date.now() - 36e5).toISOString(), endDateTime: new Date(Date.now() + 36e5).toISOString(),
    }).throwOnError();
    await admin.from('event_attendance_user_mapping').insert(
      Object.values(ids).map((user) => ({ event: CONST_EVENT, user, state: 'Attending' })),
    ).throwOnError();

    await signIn(page, P.ME.email);
    await page.goto(`/training/event/${CONST_EVENT}`);
    await page.getByRole('button', { name: 'Konstellationen erstellen' }).click();
    const dialog = page.getByRole('dialog', { name: 'Konstellationen' });
    await dialog.getByRole('button', { name: 'Neue Runde hinzufügen' }).click();
    await dialog.getByRole('button', { name: /Runde 1/ }).click();
    await dialog.getByRole('button', { name: 'Generieren' }).click();
    await expect(dialog.getByRole('button', { name: /Spiele \([1-9]/ })).toBeVisible();
    await dialog.getByRole('button', { name: 'Matches speichern' }).click();

    await expect(dialog.getByText('kein Index gefunden')).toHaveCount(0);
    await expect(page.getByText('Alle Matches der Runde erfolgreich erstellt!')).toBeVisible();
    await expect.poll(async () => (await admin.schema('games').from('match').select('id').eq('event', CONST_EVENT)).data?.length)
      .toBeGreaterThan(0);
  });

  test.afterAll(async () => {
    try {
      if (matchId) {
        await admin.schema('games').from('sets').delete().eq('match', matchId);
        await admin.schema('games').from('match').delete().eq('id', matchId);
      }
      await admin.from('event_attendance_user_mapping').delete().eq('event', CONST_EVENT);
      const { data: em } = await admin.schema('games').from('match').select('id').in('event', [EVENT, CONST_EVENT]);
      for (const m of (em ?? []) as { id: string }[]) {
        await admin.schema('games').from('sets').delete().eq('match', m.id);
        await admin.schema('games').from('match').delete().eq('id', m.id);
      }
      await admin.from('events').delete().in('id', [EVENT, CONST_EVENT]);
      await admin.from('group_user_mapping').delete().eq('group', GROUP);
      await admin.from('group_features').delete().eq('group', GROUP);
      await admin.from('event_group').delete().eq('id', GROUP);
      // Ghost guest players created by add_match_with_sets (player id = user id, unlinked).
      const { data: ghostMatches } = await admin.schema('games').from('match').select('id')
        .or(Object.values(ids).map((id) => `a_player_1.eq.${id},a_player_2.eq.${id},b_player_1.eq.${id},b_player_2.eq.${id}`).join(','));
      for (const m of (ghostMatches ?? []) as { id: string }[]) {
        await admin.schema('games').from('sets').delete().eq('match', m.id);
        await admin.schema('games').from('match').delete().eq('id', m.id);
      }
      await admin.schema('games').from('players').delete().in('player', Object.values(ids));
      for (const id of Object.values(ids)) {
        await admin.from('user_direct_grants').delete().eq('user', id);
        await admin.auth.admin.deleteUser(id);
      }
    } catch {
      // best-effort
    }
  });
});
