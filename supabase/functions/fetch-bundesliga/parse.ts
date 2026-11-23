// Pure parsers for the playerzone HTML — no IO, no Deno globals, so they can be unit-tested.
import { load } from 'cheerio';

export interface ScrapedTeam {
  teamId: string;
  teamVersionId: string;
  name: string;
  logoUrl: string | null;
  rgxTotal: number | null;
  firstNames: string[];
}

/** A league as the tournament's dropdowns list it: its teams page id and its schedule slug. */
export interface LeagueNav {
  name: string; // e.g. "1. Bundesliga"
  teamsPageId: string; // /tournaments/<slug>/teams/<id>
  scheduleSlug: string | null; // /tournaments/<slug>/schedule/<scheduleSlug>
}

export interface ScheduleNav {
  groupId: string | null; // the schedule's `group_id` query parameter
  matchDays: { id: string; number: number }[];
}

export interface EncounterTeam {
  teamId: string;
  teamVersionId: string;
  name: string;
  logoUrl: string | null;
}

export interface ScrapedEncounter {
  gameId: string;
  team1: EncounterTeam;
  team2: EncounterTeam;
  /** Boards won (the "summary" score, e.g. 4:1); null while not played. */
  boards: [number, number] | null;
  /** Sets won over all boards (e.g. 8:3); null while not played. */
  sets: [number, number] | null;
  winner: 1 | 2 | null;
}

export interface ScrapedMdGroup {
  id: string; // md_group id
  name: string | null; // e.g. "Gruppe A"
  date: string | null; // ISO yyyy-mm-dd
  city: string | null;
  encounters: ScrapedEncounter[];
}

export interface ScrapedStanding {
  position: number;
  team: EncounterTeam;
  wins: number;
  draws: number;
  losses: number;
  setsFor: number;
  setsAgainst: number;
  pointsFor: number;
  pointsAgainst: number;
}

export type Gender = 'male' | 'female' | 'unknown';

export interface ScrapedPlayer {
  id: string; // numeric playerzone player id
  slug: string;
  name: string;
  gender: Gender;
  rgIndex: number | null;
  avatarUrl: string | null;
  pro: boolean;
}

