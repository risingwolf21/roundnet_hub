// Pure unit test, no network:
//   deno test --config supabase/functions/tests/deno.json supabase/functions/tests/fetchPlayerInfo.test.ts
import { assertEquals } from '@std/assert';
import { rgIdFromLink } from '../fetch-player-info/parse.ts';

Deno.test('rgIdFromLink: builds the id from a link with a name', () => {
  assertEquals(rgIdFromLink('https://playerzone.roundnetgermany.de/players/7072-max-mustermann'), 'MAX7072');
});

Deno.test('rgIdFromLink: returns null for a link with only the number (Sentry ROUNDNET-KARLSRUHE-RG)', () => {
  assertEquals(rgIdFromLink('https://playerzone.roundnetgermany.de/players/7072'), null);
});
