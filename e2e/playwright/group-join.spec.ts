import { expect, Page, test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { seedPlaywright } from './seed';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = process.env.TEST_USER_PASSWORD || 'password';

let adminClient: any;

test.beforeAll(async () => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment for e2e tests');
  }
  adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  await seedPlaywright();
});

// Helper to sign up via auth endpoint
async function signUp(page: Page, email: string, password: string, name = 'Test', surname = 'User') {
  await page.goto('/auth/signup');
  await page.fill('#email', email);
  await page.fill('#name', name);
  await page.fill('#surname', surname);
  await page.fill('#password', password);
  await page.fill('#repeat-password', password);
  await page.click('button:has-text("Registrieren")');

  await page.waitForTimeout(2000);
  await page.goto('/');
}

// Helper to sign in
async function signIn(page: Page, email: string, password: string) {
  await page.goto('/auth/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button:has-text("Login")');

  await page.waitForTimeout(2000);
  await page.goto('/');
}

// Helper to sign out
async function signOut(page: Page) {
  await page.goto('/user');
  await page.click('button:has-text("Logout")');
}

// Test flow: register -> logout -> login
test('user can register, logout and login', async ({ page }) => {
  const email = `e2e_register_${Date.now()}@test.com`;
  await signUp(page, email, PASSWORD, 'E2E', 'Register');

  await page.goto('/');
  await page.waitForURL(/\/(help|home)/);
  await page.goto('/user');
  await page.click('button:has-text("Logout")');

  // Login again
  await signIn(page, email, PASSWORD);
  await page.goto('/');
  await page.waitForURL(/\/(help|home)/);
});

// User joins a group that doesn't need approval
test('user joins group without approval', async ({ page }) => {
  const email = `e2e_noapproval_${Date.now()}@test.com`;
  await signUp(page, email, PASSWORD, 'E2E', 'NoApproval');
  await page.goto('/groups/list');

  // Click join button in the same row as Group No Approval
  await page.waitForSelector('div:has-text("Group No Approval")');
  await page.locator('div:has-text("Group No Approval") >> button:has-text("Beitreten")').first().click();

  const { data: user } = await adminClient
    .from('user')
    .select('id')
    .eq('email', email).single();

  // Verify membership created in DB
  const { data: mapping = [] } = await adminClient
    .from('group_user_mapping')
    .select('*')
    .eq('user', user?.id ?? '')
    .eq('group', '00000000-0000-0000-0000-000000000004');


  expect(mapping?.length).toBeGreaterThan(0);
});

// User requests to join group that requires approval, admin accepts
test('user requests join and admin accepts', async ({ page }) => {
  const email = `e2e_approval_${Date.now()}@test.com`;
  await signUp(page, email, PASSWORD, 'E2E', 'Approval');

  // Request join
  await page.goto('/groups/list');
  // Click request button in the same row as Group Approval
  await page.waitForSelector('div:has-text("Group Approval")');
  await page.locator('div:has-text("Group Approval") >> button:has-text("Anfragen")').first().click();

  // Verify joinRequested exists
  const { data: mapping } = await adminClient
    .from('group_user_mapping')
    .select('*')
    .eq('user', (await adminClient.from('user').select('id').eq('email', email).single()).data?.id ?? '')
    .eq('group', '00000000-0000-0000-0000-000000000005');
  expect(mapping?.length).toBeGreaterThan(0);

  // Admin accepts request via DB update (simulate admin action)
  const adminUid = (await adminClient.from('user').select('id').eq('email', 'admin@test.com').single()).data?.id;
  const userUid = (await adminClient.from('user').select('id').eq('email', email).single()).data?.id;
  await adminClient.from('group_user_mapping').update({ role: 'user' }).eq('user', userUid ?? '').eq('group', '00000000-0000-0000-0000-000000000005').throwOnError();

  // Verify role updated
  const { data: updated } = await adminClient
    .from('group_user_mapping')
    .select('*')
    .eq('user', userUid ?? '')
    .eq('group', '00000000-0000-0000-0000-000000000005');
  expect(updated?.[0]?.role).toBe('user');
});
