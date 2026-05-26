import { createClient } from '@supabase/supabase-js';

export async function seedPlaywright() {
  const admin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const password = 'password';

  async function ensureUser(email: string, displayName: string) {
    const { data: existing } = await admin.from('user').select('id').eq('email', email).maybeSingle();
    if (existing && (existing as any).id) return (existing as any).id;

    try {
      const { data: createdUser } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { displayName, name: displayName },
      } as any);
      const userId = (createdUser as any)?.user?.id;
      if (userId) {
        await admin.from('user').upsert({ id: userId, email, displayName, name: displayName, role: 'user' }).throwOnError();
        return userId;
      }
    } catch (e) {
      console.warn('createUser failed', e);
    }
    const { data: found } = await admin.from('user').select('id').eq('email', email).maybeSingle();
    if ((found as any)?.id) return (found as any).id;
    throw new Error('Could not create or find user ' + email);
  }

  const adminId = await ensureUser('admin@test.com', 'Admin User');
  const approvalUserId = await ensureUser('user_needs_approval@test.com', 'Needs Approval');
  const noApprovalUserId = await ensureUser('user_no_approval@test.com', 'No Approval');

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

  await admin.from("user_direct_grants").upsert([
    { user: adminId, kind: "perm", key: "supabase.admin" },
    { user: adminId, kind: "perm", key: "grants.manage" }
  ]).throwOnError();

  await admin
    .from('group_user_mapping')
    .upsert([
      { user: adminId, group: '00000000-0000-0000-0000-000000000006', role: 'admin' },
      { user: adminId, group: '00000000-0000-0000-0000-000000000004', role: 'admin' },
    ])
    .throwOnError();

  // cleanup stale joinRequested entries
  await admin.from('group_user_mapping').delete().eq('role', 'joinRequested');

  return { adminId, approvalUserId, noApprovalUserId };
}
