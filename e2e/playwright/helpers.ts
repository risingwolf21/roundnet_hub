import { Page, TestInfo, expect } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Shared e2e helpers. The harness (playwright.yml) exports the local stack's real keys as
// VITE_SUPABASE_URL / SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
export const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
export const PASSWORD = process.env.TEST_USER_PASSWORD ?? 'password';

export function adminClient(): SupabaseClient {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error('VITE_SUPABASE_URL/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Creates a confirmed auth user (+ public.user profile) and returns its id. */
export async function ensureUser(admin: SupabaseClient, email: string, displayName: string): Promise<string> {
  const { data: existing } = await admin.from('user').select('id').eq('email', email).maybeSingle();
  if ((existing as { id?: string } | null)?.id) return (existing as { id: string }).id;

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name: displayName, displayName },
  });
  const id = created?.user?.id;
  if (!id) throw error ?? new Error('could not create ' + email);
  await admin.from('user').upsert({ id, email, displayName, name: displayName, role: 'user' }).throwOnError();
  return id;
}

/**
 * Grants come from user_grants_view = direct grants ∪ the user's groups' group_permissions /
 * group_features. A freshly seeded group has none, so its members would lack e.g. the
 * `events` feature (the whole /training tree is feature-gated) — seed them explicitly.
 */
export async function grantGroup(
  admin: SupabaseClient,
  groupId: string,
  { feats = [], perms = [] }: { feats?: string[]; perms?: string[] },
) {
  // group_permissions has no primary key to upsert against, so (re)write rows as delete+insert.
  if (feats.length) {
    await admin.from('features').upsert(feats.map((name) => ({ name })), { onConflict: 'name', ignoreDuplicates: true }).throwOnError();
    await admin.from('group_features').delete().eq('group', groupId).in('feature', feats).throwOnError();
    await admin.from('group_features').insert(feats.map((feature) => ({ group: groupId, feature }))).throwOnError();
  }
  if (perms.length) {
    await admin.from('permissions').upsert(perms.map((name) => ({ name })), { onConflict: 'name', ignoreDuplicates: true }).throwOnError();
    await admin.from('group_permissions').delete().eq('group', groupId).in('permission', perms).throwOnError();
    await admin.from('group_permissions').insert(perms.map((permission) => ({ group: groupId, permission }))).throwOnError();
  }
}

/** Direct (per-user) grants — use when only some members of a group may hold a permission. */
export async function grantUser(
  admin: SupabaseClient,
  userId: string,
  { feats = [], perms = [] }: { feats?: string[]; perms?: string[] },
) {
  if (perms.length) {
    await admin.from('permissions').upsert(perms.map((name) => ({ name })), { onConflict: 'name', ignoreDuplicates: true }).throwOnError();
  }
  if (feats.length) {
    await admin.from('features').upsert(feats.map((name) => ({ name })), { onConflict: 'name', ignoreDuplicates: true }).throwOnError();
  }
  const rows = [
    ...perms.map((key) => ({ user: userId, kind: 'perm', key })),
    ...feats.map((key) => ({ user: userId, kind: 'feat', key })),
  ];
  if (rows.length) await admin.from('user_direct_grants').upsert(rows, { ignoreDuplicates: true }).throwOnError();
}

/**
 * Signs in through the real login form. AuthLayout redirects an already signed-in visitor
 * away from /auth/login, so drop any existing session first — this lets one test switch
 * between users on the same page.
 */
const pageErrors = new WeakMap<Page, string[]>();

/** Collects uncaught page errors and console errors so a failing test can print them. */
export function trackErrors(page: Page) {
  if (pageErrors.has(page)) return;
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text().slice(0, 300)}`);
  });
}

export async function signIn(page: Page, email: string, password = PASSWORD) {
  trackErrors(page);
  await page.goto('/auth/login');
  await page.evaluate(() => {
    try {
      window.localStorage.clear();
      window.sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });
  await page.goto('/auth/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button:has-text("Login")');
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

/** On failure, print where the page was and what it showed — cheap triage straight in the CI log. */
export async function logPageOnFailure(page: Page, testInfo: TestInfo) {
  if (testInfo.status === testInfo.expectedStatus) return;
  const text = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 600);
  const errors = (pageErrors.get(page) ?? []).slice(-8).map((e) => `  ${e}`).join('\n');
  console.log(`[e2e-fail] ${testInfo.title}\n  url: ${page.url()}\n  body: ${text}${errors ? `\n${errors}` : ''}`);
}

export { expect };
