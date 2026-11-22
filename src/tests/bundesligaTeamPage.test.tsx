import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { LeagueView } from '@/features/bundesliga/repository';

const { state } = vi.hoisted(() => ({
  state: {
    rgId: 'KAR7' as string | null,
    teamsOfPlayer: [] as { league_id: number; pz_team_id: string }[],
    leagues: [] as unknown[],
  },
}));

vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, o?: Record<string, unknown>) => (o ? `${key} ${JSON.stringify(o)}` : key),
    i18n: { resolvedLanguage: 'de' },
  }),
}));
vi.mock('react-router', () => ({ useNavigate: () => vi.fn() }));
vi.mock('@/components/ui/appbar', () => ({ AppBar: ({ title }: { title?: string }) => <header>{title}</header> }));
vi.mock('@/features/auth/GrantsContext', () => ({ useGrants: () => ({ user: { id: 'u1' } }) }));
vi.mock('@/tanstack/user', () => ({ useProfile: () => ({ data: { player: { rg_id: state.rgId } } }) }));

const team = (id: string, name: string) => ({ pz_team_id: id, pz_team_version_id: `v${id}`, name, logo_url: null, rgx_total: 11640 });
const view: LeagueView = {
  teams: [team('1', 'KA-Boom'), team('2', 'Heidelberg'), team('3', 'MRC I')],
  standings: [
    { pz_team_id: '1', position: 1, wins: 6, draws: 0, losses: 0, sets_for: 47, sets_against: 23, points_for: 1056, points_against: 876 },
    { pz_team_id: '2', position: 2, wins: 3, draws: 0, losses: 3, sets_for: 30, sets_against: 30, points_for: 0, points_against: 0 },
  ],
  matchdays: [
    { pz_matchday_id: '110', number: 1 },
    { pz_matchday_id: '112', number: 3 },
  ],
  groups: [
    { pz_group_id: 'g1', pz_matchday_id: '110', name: 'Gruppe B', play_date: '2026-10-18', city: 'Karlsruhe' },
    { pz_group_id: 'g3', pz_matchday_id: '112', name: 'Gruppe J', play_date: '2026-12-05', city: 'München' },
  ],
  encounters: [
    { pz_game_id: 'e1', pz_group_id: 'g1', team1_id: '2', team2_id: '1', boards1: 0, boards2: 5, sets1: 0, sets2: 10, winner: 2 },
    { pz_game_id: 'e3', pz_group_id: 'g3', team1_id: '3', team2_id: '1', boards1: null, boards2: null, sets1: null, sets2: null, winner: null },
  ],
};

vi.mock('@/features/bundesliga/useBundesliga', () => ({
  useBundesligaSeason: () => ({ data: { id: 1, tournament_slug: 's', name: 'DRL', leagues: state.leagues }, isLoading: false, isError: false }),
  useTeamsOfPlayer: () => ({ data: state.teamsOfPlayer, isLoading: false, isError: false }),
  useLeagueView: (id: number | null) => ({ data: id ? view : undefined, isLoading: false, isError: false }),
}));

import BundesligaTeamPage from '@/features/bundesliga/BundesligaTeamPage';

const league = { id: 1, name: '1. Bundesliga', sort: 1, teams_page_id: '2613', refreshed_at: '2026-11-22T02:00:00Z', refresh_error: null };

beforeEach(() => {
  localStorage.clear();
  state.rgId = 'KAR7';
  state.teamsOfPlayer = [{ league_id: 1, pz_team_id: '1' }];
  state.leagues = [league];
});

describe('BundesligaTeamPage', () => {
  test('shows my team with its rank, results, the next match day and the table', () => {
    render(<BundesligaTeamPage />);

    expect(screen.getByRole('heading', { name: 'KA-Boom' })).toBeInTheDocument();
    expect(screen.getByText('bundesliga.team.myTeam')).toBeInTheDocument();
    expect(screen.getByText(/bundesliga\.team\.rank .*"position":1,"count":2/)).toBeInTheDocument();
    // Match day 1, away at Heidelberg: shown from our side as a 5:0 win.
    expect(screen.getByText('5:0')).toBeInTheDocument();
    expect(screen.getByText('bundesliga.team.result.win')).toBeInTheDocument();
    // Match day 3 is open and is the next one.
    expect(screen.getByText(/bundesliga\.team\.next .*"number":3/)).toBeInTheDocument();
    expect(screen.getByText('bundesliga.team.result.open')).toBeInTheDocument();
    // Table with our row and its set difference.
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('+24')).toBeInTheDocument();
  });

  test('a player in no roster gets an explanation and the team picker', () => {
    state.teamsOfPlayer = [];
    render(<BundesligaTeamPage />);

    expect(screen.getByText('bundesliga.team.notFoundTitle')).toBeInTheDocument();
    expect(screen.getByText(/bundesliga\.team\.notFoundWithId .*KAR7/)).toBeInTheDocument();
    expect(screen.getByText('bundesliga.team.pickTitle')).toBeInTheDocument();
  });

  test('before any league is loaded it says so', () => {
    state.leagues = [];
    render(<BundesligaTeamPage />);
    expect(screen.getByText('bundesliga.team.noDataTitle')).toBeInTheDocument();
  });
});
