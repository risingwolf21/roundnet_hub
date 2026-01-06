import { uuid } from '@supabase/supabase-js/dist/main/lib/helpers';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

export const GROUP_A_ID = uuid();
export const PUBLIC_MAIN_GROUP_ID = uuid();

export const SETUP = {
  main_group: {
    id: PUBLIC_MAIN_GROUP_ID,
    name: 'Public Main Group',
  },
  group_a: {
    id: GROUP_A_ID,
    name: 'Test Group',
  },
};

// runs a clean after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});
