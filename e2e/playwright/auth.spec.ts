import { test, expect, Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Auth + password-reset UI flow.
// Harness provides VITE_SUPABASE_URL/SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (local stack).
const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = process.env.TEST_USER_PASSWORD ?? 'password';

// supabase-js persists the session under a key like `sb-<ref>-auth-token`.
async function waitForSignedIn(page: Page) {
  await page.waitForFunction(
    () => {
      try {
        return Object.keys(window.localStorage).some((k) => k.includes('auth-token'));
      } catch {
        return false;
      }
    },
    undefined,
    { timeout: 30_000 },
  );
}

test.describe('Auth', () => {
  let admin: ReturnType<typeof createClient>;
  const email = `e2e_auth_${Date.now()}@test.com`;

  test.beforeAll(async () => {
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      throw new Error('VITE_SUPABASE_URL/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    }
    admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { name: 'Auth E2E', displayName: 'Auth E2E' },
    } as never);
  });

  test('a confirmed user can log in and reach the app', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('#email', email);
    await page.fill('#password', PASSWORD);
    await page.click('button:has-text("Login")');

    // LoginForm persists the session (no explicit redirect); once it exists, a protected
    // route must not bounce back to the login page.
    await waitForSignedIn(page);
    await page.goto('/');
    await expect(page).not.toHaveURL(/\/auth\/login/);
  });

  test('a wrong password keeps the user on the login page with an error', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('#email', email);
    await page.fill('#password', 'definitely-the-wrong-password');
    await page.click('button:has-text("Login")');

    await expect(page.getByText('Login failed. Try again!')).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('forgot-password is reachable from login and confirms the request', async ({ page }) => {
    await page.goto('/auth/login');
    await page.click('text=Passwort vergessen?');
    await expect(page).toHaveURL(/\/auth\/forgot-password/);

    await page.fill('#email', email);
    await page.click('button:has-text("Passwort zurücksetzen")');

    // On success the form swaps to a confirmation message (mail goes to the local Inbucket).
    await expect(page.getByText(/Es wurde eine Email/i)).toBeVisible({ timeout: 30_000 });
  });

  test.afterAll(async () => {
    try {
      const { data } = await admin.from('user').select('id').eq('email', email).maybeSingle();
      const id = (data as { id?: string } | null)?.id;
      if (id) await admin.auth.admin.deleteUser(id);
    } catch {
      // best-effort cleanup
    }
  });
});
