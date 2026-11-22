import { test, expect, flow } from './fixtures';
import { Page } from '@playwright/test';
import { SupabaseClient } from '@supabase/supabase-js';
import { adminClient, ensureUser, grantUser, logPageOnFailure, signIn } from './helpers';

// Bundesliga: the app reads the bundesliga_* tables the fetch-bundesliga edge function fills.
// The test stores one league of the active season directly (as the function would) and never
// lets the browser reach the live playerzone: every call to the edge function is stubbed.
const stamp = Date.now();
const PZ_ME = `${stamp % 1_000_000_000}`; // the number of my RG ID = my playerzone player id
const TEAM_A = { team_id: `a${stamp}`, team_version_id: `va${stamp}`, name: `E2E Team A ${stamp}` };
const TEAM_B = { team_id: `b${stamp}`, team_version_id: `vb${stamp}`, name: `E2E Team B ${stamp}` };
const PLAYER_1 = `E2E Spielerin ${stamp}`;
const PLAYER_2 = `E2E Spieler ${stamp}`;
const OPP_PLAYER = `E2E Gegner ${stamp}`;
const LEAGUE_NAME = `E2E Liga ${stamp}`;
const EMAIL = `e2e_bundesliga_${stamp}@test.com`;

let admin: SupabaseClient;
let userId = '';
let leagueId = 0;

const player = (team: typeof TEAM_A, id: string, name: string, gender: 'male' | 'female') => ({
  team_id: team.team_id, player_id: id, name, gender, rg_index: 1500, avatar_url: null, pro: false,
});

/** Blocks the scraping edge function and records any call, so nothing reaches the live playerzone. */
async function forbidLiveScrape(page: Page) {
  const calls: string[] = [];
  await page.route('**/functions/v1/fetch-bundesliga**', (route) => {
    calls.push(route.request().url());
    return route.abort();
  });
  return calls;
}

test.describe.configure({ mode: 'serial' });

