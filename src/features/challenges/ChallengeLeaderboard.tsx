import React from 'react';
import { List } from '@mui/material';
import { ChallengeStatWithUser } from 'src/types/supabaseTypes';
import { ChallengeStatItem } from './components/ChallengeStatItem';

export const ChallengeLeaderboard = ({
  challengeStatMap,
}: {
  challengeStatMap: Map<string, { stats: ChallengeStatWithUser[]; points: number }>;
}) => {
  const uniqueScores = [...new Set([...challengeStatMap.values()].map((x) => x.points))].sort((a, b) => b - a);
  return (
    <List sx={{ width: '100%' }}>
      {[...challengeStatMap.values()]
        .sort((a, b) => b.points - a.points)
        .map((x, i) => (
          <ChallengeStatItem
            key={i}
            statsForUser={x.stats}
            index={uniqueScores.indexOf(x.points)}
          />
        ))}
    </List>
  );
};
