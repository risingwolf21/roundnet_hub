import { SupabaseClient } from '@supabase/supabase-js';
import { test, expect, flow } from './fixtures';
import { adminClient, ensureUser, grantUser, logPageOnFailure, signIn } from './helpers';

// Correcting the sets of an existing match ("Sätze bearbeiten"): only participants with
// games.update.score may, and the change is stored (RLS: games.is_match_participant, which
// also has to recognise accounts whose player id differs from their user id).
const stamp = Date.now();
const P = {
  ME: { email: `e2e_gs_me_${stamp}@test.com`, name: `E2E Satz Eins ${stamp}` },
  MATE: { email: `e2e_gs_mate_${stamp}@test.com`, name: `E2E Satz Zwei ${stamp}` },
  OPP1: { email: `e2e_gs_o1_${stamp}@test.com`, name: `E2E Satz Drei ${stamp}` },
  OPP2: { email: `e2e_gs_o2_${stamp}@test.com`, name: `E2E Satz Vier ${stamp}` },
  OUTSIDER: { email: `e2e_gs_out_${stamp}@test.com`, name: `E2E Zuschauer ${stamp}` },
};

let admin: SupabaseClient;
const ids: Record<string, string> = {};
const players: Record<string, string> = {};
let matchId = '';

const sets = async () => {
  const { data } = await admin.schema('games').from('sets').select('set_number, team_a_score, team_b_score, type')
    .eq('match', matchId).eq('type', 'normal').order('set_number');
  return ((data ?? []) as { team_a_score: number; team_b_score: number }[]).map((s) => `${s.team_a_score}:${s.team_b_score}`);
};

test.describe.configure({ mode: 'serial' });

test.describe('Sätze korrigieren', () => {
  test.beforeAll(async () => {
    admin = adminClient();
    for (const [k, u] of Object.entries(P)) {
      ids[k] = await ensureUser(admin, u.email, u.name);
      await grantUser(admin, ids[k], { feats: ['games'], perms: ['games.update.score'] });
      const { data } = await admin.schema('games').from('players').select('player').eq('linked_user_id', ids[k]).single();
      players[k] = (data as { player: string }).player;
    }
    const { data, error } = await admin.schema('games').rpc('add_match_with_sets', {
      player_1a: players.ME, player_1a_rating: 1000, player_2a: players.MATE, player_2a_rating: 1000,
      player_1b: players.OPP1, player_1b_rating: 1000, player_2b: players.OPP2, player_2b_rating: 1000,
      match_sets: [{ team_a_score: 21, team_b_score: 18 }], rated: true, is_public: true, player_names: {},
    });
    if (error) throw error;
    matchId = data as string;
  });

  test.afterEach(async ({ page }, testInfo) => logPageOnFailure(page, testInfo));

  test('a participant corrects a set and adds another', { annotation: flow('games.sets') }, async ({ page }) => {
    await signIn(page, P.ME.email);
    await page.goto(`/matches/${matchId}`);
    const setsCard = page.locator('[data-slot="item"]', { has: page.getByText('Sätze', { exact: true }) }).first();
    await setsCard.locator('button:has(svg.lucide-pencil)').click();

    const dialog = page.getByRole('dialog', { name: 'Sätze bearbeiten' });
    const scores = dialog.locator('input[type="number"]');
    await scores.nth(0).fill('21');
    await scores.nth(1).fill('19');
    await dialog.getByRole('button').filter({ has: page.locator('svg.lucide-plus') }).first().click();
    await scores.nth(2).fill('15');
    await scores.nth(3).fill('21');
    await dialog.getByRole('button', { name: 'Speichern' }).click();

    await expect.poll(sets).toEqual(['21:19', '15:21']);
  });

  test('someone who did not play cannot edit the sets', { annotation: flow('games.sets') }, async ({ page }) => {
    await signIn(page, P.OUTSIDER.email);
    await page.goto(`/matches/${matchId}`);
    await expect(page.getByText('Sätze', { exact: true })).toBeVisible();
    const setsCard = page.locator('[data-slot="item"]', { has: page.getByText('Sätze', { exact: true }) }).first();
    await expect(setsCard.locator('button:has(svg.lucide-pencil)')).toHaveCount(0);
  });

  test.afterAll(async () => {
    try {
      if (matchId) {
        await admin.schema('games').from('sets').delete().eq('match', matchId);
        await admin.schema('games').from('match').delete().eq('id', matchId);
      }
      for (const id of Object.values(ids)) {
        await admin.from('user_direct_grants').delete().eq('user', id);
        await admin.auth.admin.deleteUser(id);
      }
    } catch {
      // best-effort
    }
  });
});
