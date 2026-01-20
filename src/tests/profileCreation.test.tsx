import { supabase } from '@/lib/supabase';
import { expect, test } from 'vitest';

test('sign up creates a profile row via trigger', async () => {
  const email = `test-${Date.now()}@example.com`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password: '123123123',
  });

  expect(error).toBeNull();
  expect(data.user?.email).toBe(email);

  const { data: profile } = await supabase
    .from('user')
    .select('*')
    .eq('id', data.user?.id ?? '')
    .single();

  const { data: player } = await supabase
    .schema('games')
    .from('players')
    .select('*')
    .eq('player', data.user?.id ?? '')
    .single();

  expect(profile).toBeTruthy();
  expect(player).toBeTruthy();
});
