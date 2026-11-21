// Unit tests for the playerzone profile parser, run against a saved HTML fixture.
// Pure (no network), so they run without the local stack:
//   deno test --allow-read --config supabase/functions/tests/deno.json supabase/functions/tests/fetchPlayerInfo.test.ts
import { assertEquals } from '@std/assert';
import { parseProfile, playerIdFromRgId } from '../fetch-player-info/parse.ts';

const here = new URL('.', import.meta.url);
const profileHtml = Deno.readTextFileSync(new URL('fixtures/player-info/profile.html', here));

Deno.test('parseProfile: reads RG-Index and avatar from the profile block only', () => {
  assertEquals(parseProfile(profileHtml), {
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

Deno.test('playerIdFromRgId: three letters + number, nothing else', () => {
  assertEquals(playerIdFromRgId('SAR221'), '221');
  assertEquals(playerIdFromRgId(' sar221 '), '221');
  assertEquals(playerIdFromRgId('MAX7072'), '7072');
  assertEquals(playerIdFromRgId('221'), null);
  assertEquals(playerIdFromRgId('SA221'), null);
  assertEquals(playerIdFromRgId('https://playerzone.roundnetgermany.de/players/221-sarah-kiel'), null);
  assertEquals(playerIdFromRgId('SAR221/../../admin'), null);
});
