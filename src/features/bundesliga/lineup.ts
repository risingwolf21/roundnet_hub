// Pure lineup rules for the Bundesliga planner — no React, no IO, fully unit-testable.
import { t } from 'i18next';
import { BOARDS, type BoardId, type BoardSeats, type Encounter, type Lineup, type MatchDayPlan, type Player, boardDef } from './types';

export type PlayerMap = Record<string, Player>;

export const toPlayerMap = (players: Player[]): PlayerMap =>
  Object.fromEntries(players.map((p) => [p.id, p]));

/** Non-empty, de-duplicated seat ids of a board. */
export const seatIds = (seats: BoardSeats): string[] =>
  seats.filter((id): id is string => !!id);

/** Combined RGX of a board = sum of its players' rgIndex (missing counts as 0). */
export function combinedRgx(seats: BoardSeats, players: PlayerMap): number {
  return seatIds(seats).reduce((sum, id) => sum + (players[id]?.rgIndex ?? 0), 0);
}

export type IssueLevel = 'error' | 'warning';
export interface LineupIssue {
  level: IssueLevel;
  /** Board the issue is about, or null for cross-board (block) issues. */
  board: BoardId | null;
  message: string;
}

const femaleCount = (ids: string[], players: PlayerMap) =>
  ids.filter((id) => players[id]?.gender === 'female').length;
const maleCount = (ids: string[], players: PlayerMap) =>
  ids.filter((id) => players[id]?.gender === 'male').length;

/**
 * Validate one encounter's lineup:
 *  - each board must have 2 seats filled (else a warning);
 *  - composition: mixed = 1 male + 1 female, women = 2 female, open = any 2;
 *  - a player may appear at most once in block A (Open 1/2 + Women) and once in block B (Mixed 1/2);
 *  - internal court order: combined RGX of board 1 must be >= board 2 (Open and Mixed).
 */
export function validateEncounter(lineup: Lineup, players: PlayerMap): LineupIssue[] {
  const issues: LineupIssue[] = [];

  // Per-board: fill + composition.
  for (const def of BOARDS) {
    const ids = seatIds(lineup[def.id]);
    if (ids.length < 2) {
      issues.push({ level: 'warning', board: def.id, message: t('bundesliga.issues.incomplete', { label: def.label }) });
      // still run composition checks on what is there, but only flag hard errors when full
    }
    if (new Set(ids).size !== ids.length) {
      issues.push({ level: 'error', board: def.id, message: t('bundesliga.issues.duplicate', { label: def.label }) });
    }
    if (ids.length === 2) {
      if (def.kind === 'women' && femaleCount(ids, players) !== 2) {
        issues.push({ level: 'error', board: def.id, message: t('bundesliga.issues.womenFemale') });
      }
      if (def.kind === 'mixed' && !(maleCount(ids, players) === 1 && femaleCount(ids, players) === 1)) {
        issues.push({ level: 'error', board: def.id, message: t('bundesliga.issues.mixedGender', { label: def.label }) });
      }
    }
  }

  // Block eligibility: a player may play at most one board per block.
  for (const block of ['A', 'B'] as const) {
    const usage: Record<string, string[]> = {};
    for (const def of BOARDS.filter((b) => b.block === block)) {
      for (const id of seatIds(lineup[def.id])) (usage[id] ??= []).push(def.label);
    }
    for (const [id, labels] of Object.entries(usage)) {
      if (labels.length > 1) {
        const name = players[id]?.name ?? id;
        issues.push({
          level: 'error',
          board: null,
          message: t(block === 'A' ? 'bundesliga.issues.oneGameOpenWomen' : 'bundesliga.issues.oneGameMixed', { name, labels: labels.join(' & ') }),
        });
      }
    }
  }

  // Internal court order (board 1 combined RGX >= board 2) for Open and Mixed.
  for (const [b1, b2, label] of [
    ['open1', 'open2', 'Open'],
    ['mixed1', 'mixed2', 'Mixed'],
  ] as const) {
    const full1 = seatIds(lineup[b1]).length === 2;
    const full2 = seatIds(lineup[b2]).length === 2;
    if (full1 && full2 && combinedRgx(lineup[b1], players) < combinedRgx(lineup[b2], players)) {
      issues.push({
        level: 'error',
        board: b2,
        message: t('bundesliga.issues.rgxOrder', { label }),
      });
    }
  }

  return issues;
}

export const hasErrors = (issues: LineupIssue[]): boolean => issues.some((i) => i.level === 'error');

/** How many games each player is assigned across the whole match day (summed over encounters). */
export function gameCountsForDay(encounters: Encounter[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const enc of encounters) {
    for (const def of BOARDS) {
      for (const id of seatIds(enc.lineup[def.id])) counts[id] = (counts[id] ?? 0) + 1;
    }
  }
  return counts;
}

/** Validate every encounter of a plan; returns issues keyed by opponent team id. */
export function validatePlan(plan: MatchDayPlan, players: PlayerMap): Record<string, LineupIssue[]> {
  return Object.fromEntries(plan.encounters.map((e) => [e.opponentTeamId, validateEncounter(e.lineup, players)]));
}

/** Label for a board id (re-exported convenience for UI). */
export const labelOf = (id: BoardId): string => boardDef(id).label;
