import { useMemo } from 'react';
import { ChallengeStatWithUser, FullChallenge } from 'src/types/supabaseTypes';

export const useChallengeStats = (challenge: FullChallenge | null) => {
  return useMemo(() => {
    const map = new Map<string, { stats: ChallengeStatWithUser[]; points: number }>();
    if (!challenge) return map;
    for (const stat of challenge.stats) {
      const current = map.get(stat.fullUser.userId);
      if (current) {
        map.set(stat.fullUser.userId, {
          stats: [...current.stats, stat],
          points: current.points + stat.count,
        });
      } else {
        map.set(stat.fullUser.userId, {
          stats: [stat],
          points: stat.count,
        });
      }
    }
    return map;
  }, [challenge]);
};