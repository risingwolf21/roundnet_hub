// Unit tests for the playerzone parsers, run against saved HTML/JSON fixtures.
// These are pure (no network), so they run without the local stack:
//   deno test --config supabase/functions/tests/deno.json supabase/functions/tests/fetchBundesliga.test.ts
import { assert, assertEquals } from '@std/assert';
import {
  isoDate,
  parseLeagueNav,
  parseGames,
  parseMdGroup,
  parseMdGroupIds,
  parseRoster,
  parseScheduleNav,
  parseStandings,
  parseTeams,
  rosterHtmlFromResponse,
} from '../fetch-bundesliga/parse.ts';
import { pairFromRoster } from '../fetch-bundesliga/scrape.ts';

const here = new URL('.', import.meta.url);
const read = (p: string) => Deno.readTextFileSync(new URL(`fixtures/bundesliga/${p}`, here));

Deno.test('parseTeams: reads team id, version, name, logo, total and first names', () => {
  const teams = parseTeams(read('teams.html'));
  assert(teams.length > 0, 'expected teams');

  const kaboom = teams.find((t) => t.name === 'KA-Boom');
  assert(kaboom, 'KA-Boom team present');
  assertEquals(kaboom!.teamId, '45617');
  assertEquals(kaboom!.teamVersionId, '59549');
  assertEquals(kaboom!.rgxTotal, 11659);
  assert(kaboom!.logoUrl?.includes('Karlsruhe_Kojoten_Logo'), 'has club logo');
  assert(kaboom!.firstNames.includes('Jonas'), 'has first names');

  // Every team must carry the ids we need to fetch a roster.
  for (const t of teams) {
    assert(/^\d+$/.test(t.teamId), `teamId numeric: ${t.teamId}`);
    assert(/^\d+$/.test(t.teamVersionId), `teamVersionId numeric: ${t.teamVersionId}`);
  }
});

const SLUG = '793-2027-04-11-deutsche-roundnet-liga-2026-2027';

Deno.test('parseLeagueNav: joins the teams and schedule dropdowns by league name', () => {
  const leagues = parseLeagueNav(read('teams.html') + read('schedule_results.html'), SLUG);
  assertEquals(leagues, [
    { name: '1. Bundesliga', teamsPageId: '2613', scheduleSlug: 'mixed-14358-gruppenphase' },
    { name: '2. Bundesliga', teamsPageId: '2614', scheduleSlug: 'mixed-14363-hauptrunde-2-bl' },
    { name: '3. Liga', teamsPageId: '2615', scheduleSlug: 'mixed-14531-hauptrunde' },
    { name: 'Regionalliga', teamsPageId: '2616', scheduleSlug: 'mixed-14631-hauptrunde' },
  ]);
  // Links of other tournaments are ignored.
  assertEquals(parseLeagueNav(read('teams.html'), '1-another-tournament'), []);
});

Deno.test('parseScheduleNav: finds the schedule group and all match days', () => {
  assertEquals(parseScheduleNav(read('schedule_results.html')), {
    groupId: '76368',
    matchDays: [
      { id: '110', number: 1 },
      { id: '111', number: 2 },
      { id: '112', number: 3 },
      { id: '113', number: 4 },
      { id: '114', number: 5 },
    ],
  });
});

Deno.test('parseMdGroup: a played group with teams, scores and winner', () => {
  const html = read('schedule_results.html');
  assertEquals(parseMdGroupIds(html), ['656', '657', '658', '659']);

  const group = parseMdGroup(html, '656')!;
  assertEquals([group.name, group.date, group.city], ['Gruppe A', '2026-10-17', 'Heidelberg']);
  assertEquals(group.encounters.length, 6); // 4 teams, everyone plays everyone
  const first = group.encounters[0];
  assertEquals(first.gameId, '419767');
  assertEquals([first.team1.name, first.team1.teamId, first.team1.teamVersionId], ['MRC I', '40794', '59944']);
  assertEquals([first.team2.name, first.team2.teamId], ['Heidelberg', '45613']);
  assertEquals([first.boards, first.sets, first.winner], [[4, 1], [8, 3], 1]);

  // The other groups' containers are empty on this page and need their own request.
  assertEquals(parseMdGroup(html, '657'), null);
});

Deno.test('parseMdGroup: a future group lists its encounters without scores', () => {
  const group = parseMdGroup(read('schedule_future.html'), '672')!;
  assertEquals([group.name, group.date], ['Gruppe Q', '2027-02-20']);
  assertEquals(group.encounters.length, 6);
  assert(group.encounters.every((e) => e.boards === null && e.sets === null && e.winner === null));
});

