import i18n from 'i18next';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import GameList from '@/features/games/GameList';

// Matches are grouped by day. The day used to be a formatted string ('dd MMMM yyyy') that was parsed back with
// new Date(...): with German month names ("März", "Mai", "Oktober", "Dezember") that is an Invalid Date and the page crashed.
vi.mock('react-router', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@/contexts/DialogsProvider', () => ({ useDialogs: () => ({ open: vi.fn() }) }));
vi.mock('@/features/auth/GrantsContext', () => ({ useGrants: () => ({ user: { id: 'user-1' }, loading: false, hasPerm: () => true, hasFeat: () => true }) }));
vi.mock('@/features/games/ReportScore', () => ({ default: () => null }));
vi.mock('@/components/PullToRefresh', () => ({ PullToRefresh: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/ui/appbar', () => ({ AppBar: ({ title }: { title?: string }) => <h1>{title}</h1> }));
vi.mock('@/tanstack/games', () => ({
  useMatches: () => ({
    data: [{ match_id: 'm1', created_at: '2026-03-05T10:00:00', team_a_name: 'Team A', team_b_name: 'Team B', set_scores: '21:15', rated: true, is_public: true }],
    error: null,
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-03-10T12:00:00'));
});
afterEach(async () => {
  vi.useRealTimers();
  await i18n.changeLanguage('de');
});

describe('GameList day headings', () => {
  test('are shown in German for a day in March', async () => {
    render(<GameList />);
    expect(await screen.findByText('vor 5 Tagen')).toBeInTheDocument();
    expect(screen.getByText('Team A')).toBeInTheDocument();
  });

  test('follow the app language, not the browser language', async () => {
    await i18n.changeLanguage('en');
    render(<GameList />);
    expect(await screen.findByText('5 days ago')).toBeInTheDocument();
  });
});
