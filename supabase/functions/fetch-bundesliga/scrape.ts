// Walks the playerzone pages of one tournament and turns them into the rows the
// bundesliga_* tables hold. Page fetching is passed in, so this runs without a database.
import {
  type EncounterTeam,
  type LeagueNav,
  parseLeagueNav,
  parseMdGroup,
  parseMdGroupIds,
  parseRoster,
  parseScheduleNav,
  parseStandings,
  parseTeams,
  rosterHtmlFromResponse,
} from './parse.ts';

export const PZ = 'https://playerzone.roundnetgermany.de';

/** Loads one playerzone path ("/tournaments/…") and returns its body; throws on HTTP errors. */
export type GetPage = (path: string) => Promise<string>;

/** A GetPage on the live playerzone that pauses after every request (a league is ~40 requests). */
export const livePlayerzone = (pauseMs: number): GetPage => async (path) => {
  const res = await fetch(`${PZ}${path}`, { headers: { Accept: 'text/html,application/json' } });
  const body = await res.text();
  await new Promise((resolve) => setTimeout(resolve, pauseMs));
  if (!res.ok) throw new Error(`Playerzone ${path}: ${res.status} ${res.statusText}`);
  return body;
};

export interface LeagueRef {
  teams_page_id: string;
  schedule_slug: string | null;
}

/** The p_data of bundesliga_replace_league. */
export interface LeagueRows {
  teams: { team_id: string; team_version_id: string; name: string; logo_url: string | null; rgx_total: number | null }[];
  players?: {
    team_id: string;
    player_id: string;
    name: string;
    gender: string;
    rg_index: number | null;
    avatar_url: string | null;
    pro: boolean;
  }[];
  matchdays: { matchday_id: string; number: number }[];
  groups: { group_id: string; matchday_id: string; name: string | null; play_date: string | null; city: string | null }[];
  encounters: {
    game_id: string;
    group_id: string;
    team1_id: string;
    team2_id: string;
    boards1: number | null;
    boards2: number | null;
    sets1: number | null;
    sets2: number | null;
    winner: 1 | 2 | null;
  }[];
  standings: {
    team_id: string;
    position: number;
    wins: number;
    draws: number;
    losses: number;
    sets_for: number;
    sets_against: number;
    points_for: number;
    points_against: number;
  }[];
}

/** The tournament's name and leagues, from its teams and schedule dropdowns. */
export async function findLeagues(get: GetPage, slug: string): Promise<{ name: string | null; leagues: LeagueNav[] }> {
  const overview = await get(`/tournaments/${slug}`);
  const teamsPageId = overview.match(new RegExp(`/tournaments/${slug}/teams/(\\d+)`))?.[1];
  if (!teamsPageId) throw new Error('Auf der Turnierseite ist keine Teams-Seite verlinkt.');
  const scheduleSlug = overview.match(new RegExp(`/tournaments/${slug}/schedule/([a-z0-9-]+)`))?.[1] ?? null;

  const teamsHtml = await get(`/tournaments/${slug}/teams/${teamsPageId}`);
  const scheduleHtml = scheduleSlug ? await get(`/tournaments/${slug}/schedule/${scheduleSlug}`) : '';
  const found = parseLeagueNav(overview + teamsHtml + scheduleHtml, slug);
  const name = overview.match(/<meta property="og:title"\s+content="\s*([^"]+?)\s*"/)?.[1]?.split(' | ')[0] ?? null;
  // A tournament with one league has no dropdown: use the pages linked from the overview.
  return { name, leagues: found.length ? found : [{ name: 'Liga', teamsPageId, scheduleSlug }] };
}

/** Everything of one league: teams, (rosters,) all match days with every group, and the table. */
export async function scrapeLeague(get: GetPage, slug: string, league: LeagueRef, withRosters: boolean): Promise<LeagueRows> {
  const base = `/tournaments/${slug}`;
  const teams = new Map<string, LeagueRows['teams'][number]>();
  for (const t of parseTeams(await get(`${base}/teams/${league.teams_page_id}`))) {
    teams.set(t.teamId, { team_id: t.teamId, team_version_id: t.teamVersionId, name: t.name, logo_url: t.logoUrl, rgx_total: t.rgxTotal });
  }
  // Teams that only appear in the schedule or the table (e.g. withdrawn) still need a row.
  const seen = (t: EncounterTeam) => {
    if (!teams.has(t.teamId)) {
      teams.set(t.teamId, { team_id: t.teamId, team_version_id: t.teamVersionId, name: t.name, logo_url: t.logoUrl, rgx_total: null });
    }
  };

  const rows: LeagueRows = { teams: [], matchdays: [], groups: [], encounters: [], standings: [] };
  if (league.schedule_slug) {
    const schedule = `${base}/schedule/${league.schedule_slug}`;
    const nav = parseScheduleNav(await get(schedule));
    for (const md of nav.matchDays) {
      rows.matchdays.push({ matchday_id: md.id, number: md.number });
      const mdPath = `${schedule}?type=games${nav.groupId ? `&group_id=${nav.groupId}` : ''}&md=${md.id}`;
      const page = await get(mdPath);
      for (const groupId of parseMdGroupIds(page)) {
        // Each page renders one group; the others need their own request.
        const group = parseMdGroup(page, groupId) ?? parseMdGroup(await get(`${mdPath}&md_group=${groupId}`), groupId);
        if (!group) continue;
        rows.groups.push({ group_id: group.id, matchday_id: md.id, name: group.name, play_date: group.date, city: group.city });
        for (const e of group.encounters) {
          seen(e.team1);
          seen(e.team2);
          rows.encounters.push({
            game_id: e.gameId,
            group_id: group.id,
            team1_id: e.team1.teamId,
            team2_id: e.team2.teamId,
            boards1: e.boards?.[0] ?? null,
            boards2: e.boards?.[1] ?? null,
            sets1: e.sets?.[0] ?? null,
            sets2: e.sets?.[1] ?? null,
            winner: e.winner,
          });
        }
      }
    }
    for (const s of parseStandings(await get(`${schedule}?type=ranking`))) {
      seen(s.team);
      rows.standings.push({
        team_id: s.team.teamId,
        position: s.position,
        wins: s.wins,
        draws: s.draws,
        losses: s.losses,
        sets_for: s.setsFor,
        sets_against: s.setsAgainst,
        points_for: s.pointsFor,
        points_against: s.pointsAgainst,
      });
    }
  }

  rows.teams = [...teams.values()];
  if (withRosters) {
    rows.players = [];
    for (const team of rows.teams) {
      const roster = parseRoster(rosterHtmlFromResponse(await get(`/tournament/get-team-info?id=${encodeURIComponent(team.team_version_id)}`)));
      for (const p of roster) {
        rows.players.push({
          team_id: team.team_id,
          player_id: p.id,
          name: p.name,
          gender: p.gender,
          rg_index: p.rgIndex,
          avatar_url: p.avatarUrl,
          pro: p.pro,
        });
      }
    }
  }
  return rows;
}
