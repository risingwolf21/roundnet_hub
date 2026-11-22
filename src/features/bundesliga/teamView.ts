// Pure helpers that turn a league's rows into what the Bundesliga screens show.
import type { BundesligaGroup, BundesligaStanding, BundesligaTeam, LeagueView } from './repository';

export type EncounterResult = 'win' | 'loss' | 'draw' | 'open';

export interface TeamEncounter {
  gameId: string;
  opponent: BundesligaTeam;
  /** Boards and sets from our side; null while not played. */
  boards: [number, number] | null;
  sets: [number, number] | null;
  result: EncounterResult;
}

export interface TeamMatchday {
  id: string;
  number: number;
  group: BundesligaGroup;
  encounters: TeamEncounter[];
  /** Every encounter of this match day has a result. */
  played: boolean;
}

export interface TeamOverview {
  team: BundesligaTeam;
  standing: BundesligaStanding | null;
  /** Number of teams in the table. */
  tableSize: number;
  matchdays: TeamMatchday[];
  /** The first match day not fully played yet. */
  next: TeamMatchday | null;
}

const unknownTeam = (id: string): BundesligaTeam => ({
  pz_team_id: id,
  pz_team_version_id: '',
  name: id,
  logo_url: null,
  rgx_total: null,
});

/** One team's season: its encounters per match day (from its side), its table row and the next match day. */
export function teamOverview(view: LeagueView, teamId: string): TeamOverview | null {
  const team = view.teams.find((t) => t.pz_team_id === teamId);
  if (!team) return null;
  const teamById = new Map(view.teams.map((t) => [t.pz_team_id, t]));
  const numberOf = new Map(view.matchdays.map((m) => [m.pz_matchday_id, m.number]));

  const matchdays: TeamMatchday[] = [];
  for (const group of view.groups) {
    const encounters: TeamEncounter[] = view.encounters
      .filter((e) => e.pz_group_id === group.pz_group_id && (e.team1_id === teamId || e.team2_id === teamId))
      .map((e) => {
        const home = e.team1_id === teamId;
        const opponentId = home ? e.team2_id : e.team1_id;
        const flip = <T>(a: T, b: T): [T, T] => (home ? [a, b] : [b, a]);
        const boards = e.boards1 === null || e.boards2 === null ? null : flip(e.boards1, e.boards2);
        const sets = e.sets1 === null || e.sets2 === null ? null : flip(e.sets1, e.sets2);
        const result: EncounterResult =
          e.winner === null
            ? boards && boards[0] === boards[1] && boards[0] > 0
              ? 'draw'
              : 'open'
            : (e.winner === 1) === home
              ? 'win'
              : 'loss';
        return { gameId: e.pz_game_id, opponent: teamById.get(opponentId) ?? unknownTeam(opponentId), boards, sets, result };
      });
    if (encounters.length === 0) continue;
    matchdays.push({
      id: group.pz_matchday_id,
      number: numberOf.get(group.pz_matchday_id) ?? 0,
      group,
      encounters,
      played: encounters.every((e) => e.result !== 'open'),
    });
  }
  matchdays.sort((a, b) => a.number - b.number || (a.group.play_date ?? '').localeCompare(b.group.play_date ?? ''));

  return {
    team,
    standing: view.standings.find((s) => s.pz_team_id === teamId) ?? null,
    tableSize: view.standings.length,
    matchdays,
    next: matchdays.find((m) => !m.played) ?? null,
  };
}

/** A match-day group as the planner uses it: who plays whom on that day. */
export interface PlannerMatchDay {
  id: string;
  md: string | null;
  name: string;
  date: string | null;
  city: string | null;
  teams: { teamId: string; teamVersionId: string; name: string }[];
}

/** The groups of the next match day not fully played yet (else the last one), for the planner. */
export function plannerMatchDays(view: LeagueView): PlannerMatchDay[] {
  const teamById = new Map(view.teams.map((t) => [t.pz_team_id, t]));
  const byMatchday = [...view.matchdays].sort((a, b) => a.number - b.number);
  const groupsOf = (mdId: string) => view.groups.filter((g) => g.pz_matchday_id === mdId);
  const encountersOf = (groupId: string) => view.encounters.filter((e) => e.pz_group_id === groupId);
  const open = byMatchday.find((md) => groupsOf(md.pz_matchday_id).some((g) => encountersOf(g.pz_group_id).some((e) => e.winner === null)));
  const md = open ?? byMatchday[byMatchday.length - 1];
  if (!md) return [];

  return groupsOf(md.pz_matchday_id).map((g) => {
    const ids = [...new Set(encountersOf(g.pz_group_id).flatMap((e) => [e.team1_id, e.team2_id]))];
    return {
      id: g.pz_group_id,
      md: String(md.number),
      name: g.name ?? '',
      date: g.play_date,
      city: g.city,
      teams: ids.map((id) => {
        const t = teamById.get(id);
        return { teamId: id, teamVersionId: t?.pz_team_version_id ?? '', name: t?.name ?? id };
      }),
    };
  });
}