test.describe('Bundesliga', () => {
  test.beforeAll(async () => {
    admin = adminClient();
    userId = await ensureUser(admin, EMAIL, `E2E Bundesliga ${stamp}`);
    await grantUser(admin, userId, { feats: ['bundesliga'] });
    // My RG ID: its number is a player in TEAM_A's roster.
    await admin.schema('games').from('players').update({ rg_id: `EEE${PZ_ME}` })
      .or(`linked_user_id.eq.${userId},and(player.eq.${userId},linked_user_id.is.null)`).throwOnError();

    const { data: season } = await admin.from('bundesliga_seasons').select('id').eq('active', true).single().throwOnError();
    const { data: league } = await admin.from('bundesliga_leagues')
      .insert({ season_id: (season as { id: number }).id, name: LEAGUE_NAME, sort: 0, teams_page_id: `e2e${stamp}`, schedule_slug: null })
      .select('id').single().throwOnError();
    leagueId = (league as { id: number }).id;

    // Match day 1 is played (B 0:5 A); match day 2 (A vs B) is still open.
    await admin.rpc('bundesliga_replace_league', {
      p_league_id: leagueId,
      p_data: {
        teams: [{ ...TEAM_A, logo_url: null, rgx_total: 3000 }, { ...TEAM_B, logo_url: null, rgx_total: 2000 }],
        players: [
          player(TEAM_A, PZ_ME, PLAYER_1, 'female'),
          player(TEAM_A, `${PZ_ME}2`, PLAYER_2, 'male'),
          player(TEAM_B, `${PZ_ME}3`, OPP_PLAYER, 'male'),
        ],
        matchdays: [{ matchday_id: `m1${stamp}`, number: 1 }, { matchday_id: `m2${stamp}`, number: 2 }],
        groups: [
          { group_id: `g1${stamp}`, matchday_id: `m1${stamp}`, name: 'Gruppe Y', play_date: '2026-10-17', city: 'Karlsruhe' },
          { group_id: `g2${stamp}`, matchday_id: `m2${stamp}`, name: 'Gruppe Z', play_date: '2027-03-06', city: 'Bonn' },
        ],
        encounters: [
          { game_id: `e1${stamp}`, group_id: `g1${stamp}`, team1_id: TEAM_B.team_id, team2_id: TEAM_A.team_id, boards1: 0, boards2: 5, sets1: 0, sets2: 10, winner: 2 },
          { game_id: `e2${stamp}`, group_id: `g2${stamp}`, team1_id: TEAM_A.team_id, team2_id: TEAM_B.team_id, boards1: null, boards2: null, sets1: null, sets2: null, winner: null },
        ],
        standings: [
          { team_id: TEAM_A.team_id, position: 1, wins: 1, draws: 0, losses: 0, sets_for: 10, sets_against: 0, points_for: 210, points_against: 120 },
          { team_id: TEAM_B.team_id, position: 2, wins: 0, draws: 0, losses: 1, sets_for: 0, sets_against: 10, points_for: 120, points_against: 210 },
        ],
      },
    }).throwOnError();
  });

  test.afterEach(async ({ page }, testInfo) => logPageOnFailure(page, testInfo));

  test('my team is found by my RG ID, with its results and the table', { annotation: flow('bundesliga.myteam') }, async ({ page }) => {
    const liveCalls = await forbidLiveScrape(page);
    await signIn(page, EMAIL);
    await page.goto('/bundesliga');

    await expect(page.getByRole('heading', { name: TEAM_A.name })).toBeVisible();
    await expect(page.getByText('Mein Team', { exact: true })).toBeVisible();
    // Match day 1 away: shown from our side as a 5:0 win.
    await expect(page.getByText('5:0')).toBeVisible();
    await expect(page.getByText('Sieg', { exact: true })).toBeVisible();
    // Match day 2 is the next one.
    await expect(page.getByText('Nächster Spieltag · 2. Spieltag')).toBeVisible();
    await expect(page.getByRole('table')).toContainText(TEAM_B.name);
    expect(liveCalls).toEqual([]);
  });

  test('the planner offers my roster and detects the opponent of the next match day', { annotation: flow('bundesliga.team') }, async ({ page }) => {
    const liveCalls = await forbidLiveScrape(page);
    await signIn(page, EMAIL);
    await page.goto('/bundesliga');
    await page.getByRole('button', { name: 'Aufstellung planen' }).click();
    await expect(page.getByText('Spieltag einrichten')).toBeVisible();

    await page.getByRole('combobox').filter({ hasText: /Team wählen|E2E Team/ }).first().click();
    await page.getByRole('option', { name: TEAM_A.name }).click();

    await expect(page.getByText(PLAYER_1, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(PLAYER_2, { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: TEAM_B.name })).toBeVisible();
    expect(liveCalls).toEqual([]);
  });

  test('placing a player in an encounter counts their games', { annotation: flow('bundesliga.lineup') }, async ({ page }) => {
    const liveCalls = await forbidLiveScrape(page);
    await signIn(page, EMAIL);
    await page.goto('/bundesliga/planner');
    await page.getByRole('combobox').filter({ hasText: /Team wählen|E2E Team/ }).first().click();
    await page.getByRole('option', { name: TEAM_A.name }).click();

    await expect(page.getByText('Spiele pro Spieler')).toBeVisible();
    await expect(page.getByText(`${PLAYER_1}: 0`)).toBeVisible();
    await page.getByRole('combobox').filter({ hasText: '— frei —' }).first().click();
    await page.getByRole('option').filter({ hasText: PLAYER_1 }).first().click();
    await expect(page.getByText(`${PLAYER_1}: 1`)).toBeVisible();
    expect(liveCalls).toEqual([]);
  });

  test('only a bundesliga.admin gets the Bundesliga data tool', { annotation: flow('bundesliga.admin') }, async ({ page }) => {
    await forbidLiveScrape(page);
    await signIn(page, EMAIL);
    await page.goto('/admin/bundesliga');
    await expect(page.getByRole('button', { name: 'Jetzt neu laden' })).toHaveCount(0);

    await grantUser(admin, userId, { perms: ['bundesliga.admin'] });
    await signIn(page, EMAIL);
    await page.goto('/admin/bundesliga');
    await expect(page.getByText('Playerzone-Link der Saison')).toBeVisible();
    await expect(page.getByText(LEAGUE_NAME)).toBeVisible();
    // A link that is not a playerzone tournament is refused next to the field.
    await page.getByLabel('Playerzone-Link der Saison').fill('https://example.com/liga');
    await page.getByRole('button', { name: 'Saison übernehmen' }).click();
    await expect(page.getByText(/Das ist kein Playerzone-Turnierlink/)).toBeVisible();
  });

  test('an admin reloads all leagues league by league (playerzone stubbed)', { annotation: flow('bundesliga.scrape') }, async ({ page }) => {
    const calls: string[] = [];
    await page.route('**/functions/v1/fetch-bundesliga**', async (route) => {
      const body = JSON.parse(route.request().postData() ?? '{}') as { action?: string; leagueId?: number };
      calls.push(`${body.action}${body.leagueId ? `:${body.leagueId}` : ''}`);
      if (body.action === 'discover') {
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ leagues: [{ id: leagueId, name: LEAGUE_NAME }] }) });
      }
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({
        league: { id: leagueId, name: LEAGUE_NAME }, teams: 2, players: 3, matchdays: 2, encounters: 2, played: 1,
      }) });
    });
    await grantUser(admin, userId, { perms: ['bundesliga.admin'] });
    await signIn(page, EMAIL);
    await page.goto('/admin/bundesliga');
    await page.getByRole('button', { name: 'Jetzt neu laden' }).click();
    await page.getByRole('button', { name: 'Jetzt neu laden' }).last().click(); // the confirmation

    await expect(page.getByText('2 Teams · 3 Spieler · 1 von 2 Begegnungen gespielt')).toBeVisible();
    expect(calls).toEqual(['discover', `refreshLeague:${leagueId}`]);
  });

  test.afterAll(async () => {
    try {
      if (leagueId) await admin.from('bundesliga_leagues').delete().eq('id', leagueId);
      await admin.from('user_direct_grants').delete().eq('user', userId);
      if (userId) await admin.auth.admin.deleteUser(userId);
    } catch {
      // best-effort
    }
  });
});
