import { beforeEach, describe, expect, test, vi } from 'vitest';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: { rpc } }));

import { KeysRepository } from '@/repository/KeysRepository';

describe('KeysRepository.updateItem', () => {
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockReturnValue({ throwOnError: () => Promise.resolve({ data: null }) });
  });

  const groupArgs = () => {
    const { p_group, p_set_group } = rpc.mock.calls[0][1];
    return { p_group, p_set_group };
  };

  test('leaves the group alone when it is not part of the update', async () => {
    await KeysRepository.updateItem({ id: 1, name: 'Keller' });
    expect(groupArgs()).toEqual({ p_group: undefined, p_set_group: false });
  });

  test('null makes the key visible to everyone', async () => {
    await KeysRepository.updateItem({ id: 1, group: null });
    expect(groupArgs()).toEqual({ p_group: undefined, p_set_group: true });
  });

  test('a group id restricts the key to that group', async () => {
    await KeysRepository.updateItem({ id: 1, group: 'g-42' });
    expect(groupArgs()).toEqual({ p_group: 'g-42', p_set_group: true });
  });
});
