import { describe, expect, test } from 'vitest';
import type { LeagueView } from '@/features/bundesliga/repository';
import { plannerMatchDays, teamOverview } from '@/features/bundesliga/teamView';

const team = (id: string, name: string) => ({ pz_team_id: id, pz_team_version_id: `v${id}`, name, logo_url: null, rgx_total: null });

// KA-Boom (1) played match day 1 (won 5:0 away, lost 2:3 at home), match day 2 is still open.
const view: LeagueView = {
  teams: [team('1', 'KA-Boom'), team('2', 'Heidelberg'), team('3', 'MRC I'), team('4', 'Bonn')],
  standings: [
    { pz_team_id: '3', position: 1, wins: 2, draws: 0, losses: 0, sets_for: 20, sets_against: 6, points_for: 0, points_against: 0 },
    { pz_team_id: '1', position: 2, wins: 1, draws: 0, losses: 1, sets_for: 15, sets_against: 9, points_for: 0, points_against: 0 },
  ],
  matchdays: [
    { pz_matchday_id: '111', number: 2 },
    { pz_matchday_id: '110', number: 1 },
  ],
  groups: [
    { pz_group_id: 'g2', pz_matchday_id: '111', name: 'Gruppe E', play_date: '2026-12-05', city: 'Bonn' },
    { pz_group_id: 'g1', pz_matchday_id: '110', name: 'Gruppe A', play_date: '2026-10-17', city: 'Karlsruhe' },
    { pz_group_id: 'g3', pz_matchday_id: '110', name: 'Gruppe B', play_date: '2026-10-18', city: 'Essen' },
  ],
  encounters: [
    { pz_game_id: 'e1', pz_group_id: 'g1', team1_id: '2', team2_id: '1', boards1: 0, boards2: 5, sets1: 0, sets2: 10, winner: 2 },
    { pz_game_id: 'e2', pz_group_id: 'g1', team1_id: '1', team2_id: '3', boards1: 2, boards2: 3, sets1: 5, sets2: 7, winner: 2 },
    { pz_game_id: 'e3', pz_group_id: 'g3', team1_id: '4', team2_id: '2', boards1: 3, boards2: 2, sets1: 7, sets2: 5, winner: 1 },
    { pz_game_id: 'e4', pz_group_id: 'g2', team1_id: '1', team2_id: '4', boards1: null, boards2: null, sets1: null, sets2: null, winner: null },
  ],
  // Two of e1's games; KA-Boom is side 2 there. Player 221 plays Mixed 1 for KA-Boom.
  games: [
    { pz_game_id: 'x2', pz_encounter_id: 'e1', sort: 2, discipline: 'Mixed 1', pair1_name: 'Huber/Graf', pair2_name: 'Senger/Wolf',
      pair1_players: ['5', '6'], pair2_players: ['221', '7'], sets: [[13, 17], [15, 17]], winner: 2 },
    { pz_game_id: 'x1', pz_encounter_id: 'e1', sort: 1, discipline: 'Open 1', pair1_name: 'Huber/Maier', pair2_name: 'Lang/Kurz',
      pair1_players: ['5', '8'], pair2_players: ['9', '10'], sets: [[17, 12], [12, 17], [10, 15]], winner: 2 },
  ],
};

describe('teamOverview', () => {
  test('gives each encounter its games from the team’s side and marks the player’s games', () => {
    const [e1] = teamOverview(view, '1', '221')!.matchdays[0].encounters;
    expect(e1.games.map((g) => [g.discipline, g.ours, g.theirs, g.sets, g.result, g.mine])).toEqual([
      ['Open 1', 'Lang/Kurz', 'Huber/Maier', [[12, 17], [17, 12], [15, 10]], 'win', false],
      ['Mixed 1', 'Senger/Wolf', 'Huber/Graf', [[17, 13], [17, 15]], 'win', true],
    ]);
    // Without a player nothing is "mine"; open encounters have no games.
    expect(teamOverview(view, '1')!.matchdays[0].encounters[0].games.some((g) => g.mine)).toBe(false);
    expect(teamOverview(view, '1')!.matchdays[1].encounters[0].games).toEqual([]);
  });

  test('lists only the team’s encounters, from its own side, ordered by match day', () => {
    const o = teamOverview(view, '1')!;
    expect(o.team.name).toBe('KA-Boom');
    expect(o.standing?.position).toBe(2);
    expect(o.tableSize).toBe(2);
    expect(o.matchdays.map((m) => [m.number, m.group.name])).toEqual([[1, 'Gruppe A'], [2, 'Gruppe E']]);

    const [md1, md2] = o.matchdays;
    expect(md1.encounters.map((e) => [e.opponent.name, e.boards, e.sets, e.result])).toEqual([
      ['Heidelberg', [5, 0], [10, 0], 'win'], // away: the score is flipped to our side
      ['MRC I', [2, 3], [5, 7], 'loss'],
    ]);
    expect(md1.played).toBe(true);
    expect(md2.encounters.map((e) => [e.opponent.name, e.boards, e.result])).toEqual([['Bonn', null, 'open']]);
    expect(o.next?.number).toBe(2);
  });

  test('a played encounter without a winner and equal boards is a draw', () => {
    const drawn: LeagueView = {
      ...view,
      encounters: [{ pz_game_id: 'd', pz_group_id: 'g1', team1_id: '1', team2_id: '2', boards1: 2, boards2: 2, sets1: 5, sets2: 5, winner: null }],
    };
    expect(teamOverview(drawn, '1')!.matchdays[0].encounters[0].result).toBe('draw');
  });

  test('an unknown team gives null; a team without encounters has no match days', () => {
    expect(teamOverview(view, '99')).toBeNull();
    const lonely = teamOverview({ ...view, teams: [...view.teams, team('5', 'Neu')] }, '5')!;
    expect([lonely.matchdays, lonely.next, lonely.standing]).toEqual([[], null, null]);
  });
});

describe('plannerMatchDays', () => {
  test('uses the first match day that is not fully played, with each group’s teams', () => {
    expect(plannerMatchDays(view)).toEqual([
      {
        id: 'g2',
        md: '2',
        name: 'Gruppe E',
        date: '2026-12-05',
        city: 'Bonn',
        teams: [
          { teamId: '1', teamVersionId: 'v1', name: 'KA-Boom' },
          { teamId: '4', teamVersionId: 'v4', name: 'Bonn' },
        ],
      },
    ]);
  });

  test('falls back to the last match day when everything is played, and to nothing without match days', () => {
    const allPlayed = { ...view, encounters: view.encounters.filter((e) => e.winner !== null) };
    expect(plannerMatchDays(allPlayed).map((g) => g.md)).toEqual(['2']);
    expect(plannerMatchDays({ ...view, matchdays: [] })).toEqual([]);
  });
});
