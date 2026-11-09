// @vitest-environment node
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { adminClient, deleteUser, hasLocalSupabase, signUpNewUser } from './integration/localSupabase';

describe.skipIf(!hasLocalSupabase)('groups (integration)', () => {
  const publicGroupId = crypto.randomUUID();
  const privateGroupId = crypto.randomUUID();
  const createdUsers: string[] = [];

  const newUser = async () => {
    const result = await signUpNewUser();
    createdUsers.push(result.user.id);
    return result;
  };

  beforeAll(async () => {
    // Groups can only be created by platform admins, so fixtures use the service role.
    await adminClient()
      .from('event_group')
      .insert([
        { id: publicGroupId, name: 'vitest public', visible: true, is_public: true, need_request_to_join: false },
        { id: privateGroupId, name: 'vitest private', visible: true, is_public: false, need_request_to_join: true },
      ])
      .throwOnError();
  });

  afterAll(async () => {
    for (const id of createdUsers) await deleteUser(id);
    await adminClient().from('event_group').delete().in('id', [publicGroupId, privateGroupId]);
  });

  test('normal users cannot create groups', async () => {
    const { client } = await newUser();
    const { data, error } = await client
      .from('event_group')
      .insert({ id: crypto.randomUUID(), name: 'not allowed', is_public: true })
      .select('*');

    expect(error?.code).toBe('42501');
    expect(data).toBeNull();
  });

  test('public group without join request is joinable', async () => {
    const { client } = await newUser();
    const { data } = await client.rpc('is_group_public_joinable', { p_group: publicGroupId });
    expect(data).toBe(true);
  });

  test('a new user can join a public group as user', async () => {
    const { client, user } = await newUser();
    const { data, error } = await client
      .from('group_user_mapping')
      .insert({ user: user.id, group: publicGroupId, role: 'user' })
      .select('*');

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  test('a new user cannot join a public group as admin', async () => {
    const { client, user } = await newUser();
    const { error } = await client
      .from('group_user_mapping')
      .insert({ user: user.id, group: publicGroupId, role: 'admin' });

    expect(error?.code).toBe('42501');
  });

  test('a group that needs a request can only be requested, not joined', async () => {
    const { client, user } = await newUser();
    const join = await client.from('group_user_mapping').insert({ user: user.id, group: privateGroupId, role: 'user' });
    expect(join.error?.code).toBe('42501');

    const request = await client
      .from('group_user_mapping')
      .insert({ user: user.id, group: privateGroupId, role: 'joinRequested' });
    expect(request.error).toBeNull();
  });

  test('users cannot add other users to a group', async () => {
    const { client } = await newUser();
    const { user: other } = await newUser();
    const { error } = await client.from('group_user_mapping').insert({ user: other.id, group: publicGroupId, role: 'user' });

    expect(error?.code).toBe('42501');
  });
});
