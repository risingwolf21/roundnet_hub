import { expect, Page, test } from '@playwright/test';
import { User } from '@supabase/supabase-js';
import { admin } from 'e2e/utils/adminClient';

const PASSWORD = process.env.TEST_USER_PASSWORD || 'password';

// Helper to sign in
async function signIn(page: Page, email: string, password: string) {
  await page.goto('/auth/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button:has-text("Login")');

  await page.waitForTimeout(2000);
  await page.goto('/');
}

test.describe("Gruppenbetritt", () => {

  const GROUP_NAME_NO_APPROVAL = 'Group No Approval';
  const GROUP_NAME_APPROVAL = 'Group Approval';

  const USER_NAME = `e2e_${Date.now()}`
  const USER_EMAIL = `${USER_NAME}@test.com`;

  let GROUP_APPROVAL: Group;
  let GROUP_NO_APPROVAL: Group;

  let USER: User;

  test.beforeAll(async () => {
    await admin.from("event_group").delete().eq("name", GROUP_NAME_APPROVAL);
    await admin.from("event_group").delete().eq("name", GROUP_NAME_NO_APPROVAL);

    await admin.from("user").delete().eq("name", USER_NAME);

    const result = await admin.auth.admin.createUser({
      email: USER_EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { name: USER_NAME, displayName: USER_NAME, email: USER_EMAIL }
    })

    const { data: group_approval } = await admin
      .from('event_group')
      .insert({ name: GROUP_NAME_APPROVAL, "need_request_to_join": true, "is_public": true })
      .select()
      .single();

    const { data: group_no_approval } = await admin
      .from('event_group')
      .insert({ name: GROUP_NAME_NO_APPROVAL, "need_request_to_join": false, "is_public": true })
      .select()
      .single();

    if (!result || !result.data.user)
      throw Error("Benutzer konnte nicht erstellt werden. " + (JSON.stringify(result.error) ?? ''))

    USER = result.data.user;

    if (!group_approval || !group_no_approval)
      throw Error("Gruppen konnten nicht erstellt werden")

    GROUP_APPROVAL = group_approval;
    GROUP_NO_APPROVAL = group_no_approval;
  });

  test('user joins group without approval', async ({ page }) => {
    await signIn(page, USER.email!, PASSWORD)
    await page.goto('/groups/list');

    const noApprovalRow = page.locator('div.flex-row').filter({ hasText: GROUP_NO_APPROVAL.name }).first();
    const noApprovalJoinBtn = noApprovalRow.getByRole('button', { name: 'Beitreten' });

    await noApprovalJoinBtn.click();

    await expect(noApprovalJoinBtn).toBeHidden();

    // Verify membership created in DB
    const { data: mapping = [] } = await admin
      .from('group_user_mapping')
      .select('*')
      .eq('user', USER.id)
      .eq('group', GROUP_NO_APPROVAL.id);

    expect(mapping?.length).toBeGreaterThan(0);
  });

  test('user requests join and admin accepts', async ({ page }) => {
    await signIn(page, USER.email!, PASSWORD);

    // Request join
    await page.goto('/groups/list');

    const approvalRow = page.locator('div.flex-row').filter({ hasText: GROUP_APPROVAL.name }).first();
    const approvalReqBtn = approvalRow.getByRole('button', { name: 'Anfragen' });

    await approvalReqBtn.click();

    await expect(approvalReqBtn).toBeHidden();

    // Verify joinRequested exists
    const { data: mapping } = await admin
      .from('group_user_mapping')
      .select('*')
      .eq('user', USER.id)
      .eq('group', GROUP_APPROVAL.id);

    expect(mapping?.length).toBeGreaterThan(0);

    await admin.from('group_user_mapping').update({ role: 'user' })
      .eq('user', USER.id)
      .eq('group', GROUP_APPROVAL.id)
      .throwOnError();

    // Verify role updated
    const { data: updated } = await admin
      .from('group_user_mapping')
      .select('*')
      .eq('user', USER.id)
      .eq('group', GROUP_APPROVAL.id);

    expect(updated?.[0]?.role).toBe('user');
  });


  test.afterAll(async () => {
    await admin.from("event_group").delete().in("id", [GROUP_APPROVAL.id, GROUP_NO_APPROVAL.id]);

    await admin.from("user").delete().eq("id", USER.id);
    await admin.auth.admin.deleteUser(USER.id);
  });
});

// test.beforeAll(async () => {
//   if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
//     throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment for e2e tests');
//   }
//   adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
//   await seedPlaywright();
// });


// // Test flow: register -> logout -> login
// test('user can register, logout and login', async ({ page }) => {
//   const email = `e2e_register_${Date.now()}@test.com`;
//   await signUp(page, email, PASSWORD, 'E2E', 'Register');

//   await page.goto('/');
//   await page.waitForURL(/\/(help|home)/);
//   await page.goto('/user');
//   await page.click('button:has-text("Logout")');

//   // Login again
//   await signIn(page, email, PASSWORD);
//   await page.goto('/');
//   await page.waitForURL(/\/(help|home)/);
// });

// // User joins a group that doesn't need approval
// test('user joins group without approval', async ({ page }) => {
//   const email = `e2e_noapproval_${Date.now()}@test.com`;
//   await signUp(page, email, PASSWORD, 'E2E', 'NoApproval');
//   await page.goto('/groups/list');

//   const noApprovalRow = page.locator('div.flex-row').filter({ hasText: 'Group No Approval' });
//   const noApprovalJoinBtn = noApprovalRow.getByRole('button', { name: 'Beitreten' });

//   await noApprovalJoinBtn.click();

//   await expect(noApprovalJoinBtn).toBeHidden();

//   const { data: user } = await adminClient
//     .from('user')
//     .select('id')
//     .eq('email', email).single();

//   // Verify membership created in DB
//   const { data: mapping = [] } = await adminClient
//     .from('group_user_mapping')
//     .select('*')
//     .eq('user', user?.id ?? '')
//     .eq('group', '00000000-0000-0000-0000-000000000004');


//   expect(mapping?.length).toBeGreaterThan(0);
// });

// // User requests to join group that requires approval, admin accepts
// test('user requests join and admin accepts', async ({ page }) => {
//   const email = `e2e_approval_${Date.now()}@test.com`;
//   await signUp(page, email, PASSWORD, 'E2E', 'Approval');

//   // Request join
//   await page.goto('/groups/list');

//   const approvalRow = page.locator('div.flex-row').filter({ hasText: 'Group Approval' });
//   const approvalReqBtn = approvalRow.getByRole('button', { name: 'Anfragen' });

//   await approvalReqBtn.click();

//   await expect(approvalReqBtn).toBeHidden();

//   // Verify joinRequested exists
//   const { data: mapping } = await adminClient
//     .from('group_user_mapping')
//     .select('*')
//     .eq('user', (await adminClient.from('user').select('id').eq('email', email).single()).data?.id ?? '')
//     .eq('group', '00000000-0000-0000-0000-000000000005');
//   expect(mapping?.length).toBeGreaterThan(0);

//   const userUid = (await adminClient.from('user').select('id').eq('email', email).single()).data?.id;
//   await adminClient.from('group_user_mapping').update({ role: 'user' }).eq('user', userUid ?? '').eq('group', '00000000-0000-0000-0000-000000000005').throwOnError();

//   // Verify role updated
//   const { data: updated } = await adminClient
//     .from('group_user_mapping')
//     .select('*')
//     .eq('user', userUid ?? '')
//     .eq('group', '00000000-0000-0000-0000-000000000005');
//   expect(updated?.[0]?.role).toBe('user');
// });
