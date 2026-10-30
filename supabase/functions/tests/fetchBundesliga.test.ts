// Unit tests for the playerzone parsers, run against saved HTML/JSON fixtures.
// These are pure (no network), so they run without the local stack:
//   deno test --config supabase/functions/tests/deno.json supabase/functions/tests/fetchBundesliga.test.ts
import { assert, assertEquals } from '@std/assert';
import {
  parseMatchDays,
  parseRoster,
  parseTeams,
  rosterHtmlFromResponse,
} from '../fetch-bundesliga/parse.ts';

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

Deno.test('parseMatchDays: finds the rendered group with its teams and date', () => {
  const mds = parseMatchDays(read('schedule.html'));
  assert(mds.length > 0, 'expected at least one rendered match day');

  const gruppeE = mds.find((m) => m.id === '660');
  assert(gruppeE, 'group 660 present');
  assertEquals(gruppeE!.name, 'Gruppe E');
  assertEquals(gruppeE!.date, '07.11.2026');
  assertEquals(gruppeE!.city, 'Bonn');
  assertEquals(gruppeE!.md, '111');
  assertEquals(gruppeE!.teams.length, 3);
  const names = gruppeE!.teams.map((t) => t.name).sort();
  assertEquals(names, ['Heidelberg', 'Roundnet Club Bonn I', 'Würzburg']);
  for (const t of gruppeE!.teams) {
    assert(/^\d+$/.test(t.teamVersionId), 'match-day team has a version id for roster fetch');
  }
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
