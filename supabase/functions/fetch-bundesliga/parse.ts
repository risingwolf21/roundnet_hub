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

export interface ScrapedMatchDay {
  id: string; // md_group id
  md: string | null; // match-day number
  name: string; // e.g. "Gruppe E"
  date: string | null; // dd.mm.yyyy as shown
  city: string | null;
  teams: { teamId: string; teamVersionId: string; name: string }[];
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

/** Match-day groups rendered on the schedule page (the active/next round). */
export function parseMatchDays(html: string): ScrapedMatchDay[] {
  const $ = load(html);
  const out: ScrapedMatchDay[] = [];
  $('[class*="md-group-container"]').each((_i, el) => {
    const group = $(el);
    const cls = group.attr('class') ?? '';
    const idMatch = cls.match(/md-group-(\d+)/);
    if (!idMatch) return;
    const id = idMatch[1];

    const name = group.find('.md-group-name').first().text().trim();
    const date = group.find('.md-group-date').first().text().trim() || null;
    const city = group.find('.md-group-city').first().text().trim().split('\n')[0].trim() || null;

    const teamsById = new Map<string, { teamId: string; teamVersionId: string; name: string }>();
    group.find('a.details[onclick*="load_team_info"]').each((_j, a) => {
      const anchor = $(a);
      const m = (anchor.attr('onclick') ?? '').match(/load_team_info\(\s*(\d+)\s*,\s*(\d+)/);
      if (!m) return;
      const nm = anchor.find('.name').first().text().trim();
      teamsById.set(m[1], { teamId: m[1], teamVersionId: m[2], name: nm });
    });
    // href query params are serialized with &amp;, so allow the encoded form too.
    const mdMatch = (group.html() ?? '').match(/[?&](?:amp;)?md=(\d+)/);
    const md = mdMatch ? mdMatch[1] : null;

    // Only groups that actually rendered games carry teams; skip empty tab shells.
    if (teamsById.size === 0) return;
    out.push({ id, md, name, date, city, teams: [...teamsById.values()] });
  });
  return out;
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
    const name = card.find('.player-name').first().text().trim() || slug.replace(/-/g, ' ');
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
