import { admin } from "e2e/utils/adminClient";

export async function seedTestData() {
  // Idempotent seeding used by tests: create a few users and groups used by e2e/playwright tests
  // Users: admin@test.com (admin), user_needs_approval@test.com, user_no_approval@test.com
  const password = process.env.TEST_USER_PASSWORD || 'password';

  async function ensureUser(email: string, displayName: string) {
    // Try to find user in public.user first
    const { data: existing } = await admin.from('user').select('userId').eq('email', email).maybeSingle();
    if (existing && existing.userId) return existing.userId;

    // Create auth user
    try {
      const { data: createdUser, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { displayName, name: displayName },
      } as any);
      if (error) {
        // If user exists or other error, try to query auth.users via admin REST
        console.warn('createUser error', error.message);
      }
      const userId = createdUser?.user?.id ?? createdUser?.id;
      if (userId) {
        // Ensure public.user profile exists
        await admin.from('user').upsert({ userId, email, displayName, name: displayName, role: 'user' }).throwOnError();
        return userId;
      }
    } catch (e) {
      console.warn('createUser threw', e);
    }

    // Last resort: try to find user in auth.users via the admin REST table
    const { data: foundAuthUsers } = await admin.from('user').select('userId').eq('email', email).maybeSingle();
    if (foundAuthUsers?.userId) return foundAuthUsers.userId;

    throw new Error('Could not create or find user ' + email);
  }

  // Ensure users
  const adminId = await ensureUser('admin@test.com', 'Admin User');
  const approvalUserId = await ensureUser('user_needs_approval@test.com', 'Needs Approval');
  const noApprovalUserId = await ensureUser('user_no_approval@test.com', 'No Approval');

  // Create groups
  const groups = [
    { id: '00000000-0000-0000-0000-000000000004', name: 'Group No Approval', need_request_to_join: false },
    { id: '00000000-0000-0000-0000-000000000005', name: 'Group Approval', need_request_to_join: true },
    { id: '00000000-0000-0000-0000-000000000006', name: 'Admin Group', need_request_to_join: false },
  ];

  for (const g of groups) {
    await admin
      .from('event_group')
      .upsert({ id: g.id, name: g.name, visible: true, is_public: true, need_request_to_join: g.need_request_to_join })
      .throwOnError();
  }

  // Ensure admin is admin of Admin Group
  await admin
    .from('group_user_mapping')
    .upsert([
      { user: adminId, group: '00000000-0000-0000-0000-000000000006', role: 'admin' },
      // Pre-existing user as admin in no-approval group to test join flows
      { user: adminId, group: '00000000-0000-0000-0000-000000000004', role: 'admin' },
    ])
    .throwOnError();

  // Ensure no previous mappings for test users
  await admin.from('group_user_mapping').delete().or(`user.eq.${approvalUserId},user.eq.${noApprovalUserId}`);

  // Make sure there are no stale join requests
  await admin.from('group_user_mapping').delete().eq('role', 'joinRequested');

  // Insert a mapping for noApprovalUser in no-approval group as not-member (none) - this is no-op
  // finalize
}
