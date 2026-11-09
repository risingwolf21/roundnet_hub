// @vitest-environment node
import { afterAll, describe, expect, test } from 'vitest';
import { deleteUser, hasLocalSupabase, signUpNewUser } from './integration/localSupabase';

describe.skipIf(!hasLocalSupabase)('sign up (integration)', () => {
  const created: string[] = [];
  afterAll(async () => {
    for (const id of created) await deleteUser(id);
  });

  test('creates a profile row and a linked player via triggers', async () => {
    const { client, user, email } = await signUpNewUser();
    created.push(user.id);

    const { data: profile } = await client.from('user').select('*').eq('id', user.id).single();
    // Newer accounts get their own player id and are linked via linked_user_id,
    // legacy accounts use player = user id.
    const { data: player } = await client
      .schema('games')
      .from('players')
      .select('*')
      .or(`linked_user_id.eq.${user.id},player.eq.${user.id}`)
      .single();

    expect(profile?.email).toBe(email);
    expect(player).toBeTruthy();
    expect(player?.linked_user_id ?? player?.player).toBe(user.id);
  });

  test('a new user cannot change their own elo / rating columns', async () => {
    const { client, user } = await signUpNewUser();
    created.push(user.id);

    const { error } = await client
      .schema('games')
      .from('players')
      .update({ ka_index: 9999, effective_rating_cached: 9999 })
      .or(`linked_user_id.eq.${user.id},player.eq.${user.id}`);

    expect(error?.code).toBe('42501');
  });
});
