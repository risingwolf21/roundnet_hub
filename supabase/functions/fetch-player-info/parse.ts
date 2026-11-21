// Pure parsers for a playerzone player profile — no IO, no Deno globals, so they can be unit-tested.
import { load } from 'cheerio';

export const PLAYERZONE = 'https://playerzone.roundnetgermany.de';

export interface PlayerRef {
  id: string; // numeric playerzone player id
  letters: string | null; // first three letters of the RG ID, when the input carries them
}

export interface ScrapedProfile {
  name: string | null;
  rgIndex: number | null;
  avatarUrl: string | null;
}

/**
 * Accepts an RG ID ("SAR221") or a profile link ("https://playerzone.roundnetgermany.de/players/221-sarah-kiel").
 * Returns null for anything else, so the function never fetches a URL a user made up.
 */
export const parsePlayerRef = (input: string): PlayerRef | null => {
  const s = input.trim();
  const rgId = /^([A-Za-z]{3})(\d+)$/.exec(s);
  if (rgId) return { id: rgId[2], letters: rgId[1].toUpperCase() };
  // The part after the id is "<first name>-<city>"; playerzone itself ignores it.
  const link = /^https:\/\/playerzone\.roundnetgermany\.de\/players\/(\d+)(?:-([a-z]+))?/i.exec(s);
  if (link) return { id: link[1], letters: link[2] ? link[2].slice(0, 3).toUpperCase() : null };
  return null;
};

/**
 * Reads name, RG-Index and avatar from a profile page. Returns null when the profile block is missing,
 * i.e. playerzone changed its layout; the caller must then keep the stored values instead of writing blanks.
 */
export const parseProfile = (html: string): ScrapedProfile | null => {
  const $ = load(html);
  // Scope everything to the profile block: the page also shows other players' badges and photos.
  const profile = $('.rg-player-profile').first();
  if (profile.length === 0) return null;

  const score = profile.find('.rg-player-profile--rgx rg-score-badge').first().attr('score')?.trim();
  return {
    name: profile.find('.rg-player-profile--title').first().text().trim() || null,
    // No badge (unrated player) or no digits → unknown, never 0.
    rgIndex: score && /^\d+$/.test(score) ? Number(score) : null,
    avatarUrl: profile.find('img.rg-player-profile--image').first().attr('src')?.trim() || null,
  };
};

/** RG ID = first three letters of the first name + player id, e.g. SAR221. */
export const rgIdFor = (ref: PlayerRef, profile: ScrapedProfile): string | null => {
  const letters = ref.letters ?? lettersFromName(profile.name);
  return letters ? letters + ref.id : null;
};

const lettersFromName = (name: string | null): string | null => {
  // "Jörg Müller" → "JOR": strip accents, keep plain letters of the first name.
  const first = (name ?? '').split(/\s+/)[0].normalize('NFD').replace(/[^A-Za-z]/g, '');
  return first ? first.slice(0, 3).toUpperCase() : null;
};
