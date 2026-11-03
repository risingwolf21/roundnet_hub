import { assertEquals } from '@std/assert';
import { localized } from '../_shared/lang.ts';

const req = (lang?: string) => new Request('http://x', { headers: lang ? { 'Accept-Language': lang } : {} });

Deno.test('localized: English only when the client asks for it, German otherwise', () => {
  assertEquals(localized(req('en'), 'de', 'en'), 'en');
  assertEquals(localized(req('en-GB,en;q=0.9'), 'de', 'en'), 'en');
  assertEquals(localized(req('de'), 'de', 'en'), 'de');
  assertEquals(localized(req('fr'), 'de', 'en'), 'de');
  assertEquals(localized(req(), 'de', 'en'), 'de');
});
