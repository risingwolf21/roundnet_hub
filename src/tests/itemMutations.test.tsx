import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const { testQueryClient, repo } = vi.hoisted(() => ({
  testQueryClient: { current: null as unknown as QueryClient },
  repo: { giveItemToUser: vi.fn() },
}));

vi.mock('@/lib/queryClient', () => ({
  get queryClient() {
    return testQueryClient.current;
  },
}));
vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/repository/KeysRepository', () => ({ KeysRepository: repo }));
vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));

import { itemKeys, useHandoverKeyMutation } from '@/tanstack/items';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={testQueryClient.current}>{children}</QueryClientProvider>
);

const anna = { id: 'anna', name: 'Anna' } as User;
const ben = { id: 'ben', name: 'Ben' } as User;
const key = (id: number, name: string, holder: User | null) =>
  ({ id, id_uuid: `uuid-${id}`, name, current_holder: holder?.id ?? null, full_current_holder: holder }) as unknown as FullItemHolder;

describe('useHandoverKeyMutation', () => {
  beforeEach(() => {
    testQueryClient.current = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    repo.giveItemToUser.mockReset();
  });

  test('optimistically moves only the handed-over key, other keys of the same holder stay', async () => {
    let finish!: () => void;
    repo.giveItemToUser.mockReturnValue(new Promise<null>((resolve) => (finish = () => resolve(null))));
    const cellar = key(1, 'Keller', anna);
    const gym = key(2, 'Gym', anna);
    const hall = key(3, 'Halle', ben);
    testQueryClient.current.setQueryData(itemKeys.list(), [cellar, gym, hall]);

    const { result } = renderHook(() => useHandoverKeyMutation(), { wrapper });
    act(() => result.current.mutate({ keyHolder: cellar, user: ben }));

    await vi.waitFor(() => expect(repo.giveItemToUser).toHaveBeenCalled());
    const list = testQueryClient.current.getQueryData<FullItemHolder[]>(itemKeys.list())!;
    expect(list.map((x) => [x.id, x.name, x.full_current_holder?.id])).toEqual([
      [1, 'Keller', 'ben'],
      [2, 'Gym', 'anna'],
      [3, 'Halle', 'ben'],
    ]);

    await act(async () => finish());
  });
});
