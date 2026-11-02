import { Page } from '@playwright/test';
import { SupabaseClient } from '@supabase/supabase-js';
import { test, expect, flow } from './fixtures';
import { adminClient, ensureUser, logPageOnFailure, PASSWORD, signIn } from './helpers';

// Profile page (/user): account data, password, calendar subscription, Playerzone link, logout.
const stamp = Date.now();
const EMAIL = `e2e_profile_${stamp}@test.com`;
const NEW_PASSWORD = `E2e-neu-${stamp}`;

let admin: SupabaseClient;
let userId = '';

async function openTab(page: Page, name: string) {
  await page.goto('/user');
  await page.getByRole('tab', { name }).click();
}

test.describe.configure({ mode: 'serial' });

test.describe('Profil', () => {
  test.beforeAll(async () => {
    admin = adminClient();
    userId = await ensureUser(admin, EMAIL, `E2E Profil ${stamp}`);
  });

  test.afterEach(async ({ page }, testInfo) => logPageOnFailure(page, testInfo));

  test('a user edits name and display name @mobile', { annotation: flow('profile.account') }, async ({ page }) => {
    await signIn(page, EMAIL);
    await openTab(page, 'Account');
    await page.locator('#multi-step-personal-info-display-name').fill('Kojote');
    await page.locator('#multi-step-personal-info-first-name').fill('Erika');
    await page.locator('#multi-step-personal-info-last-name').fill('Musterfrau');
    await page.getByRole('button', { name: 'Änderungen Speichern' }).click();

    await expect(page.getByText('Profil erfolgreich aktualisiert')).toBeVisible();
    await expect.poll(async () => {
      const { data } = await admin.from('user').select('name, displayName').eq('id', userId).single();
      return data;
    }).toEqual({ name: 'Erika Musterfrau', displayName: 'Kojote' });
  });

  test('a user links their Playerzone profile', { annotation: flow('profile.playerzone') }, async ({ page }) => {
    await signIn(page, EMAIL);
    await openTab(page, 'Playerzone Profil');
    const url = page.getByPlaceholder('https://playerzone.de/user/123');

    // A foreign URL is rejected.
    await url.fill('https://example.com/me');
    await page.getByRole('button', { name: 'Änderungen Speichern' }).click();
    await expect(page.getByText(/Bitte vergewissere dich, dass die URL stimmt/)).toBeVisible();

    const link = `https://playerzone.roundnetgermany.de/players/e2e-${stamp}`;
    await url.fill(link);
    await page.getByRole('combobox').filter({ hasText: /Geschlecht auswählen|Open|Women/ }).click();
    await page.getByRole('option', { name: 'Open' }).click();
    await page.getByRole('button', { name: 'Änderungen Speichern' }).click();
    await expect(page.getByText('Profil erfolgreich aktualisiert')).toBeVisible();
    await expect.poll(async () => {
      // Same "own player" filter as the app (PlayerDataRepository). The rg_link trigger would call
      // the fetch-player-info edge function, but the e2e stack has no EDGE_* Vault secrets, so
      // nothing ever reaches the live Playerzone.
      const { data } = await admin.schema('games').from('players').select('rg_link')
        .or(`linked_user_id.eq.${userId},and(player.eq.${userId},linked_user_id.is.null)`).maybeSingle();
      return (data as { rg_link: string | null } | null)?.rg_link;
    }).toBe(link);
  });

  test('the calendar button opens the personal calendar feed', { annotation: flow('profile.calendar') }, async ({ page }) => {
    await signIn(page, EMAIL);
    await openTab(page, 'Kalender');
    // Don't leave for Google: catch the navigation and check the feed URL it carries.
    let target = '';
    await page.route('https://calendar.google.com/**', (route) => {
      target = route.request().url();
      return route.abort();
    });
    await page.getByRole('button', { name: 'Kalender synchronisieren' }).click();
    await expect.poll(() => decodeURIComponent(target)).toContain(`/ical/${userId}/calendar.ics`);
  });

  test('a user changes the password and logs in with the new one', { annotation: flow('profile.password') }, async ({ page }) => {
    await signIn(page, EMAIL);
    await openTab(page, 'Passwort ändern');
    await page.locator('#password').fill(NEW_PASSWORD);
    await page.locator('#confirmPassword').fill(`${NEW_PASSWORD}x`);
    await page.getByRole('button', { name: 'Neues Passwort setzen' }).click();
    await expect(page.getByText('Die Passwörter stimmen nicht überein.')).toBeVisible();

    await page.locator('#confirmPassword').fill(NEW_PASSWORD);
    await page.getByRole('button', { name: 'Neues Passwort setzen' }).click();

    await expect.poll(async () => {
      const c = adminClient();
      const { error } = await c.auth.signInWithPassword({ email: EMAIL, password: NEW_PASSWORD });
      return error?.message ?? 'ok';
    }).toBe('ok');
    await signIn(page, EMAIL, NEW_PASSWORD);
    await page.goto('/user');
    await expect(page.getByRole('tab', { name: 'Account' })).toBeVisible();
  });

  test('logout ends the session', { annotation: flow('auth.logout') }, async ({ page }) => {
    await signIn(page, EMAIL, NEW_PASSWORD);
    await openTab(page, 'Account');
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/auth\/login/);
    // Protected pages send you back to the login.
    await page.goto('/training/list');
    await expect(page).toHaveURL(/auth\/login/);
  });

  test.afterAll(async () => {
    try {
      if (userId) await admin.auth.admin.deleteUser(userId);
    } catch {
      // best-effort
    }
  });
});

test('signing up creates an account and opens the app', { annotation: flow('auth.signup') }, async ({ page }) => {
  const admin2 = adminClient();
  const email = `e2e_signup_${Date.now()}@test.com`;
  await page.goto('/auth/signup');
  await page.locator('#email').fill(email);
  await page.locator('#name').fill('Neue');
  await page.locator('#surname').fill('Spielerin');
  await page.locator('#password').fill(PASSWORD);
  await page.locator('#repeat-password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Registrieren' }).click();

  // Local stack: no e-mail confirmation → straight into the app (help page for new users).
  await expect(page).toHaveURL(/\/help|\/auth\/login/);
  const { data } = await admin2.from('user').select('id, name, displayName').eq('email', email).maybeSingle();
  expect(data).toMatchObject({ name: 'Neue Spielerin', displayName: 'Neue' });
  await admin2.auth.admin.deleteUser((data as { id: string }).id).catch(() => undefined);
});

test('protected pages redirect to the login when signed out', { annotation: flow('auth.redirect') }, async ({ page }) => {
  await page.goto('/training/list');
  await expect(page).toHaveURL(/auth\/login/);
  await expect(page.locator('#email')).toBeVisible();
});
