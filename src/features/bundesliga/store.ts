// Local-only persistence for the Bundesliga planner. Everything the user plans lives in
// localStorage on their device (no DB tables) — a single JSON blob, read/written defensively.
import { useCallback, useEffect, useState } from 'react';
import type { Gender, Lineup } from './types';

const KEY = 'bundesliga-planner-v1';

export interface PlannerState {
  leagueId: string;
  ownTeamId: string | null;
  /** Detected match-day id, or 'manual' when the user picks opponents by hand. */
  matchDayId: string | null;
  matchDayName: string | null;
  opponentIds: string[];
  /** playerId -> gender override (the scrape guesses gender; the user can correct it). */
  genderOverrides: Record<string, Gender>;
  /** `${leagueId}:${ownTeamId}:${opponentTeamId}` -> lineup. */
  lineups: Record<string, Lineup>;
}

export const defaultState: PlannerState = {
  leagueId: '2613',
  ownTeamId: null,
  matchDayId: null,
  matchDayName: null,
  opponentIds: [],
  genderOverrides: {},
  lineups: {},
};

function read(): PlannerState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState;
    return { ...defaultState, ...(JSON.parse(raw) as PlannerState) };
  } catch {
    return defaultState;
  }
}

export const lineupKey = (leagueId: string, ownTeamId: string, opponentTeamId: string) =>
  `${leagueId}:${ownTeamId}:${opponentTeamId}`;

/** React state mirrored to localStorage. Returns the state and a partial-merge setter. */
export function usePlannerState() {
  const [state, setState] = useState<PlannerState>(read);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // storage unavailable (private mode, blocked) — the UI still works for this session
    }
  }, [state]);

  const patch = useCallback(
    (p: Partial<PlannerState> | ((prev: PlannerState) => Partial<PlannerState>)) =>
      setState((prev) => ({ ...prev, ...(typeof p === 'function' ? p(prev) : p) })),
    []
  );

  return [state, patch, setState] as const;
}
