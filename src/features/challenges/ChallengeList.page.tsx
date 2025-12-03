import { PullToRefresh } from '@/components/pull-to-refresh/PullToRefresh';
import { useArchivedChallenges, useChallenges } from '@/tanstack/challenge';
import { withProfiler } from '@sentry/react';
import { useNotifications } from '@toolpad/core';
import { useEffect } from 'react';
import Layout from '../../components/layout/Layout';

import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import { useGrants } from '../auth/GrantsContext';
import ChallengeList from './ChallengeList';

const ChallengeListPage = () => {
  const notifications = useNotifications();
  const { user } = useGrants();

  const { data: challenges = [], error, isLoading, refetch } = useChallenges();
  const { data: archived_challenges, refetch: archiveRefetch } = useArchivedChallenges();

  useEffect(() => {
    if (error) notifications.show(error.message, { severity: 'error' });
  }, [error, notifications]);

  if (isLoading) {
    return <LinearProgress sx={{ position: 'fixed', top: 56, left: 0, right: 0 }} />;
  }

  if (challenges.length <= 0 && (archived_challenges?.pages?.length ?? 0) <= 0) {
    return (
      <Box sx={{ alignItems: 'center', display: 'flex', flexDirection: 'column', pt: 10 }}>
        <Typography sx={{ fontSize: '30pt', fontWeight: 'bold' }}>🏅</Typography>
        <Typography sx={{ fontSize: '18pt', fontWeight: 'bold' }}>Keine Challenges gefunden</Typography>
      </Box>
    );
  }

  return (
    <Layout>
      <PullToRefresh
        onRefresh={() => {
          refetch();
          archiveRefetch();
        }}
      >
        <ChallengeList
          user={user}
          challenges={challenges}
          archived_challenges={archived_challenges}
          error={error}
          isLoading={isLoading}
        />
      </PullToRefresh>
    </Layout>
  );
};

export default withProfiler(ChallengeListPage);
