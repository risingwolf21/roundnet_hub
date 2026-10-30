// Domain model for the Bundesliga match-day lineup planner.
//
// A match day is a round-robin of (usually 3) teams; our team plays each other team one
// ENCOUNTER of 5 boards: Open 1, Open 2, Mixed 1, Mixed 2, Women. Boards fall in two time
// blocks — block A (Open 1/2 + Women) is played first, block B (Mixed 1/2) after — and a
// player may play at most one board per block per encounter (so Open 1 + Mixed 1 is allowed,
// Open 1 + Open 2 is not). Court order is internal: within our lineup the combined RGX of
// board 1 must be >= board 2.

export type Gender = 'male' | 'female' | 'other' | 'unknown';

export type BoardId = 'open1' | 'open2' | 'women' | 'mixed1' | 'mixed2';
export type BoardKind = 'open' | 'women' | 'mixed';
export type Block = 'A' | 'B';

export interface BoardDef {
  id: BoardId;
  label: string;
  kind: BoardKind;
  block: Block;
  /** 1 = the stronger court, 2 = the weaker; null for boards with no 1/2 split (Women). */
  order: 1 | 2 | null;
}

// Block A (Open + Women) is played first, block B (Mixed) second.
export const BOARDS: readonly BoardDef[] = [
  { id: 'open1', label: 'Open 1', kind: 'open', block: 'A', order: 1 },
  { id: 'open2', label: 'Open 2', kind: 'open', block: 'A', order: 2 },
  { id: 'women', label: 'Women', kind: 'women', block: 'A', order: null },
  { id: 'mixed1', label: 'Mixed 1', kind: 'mixed', block: 'B', order: 1 },
  { id: 'mixed2', label: 'Mixed 2', kind: 'mixed', block: 'B', order: 2 },
] as const;

export const BOARD_IDS: readonly BoardId[] = BOARDS.map((b) => b.id);
export const boardDef = (id: BoardId): BoardDef => BOARDS.find((b) => b.id === id)!;

export interface Player {
  /** Stable id — the Roundnet-Germany id (rg_id) when known, else a synthetic id. */
  id: string;
  name: string;
  gender: Gender;
  /** RGX (Roundnet Germany index); null when unknown. */
  rgIndex: number | null;
  avatarUrl?: string | null;
  /** Id of the team this player belongs to. */
  teamId: string;
}

export interface Team {
  id: string;
  name: string;
  players: Player[];
  logoUrl?: string | null;
  /** Playerzone team-version id used to fetch the roster. */
  versionId?: string;
}

export interface League {
  /** Playerzone division/league id used to scrape schedule + teams. */
  id: string;
  name: string; // e.g. "1. Bundesliga"
}

/** A board's two seats, by player id (null = empty seat). */
export type BoardSeats = [string | null, string | null];

/** Our lineup for one encounter (vs one opponent): the five boards. */
export type Lineup = Record<BoardId, BoardSeats>;

export interface Encounter {
  /** Opponent team id this lineup is planned against. */
  opponentTeamId: string;
  lineup: Lineup;
}

/** The whole plan for a match day: our team + one lineup per opponent. Persisted locally. */
export interface MatchDayPlan {
  leagueId: string;
  leagueName: string;
  matchDayId: string;
  matchDayName: string;
  ownTeamId: string;
  encounters: Encounter[];
  /** When the plan was last edited (ISO), for the local store. */
  updatedAt: string;
}

/** Teams + rosters fetched for a match day (our team and the opponents we face). */
export interface MatchDayData {
  league: League;
  matchDayId: string;
  matchDayName: string;
  ownTeam: Team;
  opponents: Team[];
}

export const emptyLineup = (): Lineup => ({
  open1: [null, null],
  open2: [null, null],
  women: [null, null],
  mixed1: [null, null],
  mixed2: [null, null],
});