export const num = (s: string | undefined | null): number | null => {
  if (!s) return null;
  const cleaned = String(s).replace(/[^0-9.]/g, '');
  // No digits at all (e.g. a "Pro" badge, "-", "N/A") → unknown, not 0.
  // (Number('') is 0, which would otherwise masquerade as a real score.)
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

/** Teams of one league from the teams page. */
export function parseTeams(html: string): ScrapedTeam[] {
  const $ = load(html);
  const teams: ScrapedTeam[] = [];
  $('.tournament-team-card').each((_i, el) => {
    const card = $(el);
    const onclick = card.attr('onclick') ?? '';
    const m = onclick.match(/load_team_info\(\s*(\d+)\s*,\s*(\d+)/);
    if (!m) return;
    const name = card.find('.team-card-name').first().text().trim();
    const logoUrl = card.find('.team-card-logos.logos-club img').first().attr('src') ?? null;
    const firstNames: string[] = [];
    card.find('.team-card-players span').each((_j, s) => {
      const t = $(s).text().trim();
      if (t) firstNames.push(t);
    });
    teams.push({
      teamId: m[1],
      teamVersionId: m[2],
      name,
      logoUrl,
      rgxTotal: num(card.attr('data-rgx')),
      firstNames,
    });
  });
  return teams;
}

export const genderFrom = (historyArg: string | undefined, avatar: string | null): Gender => {
  if (historyArg === '1') return 'male';
  if (historyArg === '2') return 'female';
  if (avatar?.includes('profile_m')) return 'male';
  if (avatar?.includes('profile_f')) return 'female';
  return 'unknown';
};

/** Roster from the get-team-info AJAX response's HTML fragment. */
export function parseRoster(rosterHtml: string): ScrapedPlayer[] {
  const $ = load(rosterHtml);
  const players: ScrapedPlayer[] = [];
  $('.player-team-card').each((_i, el) => {
    const card = $(el);
    const href = card.find('a[href^="/players/"]').first().attr('href') ?? '';
    const hm = href.match(/\/players\/(\d+)-([^/?"]*)/);
    if (!hm) return;
    const id = hm[1];
    const slug = hm[2] ?? '';
    const name = card.find('.rg-team-popup--name, .player-name').first().text().trim() || slug.replace(/-/g, ' ');
    const avatarUrl = card.find('.player-img img').first().attr('src') ?? null;
    const badge = card.find('rg-score-badge').first();
    const rgIndex = badge.length ? num(badge.attr('score')) : null;
    const pro = badge.length ? badge.attr('pro') !== undefined : false;
    const histMatch = (card.html() ?? '').match(/show_history\(\s*\d+\s*,\s*(\d+)\s*\)/);
    const gender = genderFrom(histMatch?.[1], avatarUrl);
    players.push({ id, slug, name, gender, rgIndex, avatarUrl, pro });
  });
  return players;
}

/** Extracts the HTML fragment out of the get-team-info response (JSON {html} or raw HTML). */
export function rosterHtmlFromResponse(body: string): string {
  try {
    const parsed = JSON.parse(body);
    if (parsed && typeof parsed.html === 'string') return parsed.html;
  } catch {
    // already HTML
  }
  return body;
}

/** "https://playerzone…/tournaments/793-…-2026-2027/overview" (or the bare slug) → "793-…-2026-2027". */
export const tournamentSlug = (link: string): string | null =>
  link.trim().match(/(?:^|\/tournaments\/)(\d+-[a-z0-9-]+?)(?:\/|$|\?|#)/i)?.[1]?.toLowerCase() ?? null;

const TEAM_INFO = /load_team_info\(\s*(\d+)\s*,\s*(\d+)/;

/** "17.10.2026" → "2026-10-17"; anything else → null. */
export const isoDate = (s: string | null | undefined): string | null => {
  const m = (s ?? '').trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

/** "47:23" → [47, 23]. */
const pair = (s: string): [number, number] | null => {
  const m = s.trim().match(/^(\d+)\s*:\s*(\d+)$/);
  return m ? [Number(m[1]), Number(m[2])] : null;
};

/**
 * The league dropdowns of a tournament page: teams pages ("/teams/2613") and schedules
 * ("/schedule/mixed-14358-gruppenphase"), joined by the league's name.
 */
export function parseLeagueNav(html: string, tournamentSlug: string): LeagueNav[] {
  const $ = load(html);
  const base = `/tournaments/${tournamentSlug}/`;
  const teams = new Map<string, string>();
  const schedules = new Map<string, string>();
  $('rg-navigation-dropdown-item').each((_i, el) => {
    const href = $(el).attr('href') ?? '';
    const name = $(el).text().trim();
    if (!name || !href.startsWith(base)) return;
    const rest = href.slice(base.length);
    const t = rest.match(/^teams\/(\d+)$/);
    const sch = rest.match(/^schedule\/([a-z0-9-]+)$/);
    if (t && !teams.has(name)) teams.set(name, t[1]);
    if (sch && !schedules.has(name)) schedules.set(name, sch[1]);
  });
  return [...teams.entries()].map(([name, teamsPageId]) => ({
    name,
    teamsPageId,
    scheduleSlug: schedules.get(name) ?? null,
  }));
}

/** The match-day tabs of a schedule page ("?type=games&group_id=76368&md=110"). */
export function parseScheduleNav(html: string): ScheduleNav {
  const $ = load(html);
  let groupId: string | null = null;
  const seen = new Map<string, number>();
  $('a[href*="type=games"][href*="md="]').each((_i, el) => {
    const href = $(el).attr('href') ?? '';
    if (href.includes('md_group=')) return;
    const md = href.match(/[?&]md=(\d+)/)?.[1];
    if (!md || seen.has(md)) return;
    groupId ??= href.match(/[?&]group_id=(\d+)/)?.[1] ?? null;
    const n = Number($(el).text().trim().match(/^(\d+)/)?.[1] ?? NaN);
    seen.set(md, Number.isFinite(n) ? n : seen.size + 1);
  });
  return { groupId, matchDays: [...seen.entries()].map(([id, number]) => ({ id, number })) };
}

/** Ids of all groups of the shown match day; only one of them is rendered per page. */
export function parseMdGroupIds(html: string): string[] {
  const $ = load(html);
  const ids: string[] = [];
  $('.md-group-container').each((_i, el) => {
    const id = ($(el).attr('class') ?? '').match(/md-group-(\d+)/)?.[1];
    if (id && !ids.includes(id)) ids.push(id);
  });
  return ids;
}

/** One match-day group with its encounters, or null when the page did not render it. */
export function parseMdGroup(html: string, groupId: string): ScrapedMdGroup | null {
  const $ = load(html);
  const group = $(`.md-group-container.md-group-${groupId}`).first();
  if (group.length === 0 || group.find('.md-group-header').length === 0) return null;

  const teamOf = (el: ReturnType<typeof group.find>): EncounterTeam | null => {
    const a = el.find('a.details').first();
    const m = (a.attr('onclick') ?? '').match(TEAM_INFO);
    if (!m) return null;
    return {
      teamId: m[1],
      teamVersionId: m[2],
      name: a.find('.name').first().text().trim(),
      logoUrl: a.find('img').first().attr('src') ?? null,
    };
  };

  const encounters: ScrapedEncounter[] = [];
  group.find('rg-game-card[data-game-id]').each((_i, el) => {
    const card = $(el);
    const sides = card.children('.teams').children('.team');
    if (sides.length !== 2) return;
    const team1 = teamOf(sides.eq(0));
    const team2 = teamOf(sides.eq(1));
    if (!team1 || !team2) return;
    const setScore = (selector: string): [number, number] | null => {
      const scores = card.children('.scores').children(selector).first().find('.score');
      if (scores.length !== 2) return null;
      const a = num(scores.eq(0).text());
      const b = num(scores.eq(1).text());
      return a === null || b === null ? null : [a, b];
    };
    const boards = setScore('.set[set="summary"]');
    const sets = setScore('.set[set=""]');
    const winner = sides.eq(0).hasClass('winner') ? 1 : sides.eq(1).hasClass('winner') ? 2 : null;
    encounters.push({ gameId: card.attr('data-game-id')!, team1, team2, boards, sets, winner });
  });

  return {
    id: groupId,
    name: group.find('.md-group-name').first().text().trim() || null,
    date: isoDate(group.find('.md-group-date').first().text()),
    city: group.find('.md-group-city').first().text().trim().split('\n')[0].trim() || null,
    encounters,
  };
}

export interface ScrapedGame {
  gameId: string;
  /** "Open 1", "Women", "Mixed 2" … */
  discipline: string | null;
  /** Each side's pair: its playerzone team version id (get-team-info gives its players) and "Name/Name". */
  pair1: { id: string; name: string } | null;
  pair2: { id: string; name: string } | null;
  /** Points per set from side 1's view, e.g. [[17, 13], [17, 15]]; empty while not played. */
  sets: [number, number][];
  winner: 1 | 2 | null;
}

/** The single games of one encounter, from the html of `/ajax/get-subgames/<id>`. */
export function parseGames(html: string): ScrapedGame[] {
  const $ = load(html);
  const games: ScrapedGame[] = [];
  $('rg-game-card[variant="subgame"][data-game-id]').each((_i, el) => {
    const card = $(el);
    const sides = card.children('.teams').children('.team');
    const pairOf = (i: number) => {
      const a = sides.eq(i).find('a.details').first();
      const m = (a.attr('onclick') ?? '').match(TEAM_INFO);
      return m ? { id: m[2], name: a.find('.name').first().text().trim() } : null;
    };
    const sets: [number, number][] = [];
    card.children('.scores').children('.set').each((_j, s) => {
      const scores = $(s).find('.score');
      const a = num(scores.eq(0).text());
      const b = num(scores.eq(1).text());
      if (a !== null && b !== null) sets.push([a, b]);
    });
    games.push({
      gameId: card.attr('data-game-id')!,
      discipline: card.children('[slot="tags"]').text().trim() || null,
      pair1: pairOf(0),
      pair2: pairOf(1),
      sets,
      winner: sides.eq(0).hasClass('winner') ? 1 : sides.eq(1).hasClass('winner') ? 2 : null,
    });
  });
  return games;
}

/** The league table of a schedule's `?type=ranking` page. */
export function parseStandings(html: string): ScrapedStanding[] {
  const $ = load(html);
  const rows: ScrapedStanding[] = [];
  $('.phase-table-row').each((_i, el) => {
    const row = $(el);
    const a = row.find('.team-name a').first();
    const m = (a.attr('onclick') ?? '').match(TEAM_INFO);
    const position = num(row.find('.cell-pos').first().text());
    const record = row.find('.cell-record').first().text().trim().match(/^(\d+)-(\d+)-(\d+)$/);
    const sets = pair(row.find('.cell-sets').first().text());
    const points = pair(row.find('.cell-points').first().text());
    if (!m || position === null || !record || !sets || !points) return;
    rows.push({
      position,
      team: {
        teamId: m[1],
        teamVersionId: m[2],
        name: a.text().trim(),
        logoUrl: row.find('img.team-logo').first().attr('src') ?? null,
      },
      wins: Number(record[1]),
      draws: Number(record[2]),
      losses: Number(record[3]),
      setsFor: sets[0],
      setsAgainst: sets[1],
      pointsFor: points[0],
      pointsAgainst: points[1],
    });
  });
  return rows;
}
