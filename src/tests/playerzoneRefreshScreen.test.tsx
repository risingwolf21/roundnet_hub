import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const { mutateAsync, confirm, refetch } = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  confirm: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/contexts/DialogsProvider', () => ({ useDialogs: () => ({ confirm }) }));
vi.mock('@/features/auth/GrantsContext', () => ({ useGrants: () => ({ user: { id: 'admin' } }) }));
vi.mock('@/components/ui/appbar', () => ({ AppBar: ({ title }: { title?: string }) => <header>{title}</header> }));
vi.mock('@/tanstack/player_data', () => ({
  usePlayerzoneStats: () => ({
    data: { linked: 25, withoutIndex: 3 },
    isLoading: false,
    isError: false,
    isSuccess: true,
    refetch,
  }),
  useRefreshPlayerzoneBatch: () => ({ mutateAsync, isPending: false }),
}));

import PlayerzoneRefreshScreen from '@/features/admin/PlayerzoneRefreshScreen';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PlayerzoneRefreshScreen', () => {
  test('runs every batch until `next` is null and sums up the result', async () => {
    confirm.mockResolvedValue(true);
    mutateAsync
      .mockResolvedValueOnce({
        total: 25, processed: 20, updated: 19, unrated: 1,
        failed: [{ rg_id: 'ANN1', name: 'Anna Becker', reason: 'not_found' }], next: 20,
      })
      .mockResolvedValueOnce({ total: 25, processed: 25, updated: 5, unrated: 0, failed: [], next: null });

    render(<PlayerzoneRefreshScreen />);
    await userEvent.click(screen.getByRole('button', { name: /admin.playerzone.start/ }));

    await waitFor(() => expect(screen.getByText('admin.playerzone.resultDone')).toBeInTheDocument());
    expect(mutateAsync.mock.calls).toEqual([[0], [20]]);
    expect(screen.getByText('24')).toBeInTheDocument(); // updated
    expect(screen.getByText('Anna Becker')).toBeInTheDocument();
    expect(screen.getByText(/admin\.playerzone\.reasons\.not_found/)).toBeInTheDocument();
    expect(refetch).toHaveBeenCalled();
  });

  test('does nothing when the confirmation is cancelled', async () => {
    confirm.mockResolvedValue(false);

    render(<PlayerzoneRefreshScreen />);
    await userEvent.click(screen.getByRole('button', { name: /admin.playerzone.start/ }));

    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
