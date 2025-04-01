import { AccountBox, Add, CameraAlt } from '@mui/icons-material';
import EditIcon from '@mui/icons-material/Edit';
import { Alert, Avatar, Box, Button, Card, CardActions, CardContent, CardMedia, Divider, Fab, List, Typography } from '@mui/material';
import { captureException } from '@sentry/react';
import { uuid } from '@supabase/supabase-js/dist/main/lib/helpers';
import { useNotifications } from '@toolpad/core/useNotifications';
import Compressor from 'compressorjs';
import { Dayjs } from 'dayjs';
import { TFunction } from 'i18next';
import { toNumber } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import { withTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Navigate, useParams } from 'react-router';
import { PullToRefresh } from 'src/components/pull-to-refresh/PullToRefresh';
import { supabase } from 'src/components/services/supabase/supabaseClient';
import { RootState, useAppDispatch } from 'src/redux/store';
import { ChallengeStatWithUser } from 'src/types/supabaseTypes';
import { dataURLtoFile, readFile } from 'src/utils';
import { AlertMessage, AlertSnackbar } from '../../components/AlertSnackbar';
import Layout from '../../components/Layout';
import { ChallengeRepository } from '../../repository/ChallengeRepository';
import { can } from '../../utils/PermissionService';
import { useApplication } from '../auth/AuthContext';
import { ChallengeStatItem } from './components/ChallengeStatItem';
import EnterPointDialog from './dialogs/EnterPointDialog';
import { challengeSelector, fetchChallengeStatsSingleAsync, onChallengeImageInserted } from './slices/challengeSlice';
import { useDialogs } from '@toolpad/core/useDialogs';
import { AppRolesDialog } from '../admin/dialogs/AppRolesDialog';
import { DisplayStoryDialog } from './dialogs/DisplayStoryDialog';


