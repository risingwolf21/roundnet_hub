import { AccountBox } from '@mui/icons-material';
import EditIcon from '@mui/icons-material/Edit';
import { Alert, Avatar, Box, CardMedia, Fab, List, ListItem, ListItemAvatar, ListItemText, Stack, Tab, Tabs, Typography } from '@mui/material';
import { captureException, withProfiler } from '@sentry/react';
import { useQuery } from '@tanstack/react-query';
import { useNotifications } from '@toolpad/core/useNotifications';
import { Dayjs } from 'dayjs';
import { TFunction } from 'i18next';
import { groupBy } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import { withTranslation } from 'react-i18next';
import { Navigate, useParams } from 'react-router';
import { queryClient } from 'src/App';
import { PullToRefresh } from 'src/components/pull-to-refresh/PullToRefresh';
import { supabase } from 'src/components/services/supabase/supabaseClient';
import { ChallengeStatWithUser, FullChallenge } from 'src/types/supabaseTypes';
import { dataURLtoFile, formatDateFromDatabase } from 'src/utils';
import Layout from '../../components/Layout';
import { ChallengeRepository } from '../../repository/ChallengeRepository';
import { can } from '../../utils/PermissionService';
import { useAuthentication } from '../auth/AuthContext';
import { TabPanel } from '../events/dialogs/EventAttendanceDialog';
import { ChallengeStatItem } from './components/ChallengeStatItem';
import EnterPointDialog from './dialogs/EnterPointDialog';

