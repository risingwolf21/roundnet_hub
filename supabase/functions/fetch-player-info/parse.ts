// Pure parsers for a playerzone player profile — no IO, no Deno globals, so they can be unit-tested.
import { load } from 'cheerio';

export const PLAYERZONE = 'https://playerzone.roundnetgermany.de';

export interface ScrapedProfile {
  rgIndex: number | null;
  avatarUrl: string | null;
}

/**
 * RG ID ("SAR221") → playerzone player id ("221"). The letters are the first name's; playerzone needs only the number.
 * Anything else → null, so the function never fetches a URL built from made-up input.
 */
export const playerIdFromRgId = (rgId: string): string | null => /^[A-Za-z]{3}(\d+)$/.exec(rgId.trim())?.[1] ?? null;

/**
 * Reads RG-Index and avatar from a profile page. Returns null when the profile block is missing,
 * i.e. playerzone changed its layout; the caller must then keep the stored values instead of writing blanks.
 */
export const parseProfile = (html: string): ScrapedProfile | null => {
  const $ = load(html);
  // Scope everything to the profile block: the page also shows other players' badges and photos.
  const profile = $('.rg-player-profile').first();
  if (profile.length === 0) return null;

  const score = profile.find('.rg-player-profile--rgx rg-score-badge').first().attr('score')?.trim();
  return {
    // No badge (unrated player) or no digits → unknown, never 0.
    rgIndex: score && /^\d+$/.test(score) ? Number(score) : null,
    avatarUrl: profile.find('img.rg-player-profile--image').first().attr('src')?.trim() || null,
  };
};
