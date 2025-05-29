import { Edit as EditIcon } from '@mui/icons-material';
import { Alert, Box, Fab, Tab, Tabs, Typography } from '@mui/material';
import { withProfiler } from '@sentry/react';
import { useQuery } from '@tanstack/react-query';
import { useDialogs } from '@toolpad/core';
import { TFunction } from 'i18next';
import React, { useEffect, useState } from 'react';
import { withTranslation } from 'react-i18next';
import { Navigate, useParams } from 'react-router';
import { queryClient } from 'src/App';
import { PullToRefresh } from 'src/components/pull-to-refresh/PullToRefresh';
import { supabase } from 'src/components/services/supabase/supabaseClient';
import { FullChallenge } from 'src/types/supabaseTypes';
import Layout from '../../components/Layout';
import { ChallengeRepository } from '../../repository/ChallengeRepository';
import { can } from '../../utils/PermissionService';
import { useAuthentication } from '../auth/AuthContext';
import { TabPanel } from '../events/dialogs/EventAttendanceDialog';
import { ChallengeActivityList } from './ChallengeActivityList';
import { ChallengeLeaderboard } from './ChallengeLeaderboard';
import EnterPointDialog from './dialogs/EnterPointDialog';
import { useChallengeStats } from './hooks/useChallengeStats';
import { useIncreaseChallengePoint } from './hooks/useIncreaseChallengePoint';

const ChallengeInformation = ({ t }: { t: TFunction }) => {
  const { challengeId } = useParams();
  const { user } = useAuthentication();
  const dialogs = useDialogs();
  const [value, setValue] = useState(0);

  const { data: challenge = null, isLoading, refetch } = useQuery<FullChallenge | null>({
    queryKey: ["challenge_information_" + challengeId],
    enabled: !!challengeId,
    queryFn: () => ChallengeRepository.fetchChallengeStats(challengeId)
  });

  useEffect(() => {
    const channel = supabase
      .channel('realtime:challenge')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'challenges',
          filter: `id=eq.${challengeId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["challenge_information_" + challengeId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [challengeId]);

  const challengeStatMap = useChallengeStats(challenge);

  const increaseChallengePoint = useIncreaseChallengePoint(challenge, user, refetch);

  if (isLoading) {
    return <Box sx={{ alignItems: 'center', display: 'flex', flexDirection: 'column', pt: 10 }}>
      <Typography sx={{ fontSize: '30pt', fontWeight: 'bold' }}>⌛</Typography>
      <Typography sx={{ fontSize: '18pt', fontWeight: 'bold' }}>Challenge wird geladen...</Typography>
    </Box>
  }

  if (!challenge && !isLoading) {
    return <Navigate to="/challenges/list" />;
  }

  return (
    <Layout appBarConfig={{ title: challenge?.name, navigateBackPath: "/challenges/list", showProfile: true }}>
      <PullToRefresh onRefresh={() => refetch()}>
        <Alert sx={{ m: 2 }} severity={'info'}>
          {challenge?.description}
        </Alert>
        {challenge?.automated && (
          <Alert sx={{ m: 2 }} severity={'info'}>
            {t('challenge.automatedChallenge')}
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
          <ChallengeActivityList stats={challenge?.stats ?? []} />
        </TabPanel>
        <TabPanel value={value} index={1}>
          <ChallengeLeaderboard challengeStatMap={challengeStatMap} />
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
                  dates: challenge.stats.filter(x => x.fullUser.userId === user.userId).map(x => x.created_at),
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

export default withProfiler(withTranslation()(ChallengeInformation));