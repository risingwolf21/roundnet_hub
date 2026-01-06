import { supabase } from '@/lib/supabase';
import { expect, test } from 'vitest';
import { SETUP } from './setupTests';


test('main group is joinable without request', async () => {
  const { data, error } = await supabase.from('event_group')
    .insert({ id: SETUP.main_group.id, name: SETUP.main_group.name, visible: true, is_public: true, need_request_to_join: false })
    .select('*');

  expect(error).toBeNull();
  expect(data?.length).toBe(1);
  console.log(data);
  const { data: functionResult } = await supabase.rpc('is_group_public_joinable', { p_group: SETUP.main_group.id });

  expect(functionResult).toBe(true);
});

test('new user signup can join a public group', async () => {
  const email = `test-${Date.now()}@example.com`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password: '123123123',
  });

  await supabase.auth.setSession(data.session!);

  expect(error).toBeNull();
  expect(data.user).toBeTruthy();
  expect(data.user?.email).toBe(email);

  const { data: joinData, error: joinError } = await supabase
    .from('group_user_mapping')
    .insert({ user: data.user!.id, group: SETUP.main_group.id, role: 'user' })
    .select('*');

  expect(joinError).toBeNull();
  expect(joinData?.length).toBe(1);
});
