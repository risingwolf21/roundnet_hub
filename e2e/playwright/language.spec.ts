import { SupabaseClient } from '@supabase/supabase-js';
import { expect, flow, test } from './fixtures';
import { adminClient, ensureUser, logPageOnFailure, PASSWORD, signIn } from './helpers';

// Language switcher (profile → Account): German is the default, the choice is saved on the
// account (user.language) and survives a reload; sign-up takes the language of the device.
const stamp = Date.now();
const EMAIL = `e2e_lang_${stamp}@test.com`;

let admin: SupabaseClient;
let userId = '';

const savedLanguage = async () =>
  (await admin.from('user').select('language').eq('id', userId).single()).data?.language;

test.describe.configure({ mode: 'serial' });

test.describe('Sprache', () => {
  test.beforeAll(async () => {
    admin = adminClient();
    userId = await ensureUser(admin, EMAIL, `E2E Sprache ${stamp}`);
  });

  test.afterEach(async ({ page }, testInfo) => logPageOnFailure(page, testInfo));

  test('the language can be switched to English and back, and is saved on the account', { annotation: flow('profile.language') }, async ({ page }) => {
    expect(await savedLanguage()).toBe('de');

    await signIn(page, EMAIL);
    await page.goto('/user');
    await expect(page.getByText('Anzeigename', { exact: true })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');

    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'English' }).click();
    await page.getByRole('button', { name: 'Änderungen Speichern' }).click();
    await expect(page.getByText('Display name', { exact: true })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect.poll(savedLanguage).toBe('en');

    // The account's language is still applied after a reload.
    await page.reload();
    await expect(page.getByText('Display name', { exact: true })).toBeVisible();

    await page.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Deutsch' }).click();
    await page.getByRole('button', { name: 'Änderungen Speichern' }).click();
    await expect(page.getByText('Anzeigename', { exact: true })).toBeVisible();
    await expect.poll(savedLanguage).toBe('de');
  });

  test('signing up with English selected on the device creates an English account', { annotation: flow('profile.language') }, async ({ page }) => {
    const email = `e2e_lang_signup_${Date.now()}@test.com`;
    await page.addInitScript(() => localStorage.setItem('i18nextLng', 'en'));
    await page.goto('/auth/signup');
    await page.locator('#email').fill(email);
    await page.locator('#name').fill('Eve');
    await page.locator('#surname').fill('English');
    await page.locator('#password').fill(PASSWORD);
    await page.locator('#repeat-password').fill(PASSWORD);
    await page.getByRole('button', { name: /Registrieren|Sign up/i }).click();

    await expect.poll(async () => (await admin.from('user').select('language').eq('email', email).maybeSingle()).data?.language).toBe('en');
    const { data } = await admin.from('user').select('id').eq('email', email).single();
    await admin.auth.admin.deleteUser((data as { id: string }).id).catch(() => undefined);
  });

  test.afterAll(async () => {
    try {
      if (userId) await admin.auth.admin.deleteUser(userId);
    } catch {
      // best-effort
    }
  });
});
