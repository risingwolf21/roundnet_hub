import { PullToRefresh } from '@/components/pull-to-refresh/PullToRefresh';
import { Has } from '@/hooks/useGrants';
import { queryClient } from '@/lib/queryClient';
import {
  challengeKeys,
  useChallenge,
  useChallengeLeaderboard,
  useChallengeStatsForUser,
  useIncreasePointForUserMutation,
  useUpdateChallengeMutation,
} from '@/tanstack/challenge';
import { captureException, withProfiler } from '@sentry/react';
import { useDialogs, useNotifications } from '@toolpad/core';
import { TFunction } from 'i18next';
import { useCallback, useState } from 'react';
import { withTranslation } from 'react-i18next';
import { Navigate, useParams } from 'react-router';
import Layout from '../../components/layout/Layout';
import { useGrants } from '../auth/GrantsContext';
import { TabPanel } from '../events/dialogs/EventAttendanceDialog';
import { ChallengeActivityList } from './ChallengeActivityList';
import { ChallengeLeaderboard } from './ChallengeLeaderboard';
import EnterPointDialog from './dialogs/EnterPointDialog';

import AddIcon from '@mui/icons-material/Add';
import Edit from '@mui/icons-material/Edit';
import MoreVert from '@mui/icons-material/MoreVert';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Fab from '@mui/material/Fab';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { CreateOrUpdateChallengeDialog } from './dialogs/CreateOrUpdateChallengeDialog';

const ChallengeInformationProvider = ({ t }: { t: TFunction }) => {
  const { challengeId } = useParams();

  if (!challengeId) return <Navigate to="/challenges/list" />;

  return <ChallengeInformation t={t} challengeId={challengeId} />;
};

const ChallengeInformation = ({ t, challengeId }: { t: TFunction; challengeId: string }) => {
  const { user } = useGrants();
  const dialogs = useDialogs();
  const theme = useTheme();
  const notifications = useNotifications();
  const [value, setValue] = useState(0);
  const [anchorEl, setAnchorEl] = useState<(EventTarget & HTMLButtonElement) | null>(null);

  const { data: challenge = null, isLoading } = useChallenge(challengeId);
  const { data: leaderboard = [], isLoading: isLeaderboardLoading } = useChallengeLeaderboard(challengeId);
  const { data: user_challenge_stats = [] } = useChallengeStatsForUser(challengeId, user);

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: challengeKeys.challengeInformation(challengeId) });
  };

  const increasePointMutation = useIncreasePointForUserMutation(challengeId);
  const updateChallengeMutation = useUpdateChallengeMutation();

  const increaseChallengePoint = useCallback(
    async (
      created_at: Date,
      image: { dataUrl: string; fileName: string } | null,
      count: number,
      comment?: string,
      category?: string
    ) => {
      if (!user || !challenge) {
        notifications.show('Something went wrong! Try again later', { severity: 'error' });
        return;
      }

      increasePointMutation.mutate(
        {
          user,
          challenge: challenge.id,
          created_at,
          image,
          count,
          comment,
          category,
        },
        {
          onSuccess: (data) => {
            let message = 'Punkt erfolgreich hinzugefügt';
            if (data.imageFailedToUpload) {
              message += '. Das Bild konnte leider nicht gespeichert werden.';
            }
            notifications.show(message, { severity: 'success' });
          },
          onError: (error) => {
            captureException(error);
            notifications.show(error.message, { severity: 'error' });
          },
        }
      );
    },
    [challenge, notifications, user, increasePointMutation]
  );

  if (isLoading) {
    return (
      <Box sx={{ alignItems: 'center', display: 'flex', flexDirection: 'column', pt: 10 }}>
        <Typography sx={{ fontSize: '30pt', fontWeight: 'bold' }}>⌛</Typography>
        <Typography sx={{ fontSize: '18pt', fontWeight: 'bold' }}>Challenge wird geladen...</Typography>
      </Box>
    );
  }

  return (
    <Layout
      appBarConfig={{ title: challenge?.name, navigateBackPath: '/challenges/list', showProfile: true }}
      appBarActions={
        <Has perm={['challenge.manage']} any>
          <>
            <IconButton sx={{ color: 'primary.contrastText', pr: 0 }} onClick={(e) => setAnchorEl(e.currentTarget)}>
              <MoreVert />
            </IconButton>
            <Menu
              id="simple-menu"
              anchorEl={anchorEl}
              keepMounted
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
            >
              <Has perm={'challenge.manage'}>
                <MenuItem
                  disabled={isLoading}
                  onClick={async () => {
                    setAnchorEl(null);
                    const result = await dialogs.open(CreateOrUpdateChallengeDialog, { user, challenge });
                    console.log(result);
                    if (result) {
                      await updateChallengeMutation.mutateAsync(
                        { challenge: result },
                        {
                          onError: (error) =>
                            notifications.show('Challenge konnte nicht aktualisiert werden. ' + error.message, {
                              severity: 'error',
                            }),
                          onSuccess: () =>
                            notifications.show('Challenge wurde erfolgreich aktualisiert.', { severity: 'success' }),
                        }
                      );
                    }
                  }}
                >
                  <ListItemIcon>
                    <Edit />
                  </ListItemIcon>
                  <ListItemText primary={t('challenges.edit')} />
                </MenuItem>
              </Has>
            </Menu>
          </>
        </Has>
      }
    >
      <PullToRefresh onRefresh={() => refetch()}>
        <Alert sx={{ m: 2 }} severity={'info'}>
          {challenge?.description}
        </Alert>
        {challenge?.automated && (
          <Alert sx={{ m: 2 }} severity={'info'}>
            {isLoading ? 'Challenge wird geladen...' : t('challenge.automatedChallenge')}
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
        <TabPanel value={value} index={0} dir={theme.direction}>
          {challenge && <ChallengeActivityList challenge={challenge} />}
        </TabPanel>
        <TabPanel value={value} index={1} dir={theme.direction}>
          <ChallengeLeaderboard isLoading={isLeaderboardLoading} challenge_points={leaderboard} />
        </TabPanel>
        <Has perm={'challenges.stats.write'}>
          {!challenge?.automated && (
            <Fab
              sx={{
                background: 'primary.light',
                position: 'fixed',
                right: '16px',
                bottom: 'calc(16px + env(safe-area-inset-bottom))',
                mb: '16px',
              }}
              onClick={async () => {
                if (challenge) {
                  const result = await dialogs.open(EnterPointDialog, {
                    dates: user_challenge_stats.map((x) => x.created_at),
                    maxEntriesPerWeek: challenge.max_points_per_week,
                    maxEntriesPerDay: challenge.max_points_per_day,
                    comments_enabled: challenge.comments_enabled,
                    category_enabled: challenge.category_enabled,
                    category_options: challenge.category_options
                  });

                  if (result)
                    increaseChallengePoint(result.date, result.image, result.count, result.comment, result.category);
                }
              }}
            >
              <AddIcon sx={{ color: 'white' }} />
            </Fab>
          )}
        </Has>
      </PullToRefresh>
    </Layout>
  );
};

export default withProfiler(withTranslation()(ChallengeInformationProvider));
