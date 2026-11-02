import { Page } from '@playwright/test';
import { test, expect, flow } from './fixtures';
import { SupabaseClient } from '@supabase/supabase-js';
import { adminClient, ensureUser, logPageOnFailure, signIn } from './helpers';

// Joining groups from /groups/list (PublicGroupList / JoinGroupButton):
// a no-approval group shows "Beitreten" and joins immediately, an approval group shows
// "Anfragen" and creates a joinRequested mapping that an admin can accept.
const stamp = Date.now();
const NAME_NO_APPROVAL = `E2E Open Group ${stamp}`;
const NAME_APPROVAL = `E2E Approval Group ${stamp}`;
const USER_EMAIL = `e2e_groupjoin_${stamp}@test.com`;

let admin: SupabaseClient;
let userId = '';
let openGroupId = '';
let approvalGroupId = '';

/** The list row for a group, located by its exact name (rows have no role / test id). */
function groupRow(page: Page, name: string) {
  return page.locator('div.flex-row.items-center', { has: page.getByText(name, { exact: true }) }).last();
}

async function mapping(groupId: string) {
  const { data } = await admin
    .from('group_user_mapping').select('role').eq('user', userId).eq('group', groupId).maybeSingle();
  return (data as { role?: string } | null)?.role ?? null;
}

test.describe.configure({ mode: 'serial' });

test.describe('Gruppenbeitritt', () => {
  test.beforeAll(async () => {
    admin = adminClient();
    userId = await ensureUser(admin, USER_EMAIL, `E2E Joiner ${stamp}`);

    const { data: groups } = await admin.from('event_group').insert([
      { name: NAME_NO_APPROVAL, visible: true, is_public: true, need_request_to_join: false },
      { name: NAME_APPROVAL, visible: true, is_public: true, need_request_to_join: true },
    ]).select('id,name').throwOnError();
    openGroupId = groups!.find((g) => g.name === NAME_NO_APPROVAL)!.id;
    approvalGroupId = groups!.find((g) => g.name === NAME_APPROVAL)!.id;
  });

  test.afterEach(async ({ page }, testInfo) => logPageOnFailure(page, testInfo));

  test('a user joins a group without approval @mobile', { annotation: flow('groups.list', 'groups.join') }, async ({ page }) => {
    await signIn(page, USER_EMAIL);
    await page.goto('/groups/list');

    const joinBtn = groupRow(page, NAME_NO_APPROVAL).getByRole('button', { name: 'Beitreten' });
    await joinBtn.click();

    await expect.poll(() => mapping(openGroupId)).toBe('user');
    await expect(joinBtn).toBeHidden();
  });

  test('a user requests to join an approval group and an admin accepts', { annotation: flow('groups.request') }, async ({ page }) => {
    await signIn(page, USER_EMAIL);
    await page.goto('/groups/list');

    const requestBtn = groupRow(page, NAME_APPROVAL).getByRole('button', { name: 'Anfragen' });
    await requestBtn.click();

    await expect.poll(() => mapping(approvalGroupId)).toBe('joinRequested');
    await expect(requestBtn).toBeHidden();

    // Admin accepts the request.
    await admin.from('group_user_mapping').update({ role: 'user' })
      .eq('user', userId).eq('group', approvalGroupId).throwOnError();
    await expect.poll(() => mapping(approvalGroupId)).toBe('user');
  });

  test.afterAll(async () => {
    try {
      await admin.from('group_user_mapping').delete().in('group', [openGroupId, approvalGroupId]);
      await admin.from('event_group').delete().in('id', [openGroupId, approvalGroupId]);
      if (userId) await admin.auth.admin.deleteUser(userId);
    } catch {
      // best-effort
    }
  });
});
