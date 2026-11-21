// Unit tests for the playerzone profile parser, run against a saved HTML fixture.
// Pure (no network), so they run without the local stack:
//   deno test --allow-read --config supabase/functions/tests/deno.json supabase/functions/tests/fetchPlayerInfo.test.ts
import { assertEquals } from '@std/assert';
import { parsePlayerRef, parseProfile, rgIdFor } from '../fetch-player-info/parse.ts';

const here = new URL('.', import.meta.url);
const profileHtml = Deno.readTextFileSync(new URL('fixtures/player-info/profile.html', here));

Deno.test('parseProfile: reads name, RG-Index and avatar from the profile block only', () => {
  assertEquals(parseProfile(profileHtml), {
    name: 'Max Muster',
    rgIndex: 1532,
    avatarUrl: 'https://pstaassets.blob.core.windows.net/assets/players/profile_MAX1234-2024-03-01-10-00-00.jpg',
  });
});

Deno.test('parseProfile: a page without the profile block (layout changed) returns null, not zeros', () => {
  const oldLayout = '<div class="player-card"><img class="player-img" src="x.jpg"><span class="rgx-value">1500</span></div>';
  assertEquals(parseProfile(oldLayout), null);
});

Deno.test('parseProfile: an unrated player has no RG-Index instead of 0', () => {
  const unrated = profileHtml.replace(/<rg-score-badge score="1532"[^>]*>/, '<rg-score-badge score="">');
  assertEquals(parseProfile(unrated)?.rgIndex, null);
});

Deno.test('parsePlayerRef: accepts an RG ID or a profile link, nothing else', () => {
  assertEquals(parsePlayerRef('SAR221'), { id: '221', letters: 'SAR' });
  assertEquals(parsePlayerRef(' sar221 '), { id: '221', letters: 'SAR' });
  assertEquals(parsePlayerRef('https://playerzone.roundnetgermany.de/players/221-sarah-kiel'), { id: '221', letters: 'SAR' });
  assertEquals(parsePlayerRef('https://playerzone.roundnetgermany.de/players/221'), { id: '221', letters: null });
  assertEquals(parsePlayerRef('https://example.com/players/221-sarah-kiel'), null);
  assertEquals(parsePlayerRef('221'), null);
});

Deno.test('rgIdFor: letters from the input, else from the first name on the page', () => {
  const profile = parseProfile(profileHtml)!;
  assertEquals(rgIdFor({ id: '1234', letters: 'MAX' }, profile), 'MAX1234');
  assertEquals(rgIdFor({ id: '1234', letters: null }, profile), 'MAX1234');
  assertEquals(rgIdFor({ id: '7', letters: null }, { ...profile, name: 'Jörg Müller' }), 'JOR7');
  assertEquals(rgIdFor({ id: '7', letters: null }, { ...profile, name: null }), null);
});

Deno.test('links with and without a name (Sentry ROUNDNET-KARLSRUHE-RG): no crash, the id comes from the page', () => {
  const profile = parseProfile(profileHtml)!;
  const withName = parsePlayerRef('https://playerzone.roundnetgermany.de/players/7072-max-mustermann')!;
  assertEquals(rgIdFor(withName, profile), 'MAX7072');
  const numberOnly = parsePlayerRef('https://playerzone.roundnetgermany.de/players/7072')!;
  assertEquals(numberOnly, { id: '7072', letters: null });
  assertEquals(rgIdFor(numberOnly, profile), 'MAX7072');
});
