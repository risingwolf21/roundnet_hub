import { Edit as EditIcon } from '@mui/icons-material';
import { Alert, Box, Fab, Tab, Tabs, Typography } from '@mui/material';
import { withProfiler } from '@sentry/react';
import { useDialogs } from '@toolpad/core';
import { TFunction } from 'i18next';
import React, { useState } from 'react';
import { withTranslation } from 'react-i18next';
import { Navigate, useParams } from 'react-router';
import { queryClient } from 'src/App';
import { PullToRefresh } from 'src/components/pull-to-refresh/PullToRefresh';
import { useChallenge, useChallengeLeaderboard, useChallengeStatsForUser, useInfiniteChallengeStats } from 'src/tanstack/challenge';
import Layout from '../../components/Layout';
import { can } from '../../utils/PermissionService';
import { useAuthentication } from '../auth/AuthContext';
import { TabPanel } from '../events/dialogs/EventAttendanceDialog';
import { ChallengeActivityList } from './ChallengeActivityList';
import { ChallengeLeaderboard } from './ChallengeLeaderboard';
import EnterPointDialog from './dialogs/EnterPointDialog';
import { useIncreaseChallengePoint } from './hooks/useIncreaseChallengePoint';

const ChallengeInformationProvider = ({ t }: { t: TFunction }) => {
  const { challengeId } = useParams();

  if (!challengeId)
    return <Navigate to="/challenges/list" />

  return <ChallengeInformation t={t} challengeId={challengeId} />
}

const ChallengeInformation = ({ t, challengeId }: { t: TFunction, challengeId: string }) => {
  const { user } = useAuthentication();
  const dialogs = useDialogs();
  const [value, setValue] = useState(0);

  const { data: challenge = null, isLoading } = useChallenge(challengeId);
  const { data: leaderboard = [], isLoading: isLeaderboardLoading } = useChallengeLeaderboard(challengeId);
  const { data: challenge_stats, fetchNextPage, isFetchingNextPage, hasNextPage } = useInfiniteChallengeStats(challengeId);
  const { data: user_challenge_stats = [] } = useChallengeStatsForUser(challengeId, user.userId);

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["challenge", challengeId] })
  }

  const increaseChallengePoint = useIncreaseChallengePoint(challenge, user, refetch);


  if (isLoading) {
    return <Box sx={{ alignItems: 'center', display: 'flex', flexDirection: 'column', pt: 10 }}>
      <Typography sx={{ fontSize: '30pt', fontWeight: 'bold' }}>⌛</Typography>
      <Typography sx={{ fontSize: '18pt', fontWeight: 'bold' }}>Challenge wird geladen...</Typography>
    </Box>
  }

  return (
    <Layout appBarConfig={{ title: challenge?.name, navigateBackPath: "/challenges/list", showProfile: true }}>
      <PullToRefresh onRefresh={() => refetch()}>
        <Alert sx={{ m: 2 }} severity={'info'}>
          {challenge?.description}
        </Alert>
        {challenge?.automated && (
          <Alert sx={{ m: 2 }} severity={'info'}>
            {
              isLoading ? "Challenge wird geladen..." : t('challenge.automatedChallenge')
            }
          </Alert>
        )}
        <Tabs
          value={value}
          onChange={(_e, v) => setValue(v)}
          indicatorColor="primary"
          textColor="inherit"
          variant="fullWidth"
        >
          <Tab label="Aktivität" />
          <Tab label="Leaderboard" />
        </Tabs>
        <TabPanel value={value} index={0}>
          <ChallengeActivityList
            stats={challenge_stats}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage} />
        </TabPanel>
        <TabPanel value={value} index={1}>
          <ChallengeLeaderboard isLoading={isLeaderboardLoading} challenge_points={leaderboard} />
        </TabPanel>

        {can('update', 'challenge') && !challenge?.automated && (
          <Fab
            sx={{
              background: '#66bb6a',
              position: 'fixed',
              right: '16px',
              bottom: 'calc(16px + env(safe-area-inset-bottom))',
              mb: '16px',
            }}
            onClick={async () => {
              if (challenge) {
                const result = await dialogs.open(EnterPointDialog, {
                  dates: user_challenge_stats.map(x => x.created_at),
                  maxEntriesPerWeek: challenge.max_points_per_week
                });

                if (result) increaseChallengePoint(result.date, result.image);
              }
            }}
          >
            <EditIcon sx={{ color: 'white' }} />
          </Fab>
        )}


      </PullToRefresh>
    </Layout>
  );
};

export default withProfiler(withTranslation()(ChallengeInformationProvider));