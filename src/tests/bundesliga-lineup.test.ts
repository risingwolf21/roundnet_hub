import { describe, expect, it } from 'vitest';
import {
  combinedRgx,
  gameCountsForDay,
  hasErrors,
  toPlayerMap,
  validateEncounter,
} from '@/features/bundesliga/lineup';
import { emptyLineup, type Lineup, type Player } from '@/features/bundesliga/types';

const P = (id: string, gender: Player['gender'], rgIndex: number | null): Player => ({
  id,
  name: id,
  gender,
  rgIndex,
  teamId: 'own',
});

const players = toPlayerMap([
  P('m1', 'male', 1200),
  P('m2', 'male', 1100),
  P('m3', 'male', 1000),
  P('m4', 'male', 900),
  P('w1', 'female', 1150),
  P('w2', 'female', 1050),
  P('w3', 'female', 950),
  P('w4', 'female', 850),
]);

// A fully valid, well-ordered lineup.
const validLineup = (): Lineup => ({
  open1: ['m1', 'm2'], // 2300
  open2: ['m3', 'm4'], // 1900  -> open1 >= open2 ✓
  women: ['w1', 'w2'],
  mixed1: ['m1', 'w3'], // m1 also in open1: open1 is block A, mixed1 is block B -> allowed
  mixed2: ['m3', 'w4'], // 1850 -> but mixed1 = 1200+950=2150 >= mixed2 1000+850=1850 ✓
});

describe('combinedRgx', () => {
  it('sums the two seats, treating missing rgx as 0', () => {
    expect(combinedRgx(['m1', 'm2'], players)).toBe(2300);
    expect(combinedRgx(['m1', null], players)).toBe(1200);
    expect(combinedRgx([null, null], players)).toBe(0);
  });
});

describe('validateEncounter', () => {
  it('accepts a correct, well-ordered lineup', () => {
    const issues = validateEncounter(validLineup(), players);
    expect(hasErrors(issues)).toBe(false);
  });

  it('flags mixed that is not 1 male + 1 female', () => {
    const l = validLineup();
    l.mixed1 = ['m1', 'm2'];
    const issues = validateEncounter(l, players);
    expect(issues.some((i) => i.board === 'mixed1' && i.level === 'error')).toBe(true);
  });

  it('flags women that is not two women', () => {
    const l = validLineup();
    l.women = ['m1', 'w1'];
    expect(validateEncounter(l, players).some((i) => i.board === 'women' && i.level === 'error')).toBe(true);
  });

  it('flags board 1 weaker than board 2 (open)', () => {
    const l = validLineup();
    l.open1 = ['m3', 'm4']; // 1900
    l.open2 = ['m1', 'm2']; // 2300 -> open1 < open2
    expect(validateEncounter(l, players).some((i) => i.board === 'open2' && i.level === 'error')).toBe(true);
  });

  it('flags a player used twice in the same block (open1 + women)', () => {
    const l = validLineup();
    l.women = ['w1', 'm1']; // m1 is in open1 (block A) and now women (block A)
    // (also makes women invalid, but we assert the block clash specifically)
    const issues = validateEncounter(l, players);
    expect(issues.some((i) => i.board === null && i.level === 'error' && /nur ein Spiel/.test(i.message))).toBe(true);
  });

  it('allows a player across blocks (open1 + mixed1)', () => {
    // validLineup already has m1 in open1 and mixed1 -> no block clash
    const issues = validateEncounter(validLineup(), players);
    expect(issues.some((i) => i.board === null)).toBe(false);
  });

  it('warns on an incomplete board', () => {
    const l = emptyLineup();
    l.open1 = ['m1', null];
    expect(validateEncounter(l, players).some((i) => i.board === 'open1' && i.level === 'warning')).toBe(true);
  });
});

describe('gameCountsForDay', () => {
  it('sums a player across all encounters', () => {
    const enc = [
      { opponentTeamId: 'A', lineup: validLineup() },
      { opponentTeamId: 'B', lineup: validLineup() },
    ];
    const counts = gameCountsForDay(enc);
    // m1 plays open1 + mixed1 in each of the 2 encounters -> 4
    expect(counts['m1']).toBe(4);
    // w1 plays women in each -> 2
    expect(counts['w1']).toBe(2);
  });
});
