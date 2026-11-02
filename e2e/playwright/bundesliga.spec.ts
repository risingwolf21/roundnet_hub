import { test, expect } from '@playwright/test';
import { SupabaseClient } from '@supabase/supabase-js';
import { adminClient, ensureUser, grantUser, logPageOnFailure, signIn } from './helpers';

// Bundesliga planner: served cache-first from public.bundesliga_cache (the edge function is
// only called on a miss), so seeding fresh cache rows lets the planner render without scraping
// the live playerzone. Picking "Mein Team" must auto-detect the opponent from the match day
// and show our roster for the attendance step.
const stamp = Date.now();
const LEAGUE_ID = '2613'; // the planner's default league (store.ts defaultState)
const TEAM_A = { teamId: '9001', teamVersionId: '99001', name: `E2E Team A ${stamp}` };
const TEAM_B = { teamId: '9002', teamVersionId: '99002', name: `E2E Team B ${stamp}` };
const PLAYER_1 = `E2E Spielerin ${stamp}`;
const PLAYER_2 = `E2E Spieler ${stamp}`;
const OPP_PLAYER = `E2E Gegner ${stamp}`;
const EMAIL = `e2e_bundesliga_${stamp}@test.com`;
const CACHE_KEYS = [`league:${LEAGUE_ID}`, `roster:${TEAM_A.teamVersionId}`, `roster:${TEAM_B.teamVersionId}`];

let admin: SupabaseClient;
let userId = '';

const player = (id: string, name: string, gender: 'male' | 'female') => ({
  id, slug: `p-${id}`, name, gender, rgIndex: 1500, avatarUrl: null, pro: false,
});

/**
 * The planner must be served from the seeded cache only: block the scraping edge function and
 * record any attempt, so a cache miss fails the test instead of silently scraping live data.
 */
async function forbidLiveScrape(page: import('@playwright/test').Page) {
  const calls: string[] = [];
  await page.route('**/functions/v1/fetch-bundesliga**', (route) => {
    calls.push(route.request().url());
    return route.abort();
  });
  return calls;
}

test.describe.configure({ mode: 'serial' });

test.describe('Bundesliga planner', () => {
  test.beforeAll(async () => {
    admin = adminClient();
    userId = await ensureUser(admin, EMAIL, `E2E Planner ${stamp}`);
    await grantUser(admin, userId, { feats: ['bundesliga'] });

    const team = (t: typeof TEAM_A) => ({ ...t, logoUrl: null, rgxTotal: null, firstNames: [] });
    const fetched_at = new Date().toISOString();
    await admin.from('bundesliga_cache').upsert([
      {
        cache_key: `league:${LEAGUE_ID}`,
        fetched_at,
        payload: {
          league: { id: LEAGUE_ID, name: 'E2E Liga' },
          leagues: [{ id: LEAGUE_ID, name: 'E2E Liga' }],
          teams: [team(TEAM_A), team(TEAM_B)],
          matchDays: [{ id: '7001', md: '1', name: 'Gruppe Z', date: '01.12.2026', city: 'Karlsruhe', teams: [TEAM_A, TEAM_B] }],
        },
      },
      { cache_key: `roster:${TEAM_A.teamVersionId}`, fetched_at, payload: [player('1', PLAYER_1, 'female'), player('2', PLAYER_2, 'male')] },
      { cache_key: `roster:${TEAM_B.teamVersionId}`, fetched_at, payload: [player('3', OPP_PLAYER, 'male')] },
    ], { onConflict: 'cache_key' }).throwOnError();
  });

  test.afterEach(async ({ page }, testInfo) => logPageOnFailure(page, testInfo));

  test('picking my team loads its roster from cache and detects the opponent', async ({ page }) => {
    const liveCalls = await forbidLiveScrape(page);
    await signIn(page, EMAIL);
    await page.goto('/bundesliga');
    await expect(page.getByText('Spieltag einrichten')).toBeVisible();

    await page.getByRole('combobox').filter({ hasText: 'Team wählen' }).click();
    await page.getByRole('option', { name: TEAM_A.name }).click();

    // Our roster (from the cached roster payload) is offered for the attendance step…
    await expect(page.getByText(PLAYER_1, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(PLAYER_2, { exact: true }).first()).toBeVisible();
    // …and the opponent from the shared match day was picked automatically.
    await expect(page.getByRole('button', { name: TEAM_B.name })).toBeVisible();

    // A non-admin never gets the hard-reload (re-scrape) control.
    await expect(page.getByTitle('Daten neu laden (Admin)')).toHaveCount(0);
    // Everything came from the cache — the scraping edge function was never called.
    expect(liveCalls).toEqual([]);
  });

  test('a bundesliga.admin gets the hard-reload control', async ({ page }) => {
    const liveCalls = await forbidLiveScrape(page);
    await grantUser(admin, userId, { perms: ['bundesliga.admin'] });
    await signIn(page, EMAIL);
    await page.goto('/bundesliga');
    await expect(page.getByText('Spieltag einrichten')).toBeVisible();
    await expect(page.getByTitle('Daten neu laden (Admin)')).toBeVisible();
    expect(liveCalls).toEqual([]);
  });

  test.afterAll(async () => {
    try {
      await admin.from('bundesliga_cache').delete().in('cache_key', CACHE_KEYS);
      await admin.from('user_direct_grants').delete().eq('user', userId);
      if (userId) await admin.auth.admin.deleteUser(userId);
    } catch {
      // best-effort
    }
  });
});
