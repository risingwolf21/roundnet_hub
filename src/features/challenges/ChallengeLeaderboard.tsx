import { List } from '@mui/material';
import React from 'react';
import { ChallengePointsView } from '@/types/supabaseTypes';
import { ChallengeStatItem } from './components/ChallengeStatItem';
import { LoadingChallengeStatItem } from './components/LoadingChallengeStatItem';

export const ChallengeLeaderboard = ({
  challenge_points,
  isLoading,
}: {
  challenge_points: ChallengePointsView[];
  isLoading: boolean;
}) => {
  const uniqueScores = [...new Set(challenge_points.map((x) => x.total_points))].sort((a, b) => b - a);

  return (
    <List sx={{ width: '100%' }}>
      {isLoading
        ? Array.from({ length: 10 }, (v, k) => k + 1).map((x) => <LoadingChallengeStatItem index={x} />)
        : challenge_points
            .sort((a, b) => b.total_points - a.total_points)
            .map((x, i) => (
              <ChallengeStatItem
                key={i}
                points={x.total_points}
                displayName={x.displayName}
                avatarUrl={x.avatarUrl}
                index={uniqueScores.indexOf(x.total_points)}
              />
            ))}
    </List>
  );
};
