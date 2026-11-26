import { Page } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { test, expect, flow } from './fixtures';
import { adminClient, ensureUser, grantUser, logPageOnFailure, PASSWORD, signIn, SUPABASE_URL } from './helpers';

// Profile page (/user): account data, password, calendar subscription, Playerzone link, logout.
const stamp = Date.now();
const EMAIL = `e2e_profile_${stamp}@test.com`;
const NEW_PASSWORD = `E2e-neu-${stamp}`;

let admin: SupabaseClient;
let userId = '';

// The profile is an overview of section rows; each row opens its section as its own page.
async function openSection(page: Page, name: string) {
  await page.goto('/user');
  await page.getByRole('main').getByRole('link', { name }).click();
}

test.describe.configure({ mode: 'serial' });

test.describe('Profil', () => {
  test.beforeAll(async () => {
    admin = adminClient();
    userId = await ensureUser(admin, EMAIL, `E2E Profil ${stamp}`);
    // The calendar section is only offered with the events feature.
    await grantUser(admin, userId, { feats: ['events'] });
  });

  test.afterEach(async ({ page }, testInfo) => logPageOnFailure(page, testInfo));

  test('a user edits name and display name @mobile', { annotation: flow('profile.account') }, async ({ page }) => {
    await signIn(page, EMAIL);
    await openSection(page, 'Account');
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

  test('a user uploads and crops a profile picture', { annotation: flow('profile.avatar') }, async ({ page }) => {
    // 64×64 red PNG, generated in the browser so the test needs no fixture file.
    await signIn(page, EMAIL);
    await openSection(page, 'Account');
    const png = await page.evaluate(async () => {
      const c = document.createElement('canvas'); c.width = 64; c.height = 64;
      const ctx = c.getContext('2d')!; ctx.fillStyle = '#c00'; ctx.fillRect(0, 0, 64, 64);
      return c.toDataURL('image/png').split(',')[1];
    });
    await page.locator('input[type="file"]').setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
    const crop = page.getByRole('dialog', { name: 'Bild zuschneiden' });
    await expect(crop).toBeVisible();
    // The crop area is computed once the image has loaded — retry until the dialog takes it.
    await expect(async () => {
      if (await crop.isVisible()) await page.getByRole('button', { name: 'Zuschneiden & Speichern' }).click();
      await expect(crop).toBeHidden({ timeout: 1000 });
    }).toPass({ timeout: 10_000 });
    await expect(page.getByAltText('Vorschau des Profilbilds')).toBeVisible();
    await page.getByRole('button', { name: 'Änderungen Speichern' }).click();

    await expect(page.getByText('Profil erfolgreich aktualisiert')).toBeVisible();
    await expect.poll(async () => (await admin.from('user').select('avatarUrl').eq('id', userId).single()).data?.avatarUrl ?? '')
      .toContain(userId);
    const { data: files } = await admin.storage.from('user').list(userId);
    expect((files ?? []).length).toBeGreaterThan(0);
  });

  test('a user links their Playerzone profile', { annotation: flow('profile.playerzone') }, async ({ page }) => {
    await signIn(page, EMAIL);
    await openSection(page, 'Playerzone Profil');
    const rgIdField = page.getByLabel('RG-ID', { exact: true });

    // A link is no longer accepted, only the RG ID.
    await rgIdField.fill('https://playerzone.roundnetgermany.de/players/221-sarah-kiel');
    await page.getByRole('button', { name: 'Änderungen Speichern' }).click();
    await expect(page.getByText(/Gib deine RG-ID ein: drei Buchstaben und eine Zahl/)).toBeVisible();

    // The RG ID is stored in upper case.
    const rgId = `EEE${stamp}`;
    await rgIdField.fill(rgId.toLowerCase());
    await page.getByRole('combobox').filter({ hasText: /Geschlecht auswählen|Open|Women/ }).click();
    await page.getByRole('option', { name: 'Open' }).click();
    await page.getByRole('button', { name: 'Änderungen Speichern' }).click();
    await expect(page.getByText('Profil erfolgreich aktualisiert')).toBeVisible();
    await expect.poll(async () => {
      // Same "own player" filter as the app (PlayerDataRepository). The rg_id trigger would call
      // the fetch-player-info edge function, but the e2e stack has no EDGE_* Vault secrets, so
      // nothing ever reaches the live Playerzone.
      const { data } = await admin.schema('games').from('players').select('rg_id')
        .or(`linked_user_id.eq.${userId},and(player.eq.${userId},linked_user_id.is.null)`).maybeSingle();
      return (data as { rg_id: string | null } | null)?.rg_id;
    }).toBe(rgId);
  });

  test('the calendar button opens the personal calendar feed', { annotation: flow('profile.calendar') }, async ({ page }) => {
    await signIn(page, EMAIL);
    await openSection(page, 'Kalender');
    // Don't leave for Google: the button opens a new tab, so catch it on the context and check the feed URL it carries.
    let target = '';
    await page.context().route('https://calendar.google.com/**', (route) => {
      target = route.request().url();
      return route.abort();
    });
    await page.getByRole('button', { name: 'Zu Google Kalender hinzufügen' }).click();
    // The feed is addressed by the user's secret token, never by the user id.
    const { data } = await admin.from('calendar_feed_tokens').select('token').eq('user', userId).single();
    await expect.poll(() => decodeURIComponent(target)).toContain(`/ical/${data!.token}/calendar.ics`);
    expect(target).not.toContain(userId);
  });

  test('a user subscribes to all events they have not declined', { annotation: flow('profile.calendar') }, async ({ page }) => {
    await signIn(page, EMAIL);
    await openSection(page, 'Kalender');
    let target = '';
    await page.context().route('https://calendar.google.com/**', (route) => {
      target = route.request().url();
      return route.abort();
    });
    await page.getByRole('radio', { name: 'Alle außer Absagen' }).click();
    await expect(page.getByRole('radio', { name: 'Alle außer Absagen' })).toHaveAttribute('aria-checked', 'true');
    await page.getByRole('button', { name: 'Zu Google Kalender hinzufügen' }).click();
    const { data } = await admin.from('calendar_feed_tokens').select('token').eq('user', userId).single();
    await expect.poll(() => decodeURIComponent(target)).toContain(`/ical/${data!.token}/all.ics`);
  });

  test('a user changes the password and logs in with the new one', { annotation: flow('profile.password') }, async ({ page }) => {
    await signIn(page, EMAIL);
    await openSection(page, 'Passwort ändern');
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
    await expect(page.getByRole('main').getByRole('link', { name: 'Account' })).toBeVisible();
  });

  test('logout ends the session', { annotation: flow('auth.logout') }, async ({ page }) => {
    await signIn(page, EMAIL, NEW_PASSWORD);
    // Logout sits on the overview, below the sections.
    await page.goto('/user');
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/auth\/login/);
    // Protected pages send you back to the login.
    await page.goto('/training/list');
    await expect(page).toHaveURL(/auth\/login/);
  });

  test.afterAll(async () => {
    try {
      const { data: files } = await admin.storage.from('user').list(userId);
      if (files?.length) await admin.storage.from('user').remove(files.map((f) => `${userId}/${f.name}`));
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

test('a recovery link lets the user set a new password', { annotation: flow('auth.reset') }, async ({ page }) => {
  // The e-mail itself is the external part: create the recovery token like the mail would carry,
  // exchange it as GoTrue's verify endpoint does, and open the link target with the session in
  // the hash (implicit flow) — exactly what /auth/reset-password receives from a real mail.
  const admin3 = adminClient();
  const email = `e2e_reset_${Date.now()}@test.com`;
  const userId = await ensureUser(admin3, email, 'E2E Vergesslich');
  const { data: link, error } = await admin3.auth.admin.generateLink({ type: 'recovery', email });
  expect(error).toBeNull();
  const anon = createClient(SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY ?? '', { auth: { persistSession: false } });
  const { data: verified } = await anon.auth.verifyOtp({ type: 'recovery', token_hash: link!.properties!.hashed_token });
  const s = verified!.session!;
  await page.goto(`/auth/reset-password#access_token=${s.access_token}&refresh_token=${s.refresh_token}&type=recovery`);

  await expect(page.getByText('Neues Passwort festlegen')).toBeVisible();
  await page.locator('#password').fill('Neu-123456');
  await page.locator('#repeat').fill('Neu-123456');
  await page.locator('form button[type="submit"]').click();
  await expect(page.getByText('Dein Passwort wurde geändert.', { exact: false })).toBeVisible();

  const { error: loginError } = await anon.auth.signInWithPassword({ email, password: 'Neu-123456' });
  expect(loginError).toBeNull();
  await admin3.auth.admin.deleteUser(userId).catch(() => undefined);
});