const ChallengeInformation = ({ t }: { t: TFunction }) => {
  const { challengeId } = useParams();
  const { user } = useAuthentication();
  const notifications = useNotifications();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(0);

  const { data: challenge, isLoading, refetch } = useQuery<FullChallenge | null>({
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

  const challengeStatMap = useMemo(() => {
    const reduceChallengeStats = (acc: Map<string, { stats: ChallengeStatWithUser[], points: number }>, curr: ChallengeStatWithUser) => {
      let x = acc.get(curr.fullUser.userId);
      if (x) {
        acc.set(curr.fullUser.userId, { stats: [...x.stats, curr], points: x.stats.reduce((a, b) => a + b.count, 0) + x.points });
      } else {
        acc.set(curr.fullUser.userId, { stats: [curr], points: curr.count });
      }
      return acc;
    };

    if (!challenge)
      return new Map<string, { stats: ChallengeStatWithUser[], points: number }>();
    return challenge.stats.reduce(reduceChallengeStats, new Map<string, { stats: ChallengeStatWithUser[], points: number }>())
  }, [challenge])

  const uploadImage = async (image: { dataUrl: string, fileName: string } | null) => {
    if (!image || !challenge) return null;
    const { data: uploadData, error } = await supabase.storage
      .from('challenge')
      .upload(`${challenge.id}/${image.fileName}`, dataURLtoFile(image.dataUrl, image.fileName), {
        upsert: true,
      })
    if (uploadData?.path && !error) {
      const path = uploadData.path;
      const { data } = supabase.storage.from('challenge').getPublicUrl(path);
      if (error) {
        supabase.storage.from('challenge').remove([path]);
        return null;
      } else {
        return data.publicUrl;
      }
    } else {
      return null;
    }
  }

  const increaseChallengePoint = async (created_at: Dayjs, image: { dataUrl: string, fileName: string } | null) => {
    setOpen(false);
    if (!user || !challenge) {
      notifications.show('Something went wrong! Try again later', { severity: 'error' });
      return;
    }

    const uploadedImageUrl = await uploadImage(image);
    if (!uploadedImageUrl && image) {
      notifications.show('Fehler beim hochladen des Bildes. Der Punkt wurde dennoch eingetragen', { severity: 'error' });
    }
    ChallengeRepository.increasePointForUser(user.userId, challenge.id, created_at, uploadedImageUrl)
      .then((result) => {
        if (result.data) {
          refetch();
          notifications.show('Success!', { severity: 'success' });
        }
      })
      .catch((error) => {
        captureException(error);
        notifications.show(error.message, { severity: 'error' });
      });
  };

  if (!challenge && !isLoading) {
    return <Navigate to="/challenges/list" />
  }

  return (
    <Layout appBarConfig={{ title: challenge?.name, navigateBackPath: "/challenges/list", showProfile: true }}>
      {
        isLoading
          ? <Box sx={{ alignItems: 'center', display: 'flex', flexDirection: 'column', pt: 10 }}>
            <Typography sx={{ fontSize: '30pt', fontWeight: 'bold' }}>⌛</Typography>
            <Typography sx={{ fontSize: '18pt', fontWeight: 'bold' }}>Challenge wird geladen...</Typography>
          </Box>
          : <PullToRefresh onRefresh={() => refetch()}>
            <Alert sx={{ m: 2 }} severity={'info'}>
              {challenge?.description}
            </Alert>
            {challenge?.automated && (
              <Alert sx={{ m: 2 }} severity={'info'}>
                {t('challenge.automatedChallenge')}
              </Alert>
            )}
            <Tabs value={value} onChange={(e, v) => setValue(v)} indicatorColor="primary" textColor="inherit" variant="fullWidth">
              <Tab label="Aktivität" />
              <Tab label="Leaderboard" />
            </Tabs>
            <TabPanel value={value} index={0}>
              <Stack spacing={1} direction={"column"} sx={{ m: 1, mb: 12 }}>
                {
                  Object.entries(groupBy(challenge?.stats ?? [], (a) => formatDateFromDatabase(a.created_at).toDateString()))
                    .sort(([key_a], [key_b]) => new Date(key_b) > new Date(key_a) ? 1 : -1)
                    .map(([key, value]) => <Stack spacing={1} direction={"column"} key={key}>
                      <Typography sx={{ textAlign: "center", color: 'rgba(0,0,0,0.6)', }}>{key}</Typography>
                      <List>
                        {
                          value.map(x => <ListItem divider sx={{ display: "flex", p: 0, mr: 4 }} key={x.id}>
                            <ListItemAvatar>
                              <Avatar sx={{ borderRadius: 2 }}>
                                {x.fullUser.avatarUrl ? (
                                  <img src={x.fullUser.avatarUrl} alt="logo" width={'100%'} height={'100%'} />
                                ) : (
                                  <AccountBox />
                                )}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText primary={"+1"} secondary={x.fullUser.displayName} />
                            {
                              x.image_url &&
                              <CardMedia
                                component="img"
                                sx={{ width: "100%", maxWidth: "50%", maxHeight: "250px" }}
                                image={x.image_url}
                                alt="Challengestat images"
                              />
                            }
                          </ListItem>)
                        }
                      </List>
                    </Stack>)
                }
              </Stack>
            </TabPanel>
            <TabPanel value={value} index={1}>
              <List sx={{ width: '100%' }}>
                {[...challengeStatMap.values()]
                  .sort((a, b) => b.points > a.points ? 1 : -1)
                  .map((x, index) => (
                    <ChallengeStatItem
                      key={index}
                      statsForUser={x.stats}
                      index={[...new Set([...challengeStatMap.values()].map(x => x.points))].sort((a, b) => b > a ? 1 : -1).indexOf(x.points)} />
                  ))}
              </List>
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
                onClick={() => {
                  setOpen(true);
                }}
              >
                {<EditIcon sx={{ color: 'white' }} />}
              </Fab>
            )}

            {
              challenge && <EnterPointDialog
                open={open}
                setOpen={setOpen}
                maxEntriesPerWeek={challenge.max_points_per_week}
                dates={challenge.stats.filter(x => x.fullUser.userId === user.userId).map(x => x.created_at)}
                increaseChallengePoint={(created_at: Dayjs, image: { dataUrl: string, fileName: string } | null) => increaseChallengePoint(created_at, image)} />

            }
          </PullToRefresh>
      }

    </Layout >
  );
};
export default withProfiler(withTranslation()(ChallengeInformation));