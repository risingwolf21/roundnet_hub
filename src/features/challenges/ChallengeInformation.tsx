import { Edit as EditIcon } from '@mui/icons-material';
import { Alert, Box, Fab, Tab, Tabs, Typography } from '@mui/material';
import { captureException, withProfiler } from '@sentry/react';
import { useDialogs, useNotifications } from '@toolpad/core';
import { Dayjs } from 'dayjs';
import { TFunction } from 'i18next';
import React, { useCallback, useState } from 'react';
import { withTranslation } from 'react-i18next';
import { Navigate, useParams } from 'react-router';
import { queryClient } from 'src/App';
import { PullToRefresh } from 'src/components/pull-to-refresh/PullToRefresh';
import { supabase } from 'src/components/services/supabase/supabaseClient';
import { useChallenge, useChallengeLeaderboard, useChallengeStatsForUser, useIncreasePointForUserMutation, useInfiniteChallengeStats } from 'src/tanstack/challenge';
import { dataURLtoFile } from 'src/utils';
import Layout from '../../components/layout/Layout';
import { useAuthentication } from '../auth/AuthProvider';
import { TabPanel } from '../events/dialogs/EventAttendanceDialog';
import { ChallengeActivityList } from './ChallengeActivityList';
import { ChallengeLeaderboard } from './ChallengeLeaderboard';
import EnterPointDialog from './dialogs/EnterPointDialog';

const ChallengeInformationProvider = ({ t }: { t: TFunction }) => {
  const { challengeId } = useParams();

  if (!challengeId)
    return <Navigate to="/challenges/list" />

  return <ChallengeInformation t={t} challengeId={challengeId} />
}

const ChallengeInformation = ({ t, challengeId }: { t: TFunction, challengeId: string }) => {
  const { user, isAuthorized } = useAuthentication();
  const dialogs = useDialogs();
  const notifications = useNotifications();
  const [value, setValue] = useState(0);

  const { data: challenge = null, isLoading } = useChallenge(challengeId);
  const { data: leaderboard = [], isLoading: isLeaderboardLoading } = useChallengeLeaderboard(challengeId);
  const { data: challenge_stats, fetchNextPage, isFetchingNextPage, hasNextPage } = useInfiniteChallengeStats(challengeId);
  const { data: user_challenge_stats = [] } = useChallengeStatsForUser(challengeId, user.userId);

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: ["challenge", challengeId] })
  }

  const increasePointMutation = useIncreasePointForUserMutation(challengeId);

  const uploadImage = useCallback(async (image: { dataUrl: string, fileName: string } | null) => {
    if (!image || !challenge) return null;
    const { data: uploadData, error } = await supabase.storage
      .from('challenge')
      .upload(`${challenge.id}/${image.fileName}`, dataURLtoFile(image.dataUrl, image.fileName), { upsert: true });
    if (uploadData?.path && !error) {
      const { data } = supabase.storage.from('challenge').getPublicUrl(uploadData.path);
      return data?.publicUrl ?? null;
    }
    return null;
  }, [challenge]);

  const increaseChallengePoint = useCallback(
    async (created_at: Dayjs, image: { dataUrl: string; fileName: string } | null) => {
      if (!user || !challenge) {
        notifications.show('Something went wrong! Try again later', { severity: 'error' });
        return;
      }

      const uploadedImageUrl = await uploadImage(image);
      if (!uploadedImageUrl && image) {
        notifications.show('Fehler beim hochladen des Bildes. Der Punkt wurde dennoch eingetragen', { severity: 'error' });
      }

      increasePointMutation.mutate({
        user,
        challenge: challenge.id,
        created_at,
        image_url: uploadedImageUrl
      }, {
        onSuccess: () => notifications.show('Success!', { severity: 'success' }),
        onError: (error) => {
          captureException(error);
          notifications.show(error.message, { severity: 'error' });
        }
      });
    },
    [challenge, notifications, user, increasePointMutation, uploadImage]);

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

        { isAuthorized("challenges.edit.own-stats") && !challenge?.automated && (
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