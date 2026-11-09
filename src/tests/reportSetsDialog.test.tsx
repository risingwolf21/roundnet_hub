import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const { mutation } = vi.hoisted(() => ({
  mutation: { mutate: vi.fn(), matchId: null as string | null },
}));

vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/tanstack/games', () => ({
  useUpsertSetsToMatch: (matchId: string) => {
    mutation.matchId = matchId;
    return { mutate: mutation.mutate, isPending: false };
  },
}));

import { ReportSetsDialog } from '@/features/games/dialogs/ReportSetsDialog';

const existingSet = {
  id: 'set-1',
  created_at: '2026-10-01T10:00:00+00:00',
  set_number: 1,
  match: 'match-1',
  team_a_score: 21,
  team_b_score: 18,
  type: 'normal',
  set_awarded: null,
} as MatchSet;

const payload = { matchId: 'match-1', team_a_name: 'Team A', team_b_name: 'Team B', sets: [existingSet] };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ReportSetsDialog', () => {
  test('closes with the saved sets returned by the mutation', async () => {
    const savedSets = [{ ...existingSet, id: 'db-set-1' }];
    mutation.mutate.mockImplementation((_vars, opts: { onSuccess: (result: unknown) => void }) =>
      opts.onSuccess(savedSets)
    );
    const onClose = vi.fn();

    render(<ReportSetsDialog payload={payload} open onClose={onClose} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Speichern' }));

    expect(mutation.matchId).toBe('match-1');
    expect(mutation.mutate).toHaveBeenCalledWith(
      { sets: [expect.objectContaining({ id: 'set-1', team_a_score: 21, team_b_score: 18 })] },
      expect.any(Object)
    );
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledWith(savedSets);
  });

  test('does not close when saving fails', async () => {
    mutation.mutate.mockImplementation((_vars, opts: { onError: (error: Error) => void }) =>
      opts.onError(new Error('nope'))
    );
    const onClose = vi.fn();

    render(<ReportSetsDialog payload={payload} open onClose={onClose} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Speichern' }));

    expect(onClose).not.toHaveBeenCalled();
  });
});
