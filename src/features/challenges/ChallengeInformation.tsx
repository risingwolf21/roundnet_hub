import { AccountBox } from '@mui/icons-material';
import EditIcon from '@mui/icons-material/Edit';
import { Alert, Avatar, CardMedia, Fab, List, ListItem, ListItemAvatar, ListItemText, Stack, Tab, Tabs, Typography } from '@mui/material';
import { captureException } from '@sentry/react';
import { useNotifications } from '@toolpad/core/useNotifications';
import { Dayjs } from 'dayjs';
import { TFunction } from 'i18next';
import { groupBy } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import { withTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Navigate, useParams } from 'react-router';
import { PullToRefresh } from 'src/components/pull-to-refresh/PullToRefresh';
import { supabase } from 'src/components/services/supabase/supabaseClient';
import { RootState, useAppDispatch } from 'src/redux/store';
import { ChallengeStatWithUser } from 'src/types/supabaseTypes';
import { dataURLtoFile, formatDateFromDatabase } from 'src/utils';
import Layout from '../../components/Layout';
import { ChallengeRepository } from '../../repository/ChallengeRepository';
import { can } from '../../utils/PermissionService';
import { useApplication } from '../auth/AuthContext';
import { TabPanel } from '../events/dialogs/EventAttendanceDialog';
import { ChallengeStatItem } from './components/ChallengeStatItem';
import EnterPointDialog from './dialogs/EnterPointDialog';
import { challengeSelector, fetchChallengeStatsSingleAsync, onChallengeStatsInsert } from './slices/challengeSlice';

const ChallengeInformation = ({ t }: { t: TFunction }) => {
  const { challengeId } = useParams();
  const challenge = useSelector((root: RootState) => challengeSelector.selectById(root, challengeId ?? 0));
  const { user } = useApplication();
  const dispatch = useAppDispatch();
  const notifications = useNotifications();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (challengeId)
      dispatch(fetchChallengeStatsSingleAsync({ challengeId: challengeId }));

  }, [dispatch, challengeId]);

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

  if (!challenge || !user) return <Navigate to={'/challenges'} replace={true} />;

  const uploadImage = async (image: { dataUrl: string, fileName: string } | null) => {
    if (!image) return null;
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
    if (!user) {
      notifications.show('Something went wrong! Try again later', { severity: 'error' });
      return;
    }

    const uploadedImageUrl = await uploadImage(image);
    if (uploadedImageUrl) {
      notifications.show('Fehler beim hochladen des Bildes. Der Punkt wurde dennoch eingetragen', { severity: 'error' });
    }
    ChallengeRepository.increasePointForUser(user.userId, challenge.id, created_at, uploadedImageUrl)
      .then((result) => {
        if (result.data) {
          dispatch(onChallengeStatsInsert({ ...result.data, user: user.userId, fullUser: user as User }))
          notifications.show('Success!', { severity: 'success' });
        }
      })
      .catch((error) => {
        captureException(error);
        notifications.show(error.message, { severity: 'error' });
      });
  };

  return (
    <Layout appBarConfig={{ title: challenge.name, navigateBackPath: "/challenges", showProfile: true }}>
      <PullToRefresh onRefresh={() => dispatch(fetchChallengeStatsSingleAsync({ challengeId: challenge.id }))}>
        <Alert sx={{ m: 2 }} severity={'info'}>
          {challenge.description}
        </Alert>
        {challenge.automated && (
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
              Object.entries(groupBy(challenge.stats, (a) => formatDateFromDatabase(a.created_at).toDateString()))
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
        {can('update', 'challenge') && !challenge.automated && (
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

        <EnterPointDialog
          open={open}
          setOpen={setOpen}
          maxEntriesPerWeek={challenge.max_points_per_week}
          dates={challenge.stats.filter(x => x.fullUser.userId === user.userId).map(x => x.created_at)}
          increaseChallengePoint={(created_at: Dayjs, image: { dataUrl: string, fileName: string } | null) => increaseChallengePoint(created_at, image)} />

      </PullToRefresh>
    </Layout >
  );
};
export default withTranslation()(ChallengeInformation);