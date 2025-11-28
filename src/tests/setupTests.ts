import { supabase } from '@/lib/supabase';
import { uuid } from '@supabase/supabase-js/dist/main/lib/helpers';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';

export const GROUP_ID = uuid();

export const SETUP = {
  group_a: {
    id: GROUP_ID,
    name: 'Test Group',
  },
};

beforeAll(() => {
  supabase.from('event_group').insert({ id: SETUP.group_a.id, name: SETUP.group_a.name });
});

// runs a clean after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});

afterAll(async () => {
  await supabase.from('event_group').delete().eq('id', SETUP.group_a.id);
});