Deno.test('parseStandings: rank, record, sets and points per team', () => {
  const rows = parseStandings(read('standings.html'));
  assertEquals(rows.length, 15);
  assertEquals(rows[0], {
    position: 1,
    team: {
      teamId: '45617',
      teamVersionId: '59549',
      name: 'KA-Boom',
      logoUrl: 'https://pstaassets.blob.core.windows.net/assets/clubs/logos/Karlsruhe_Kojoten_Logo.png',
    },
    wins: 6, draws: 0, losses: 0, setsFor: 47, setsAgainst: 23, pointsFor: 1056, pointsAgainst: 876,
  });
  assertEquals(rows.map((r) => r.position), [...rows.keys()].map((i) => i + 1));
});

Deno.test('parseGames: the five games of an encounter with pairs, sets and winner', () => {
  const games = parseGames(rosterHtmlFromResponse(read('games.json')));
  assertEquals(games.map((g) => g.discipline), ['Open 1', 'Open 2', 'Women', 'Mixed 1', 'Mixed 2']);
  assertEquals(games[0], {
    gameId: '419768',
    discipline: 'Open 1',
    pair1: { id: '68785', name: 'Anderle/Mareschal' },
    pair2: { id: '68833', name: 'Härtling/Hansen' },
    sets: [[15, 17], [14, 17]],
    winner: 2,
  });
  assertEquals([games[1].pair1?.name, games[1].sets, games[1].winner], ['Wimmer/Wolf', [[17, 13], [17, 15]], 1]);
  // 4:1 for side 1, as the encounter says.
  assertEquals(games.filter((g) => g.winner === 1).length, 4);
});

Deno.test('isoDate: dd.mm.yyyy only', () => {
  assertEquals(isoDate('07.11.2026'), '2026-11-07');
  assertEquals(isoDate(' 20.02.2027 '), '2027-02-20');
  assertEquals(isoDate('Sa., 20.02.'), null);
  assertEquals(isoDate(null), null);
});

Deno.test('parseRoster: reads name, rgx, gender and avatar; gender from show_history arg', () => {
  const players = parseRoster(rosterHtmlFromResponse(read('roster.json')));
  assert(players.length >= 10, 'expected a full squad');

  const hella = players.find((p) => p.name === 'Hella Senger');
  assert(hella, 'Hella present');
  assertEquals(hella!.id, '6386');
  assertEquals(hella!.gender, 'female');
  assertEquals(hella!.rgIndex, 1688);
  assert(hella!.avatarUrl?.includes('profile_HEL6386'), 'has avatar');

  const amin = players.find((p) => p.name === 'Amin Werner');
  assert(amin, 'Amin present');
  assertEquals(amin!.gender, 'male');
  assertEquals(amin!.rgIndex, 1711);

  // A player without an RGX badge must come back as null, not NaN/0.
  const wiebke = players.find((p) => p.name === 'Wiebke Asbahr');
  assert(wiebke, 'Wiebke present');
  assertEquals(wiebke!.rgIndex, null);

  // Gender signal is consistent: every player resolves to male/female here.
  assert(players.every((p) => p.gender === 'male' || p.gender === 'female'), 'all genders resolved');
});

Deno.test('rosterHtmlFromResponse: unwraps {html} JSON and passes raw HTML through', () => {
  assertEquals(rosterHtmlFromResponse('{"html":"<div>x</div>"}'), '<div>x</div>');
  assertEquals(rosterHtmlFromResponse('<div>y</div>'), '<div>y</div>');
});

Deno.test('pairFromRoster: surnames that fit exactly one player of the team, else null', () => {
  const roster = [
    { id: '1979', name: 'Simon Wimmer' },
    { id: '2225', name: 'Karl Wolf' },
    { id: '18900', name: 'Lena von Wulffen' },
    { id: '7', name: 'Anna Braun' },
    { id: '8', name: 'Ben Braun' },
  ];
  assertEquals(pairFromRoster('Wimmer/Wolf', roster), ['1979', '2225']);
  assertEquals(pairFromRoster('von Wulffen/Wolf', roster), ['18900', '2225']);
  assertEquals(pairFromRoster('Braun/Wolf', roster), null); // two Brauns: playerzone must tell
  assertEquals(pairFromRoster('Wolf/Unbekannt', roster), null); // not in the roster (yet)
  assertEquals(pairFromRoster('Wolf/Wolf', roster), null);
});

Deno.test('parseRoster: the full name in the current popup layout', () => {
  const html = `<div class="player-team-card rg-team-popup--player"><a href="/players/42-max-abc" class="rg-team-popup--avatar-link"></a>
    <div class="rg-team-popup--info"><a href="/players/42-max-abc"><div class="rg-team-popup--name">Max Mustermann</div></a>
    <a onclick="show_history(42, 1)"><rg-score-badge score="1500"></rg-score-badge></a></div></div>`;
  const [p] = parseRoster(html);
  assertEquals([p.id, p.name, p.rgIndex, p.gender], ['42', 'Max Mustermann', 1500, 'male']);
});