export const ChallengeInformation = ({ t }: { t: TFunction }) => {
  const { challengeId } = useParams();
  const challenge = useSelector((root: RootState) => challengeSelector.selectById(root, challengeId ?? 0));
  const { loading } = useSelector((root: RootState) => root.challenges);
  const { user } = useApplication();
  const dispatch = useAppDispatch();
  const [alertInfo, setAlertInfo] = useState<AlertMessage | null>(null);
  const [open, setOpen] = useState(false);
  const notifications = useNotifications();
  const dialogs = useDialogs();

  useEffect(() => {
    if (!challengeId || isNaN(+challengeId)) return;
    dispatch(fetchChallengeStatsSingleAsync({ challengeId: toNumber(challengeId) }));

  }, [dispatch, challengeId]);

  const challengeStatMap = useMemo(() => {

    const reduceChallengeStats = (acc: Map<string, ChallengeStatWithUser[]>, curr: ChallengeStatWithUser) => {
      let x = acc.get(curr.user.userId);
      if (x) {
        acc.set(curr.user.userId, [...x, curr]);
      } else {
        acc.set(curr.user.userId, [curr]);
      }
      return acc;
    };

    if (!challenge)
      return new Map<string, ChallengeStatWithUser[]>();
    return challenge.stats.reduce(reduceChallengeStats, new Map<string, ChallengeStatWithUser[]>())
  }, [challenge])

  if (!challenge || !user) return <Navigate to={'/challenges'} replace={true} />;

  const increaseChallengePoint = (created_at: Dayjs) => {
    setOpen(false);
    if (!user) {
      setAlertInfo({ message: 'Something went wrong! Try again later', severity: 'error' });
      return;
    }
    ChallengeRepository.increasePointForUser(user.userId, challenge.id, created_at)
      .then((result) => {
        setAlertInfo({ message: 'Success!', severity: 'success' });
      })
      .catch((error) => {
        captureException(error);
        setAlertInfo({ message: error.message, severity: 'error' });
      });
  };


  const onImageInputChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    if (!event.target.files || event.target.files.length === 0) return;

    let imageDataUrl = await readFile(event.target.files[0]);

    if (typeof imageDataUrl !== 'string') {
      notifications.show('Something went wrong uploading your image. Please try again.', { severity: "error" })
      return;
    }

    let fileName = uuid() + '.jpg';
    new Compressor(dataURLtoFile(imageDataUrl, fileName), {
      convertSize: 1000000, // 1 MB
      success: async (file) => {
        let compressedFile = await readFile(file);
        if (compressedFile && typeof compressedFile === 'string') {
          const { data: uploadData, error } = await supabase.storage
            .from('challenge')
            .upload(`${challenge.id}/${fileName}`, dataURLtoFile(compressedFile, fileName), {
              upsert: true,
            });
          if (uploadData?.path && !error) {
            const { data } = supabase.storage.from('challenge').getPublicUrl(uploadData.path);

            const { error } = await supabase.from('challenge_images').insert({
              user: user.userId,
              challenge: challenge.id,
              image_url: data.publicUrl
            });
            if (error) {
              supabase.storage.from('challenge').remove([uploadData.path]);
            } else {
              dispatch(onChallengeImageInserted({ image_url: data.publicUrl, challenge: challenge.id, user: user }))
            }
          } else {
            notifications.show('Something went wrong uploading your image. Please try again.', { severity: "error" })
          }
        } else {
          notifications.show('Something went wrong compressing your image. Please try again.', { severity: "error" })
        }
      },
    });
    event.target.files = null;
    event.target.value = '';
  };

  return (
    <Layout appBarConfig={{ title: challenge.name, showBackButton: true, showProfile: true }}>
      <PullToRefresh onRefresh={() => dispatch(fetchChallengeStatsSingleAsync({ challengeId: challenge.id }))}>
        <Box
          sx={{
            display: "flex",
            overflowX: "auto",
            gap: 2,
            padding: 1,
          }}
        ><Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: 'center',
          }}>
            <Button component="label" sx={{ borderRadius: 4, border: 'none', width: "100px", height: "100px", background: 'transparent' }}>
              <input accept="image/*" capture="user" type="file" hidden onChange={onImageInputChange} />
              <Avatar sx={{ borderRadius: 4, width: "100px", height: "100px" }}>
                {challenge.images.filter(y => y.user.userId === user.userId).length > 0 ? (
                  <img src={challenge.images.filter(y => y.user.userId === user.userId)[0].image_url} style={{ objectFit: "cover" }} alt="logo" width={'100%'} height={'100%'} />
                ) : (
                  user.avatarUrl
                    ? <img src={user.avatarUrl} alt="logo" width={'100%'} height={'100%'} />
                    : <AccountBox />
                )}
                <Add sx={(theme) => ({
                  backgroundColor: theme.palette.primary.main,
                  position: "absolute",
                  scale: 1.5,
                  marginRight: 0.7,
                  marginBottom: 0.7,
                  borderRadius: 2,
                  border: `5px solid white`,
                  bottom: 0,
                  right: 0
                })} />
              </Avatar>
            </Button>
            <Typography sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textALign: "center"
            }}>{user.displayName}</Typography>
          </Box>
          {
            challenge.fullGroup?.users.filter(x => x.user.userId !== user.userId).map(x => {
              const images = challenge.images.filter(y => y.user.userId === x.user.userId);
              return <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: 'center',
                }}>
                <Button
                  component="label"
                  sx={{
                    borderRadius: 4,
                    border: 'none',
                    display: "flex",
                    flexDirection: "column",
                    width: "100px",
                    height: "100px",
                    background: 'transparent'
                  }}
                  onClick={async () => {
                    if (images.length > 0)
                      await dialogs.open(DisplayStoryDialog, images[0].image_url)
                  }}>

                  <Avatar sx={{ borderRadius: 4, width: "100px", height: "100px" }}>

                    {
                      images.length > 0
                        ? <img src={images[0].image_url} alt="logo" width={'100%'} height={'100%'} />
                        : x.user.avatarUrl
                          ? <img src={x.user.avatarUrl} alt="logo" width={'100%'} height={'100%'} />
                          : <AccountBox />
                    }
                  </Avatar>
                </Button>
                <Typography sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  textALign: "center"
                }}>{x.user.displayName}</Typography>
              </Box>
            })
          }
        </Box>
        <List sx={{ width: '100%' }}>
          <Alert sx={{ m: 2 }} severity={'info'}>
            {challenge.description}
          </Alert>
          {challenge.automated && (
            <Alert sx={{ m: 2 }} severity={'info'}>
              {t('challenge.automatedChallenge')}
            </Alert>
          )}
          <Divider />
          {[...challengeStatMap.values()]
            .sort((a, b) => b.reduce((p, c) => p + c.count, 0) - a.reduce((p, c) => p + c.count, 0))
            .map((x, index) => (
              <ChallengeStatItem key={index} statsForUser={x} index={index} />
            ))}
        </List>

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
          dates={challenge.stats.filter(x => x.user.userId === user.userId).map(x => x.created_at)}
          increaseChallengePoint={(created_at: Dayjs) => increaseChallengePoint(created_at)} />

        <AlertSnackbar alertInfo={alertInfo} autoHideDuration={4000} close={() => setAlertInfo(null)} />
      </PullToRefresh>
    </Layout>
  );
};
export default withTranslation()(ChallengeInformation);