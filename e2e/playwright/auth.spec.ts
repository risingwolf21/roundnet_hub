import { test, expect } from '@playwright/test';
import { adminClient, ensureUser, logPageOnFailure, PASSWORD } from './helpers';

// Auth + password-reset UI flow, selectors aligned to LoginForm / ForgotPassword.
test.describe('Auth', () => {
  const email = `e2e_auth_${Date.now()}@test.com`;
  let userId = '';

  test.beforeAll(async () => {
    userId = await ensureUser(adminClient(), email, 'Auth E2E');
  });

  test.afterEach(async ({ page }, testInfo) => logPageOnFailure(page, testInfo));

  test('a confirmed user can log in and reach the app', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('#email', email);
    await page.fill('#password', PASSWORD);
    await page.click('button:has-text("Login")');

    // LoginForm only persists the session (no explicit redirect); once it exists, a protected
    // route must not bounce back to the login page.
    await page.waitForFunction(
      () => Object.keys(window.localStorage).some((k) => k.includes('auth-token')),
      undefined,
      { timeout: 30_000 },
    );
    await page.goto('/');
    await expect(page).not.toHaveURL(/\/auth\/login/);
  });

  test('a wrong password keeps the user on the login page with an error', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('#email', email);
    await page.fill('#password', 'definitely-the-wrong-password');
    await page.click('button:has-text("Login")');

    await expect(page.getByText('Login failed. Try again!')).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('forgot-password is reachable from login and confirms the request', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByText('Passwort vergessen?').click();
    await expect(page).toHaveURL(/\/auth\/forgot-password/);

    await page.fill('#email', email);
    await page.getByRole('button', { name: 'Abschicken' }).click();

    // On success the form is replaced by a confirmation card (mail goes to the local Inbucket).
    await expect(page.getByText('Email wurde versendet')).toBeVisible();
  });

  test.afterAll(async () => {
    if (userId) await adminClient().auth.admin.deleteUser(userId).catch(() => undefined);
  });
});
