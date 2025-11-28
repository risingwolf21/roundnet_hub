import { supabase } from '@/lib/supabase';
import { expect, test } from 'vitest';
import { SETUP } from './setupTests';

test('sign up creates a profile row via trigger', async () => {
  const { data: group } = await supabase.from('event_group').select('*').eq('id', SETUP.group_a.id).single();
  expect(group).toBeNull();
});
