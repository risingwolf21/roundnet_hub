import { Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const PASSWORD = process.env.TEST_USER_PASSWORD || 'password';

export async function createAndSignIn(page: Page, email: string) {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  // Ensure user exists
  const { data: existing } = await admin.from('user').select('userId').eq('email', email).maybeSingle();
  if (!existing?.userId) {
    await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true } as any);
  }

  // Use the UI to login
  await page.goto('/auth/login');
  await page.fill('#email', email);
  await page.fill('#password', PASSWORD);
  await page.click('button:has-text("Login")');
}
