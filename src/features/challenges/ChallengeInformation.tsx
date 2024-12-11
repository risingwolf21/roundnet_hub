import {Alert, Divider, Fab, Grid, List, Typography} from '@mui/material';
import React, {useState} from 'react';
import {ChallengeRepository} from '../../repository/ChallengeRepository';
import {FullChallenge} from '../../types/supabaseTypes';
import {captureException} from '@sentry/react';
import {AlertMessage, AlertSnackbar} from '../../components/AlertSnackbar';
import {Box} from '@mui/system';
import {can} from '../../utils/PermissionService';
import EditIcon from '@mui/icons-material/Edit';
import {TFunction} from 'i18next';
import EnterPointDialog from './dialogs/EnterPointDialog';
import {ChallengeStatItem} from './components/ChallengeStatItem';
import Layout from '../../components/Layout';

type ChallengeInformationProps = {
  t: TFunction;
  challenge: FullChallenge;
  user: User | null;
};

export const ChallengeInformation = ({ t, challenge, user }: ChallengeInformationProps) => {
  const [alertInfo, setAlertInfo] = useState<AlertMessage | null>(null);
  const [open, setOpen] = useState(false);

  const increaseChallengePoint = () => {
    setOpen(false);
    if (!user) {
      setAlertInfo({ message: 'Something went wrong! Try again later', severity: 'error' });
      return;
    }
    ChallengeRepository.increasePointForUser(user.userId, challenge.id)
      .then((result) => {
        setAlertInfo({ message: 'Success!', severity: 'success' });
      })
      .catch((error) => {
        captureException(error);
        setAlertInfo({ message: error.message, severity: 'error' });
      });
  };

  return (
    <Layout appBarConfig={{ title: challenge.name, showBackButton: true, showProfile: true }}>
      <Grid container width="100%" spacing={3} justifyContent={'center'}>
        {challenge.stats.length >= 2 && (
          <Grid item xs sx={{ width: '33%', maxWidth: '150px' }}>
            <Grid>
              <Box sx={{ height: '50px', background: 'transparent' }}></Box>
              <Typography
                variant={'h5'}
                sx={{
                  height: '50px',
                  lineHeight: '50px',
                  justifyContent: 'center',
                  display: 'flex',
                  verticalAlign: 'bottom',
                }}
              >
                {challenge.stats[1].user.displayName.split(' ')[0]}
              </Typography>
              <Box
                sx={{
                  height: '100px',
                  background: 'silver',
                  fontSize: '26pt',
                  justifyContent: 'center',
                  display: 'flex',
                  borderRadius: '10px',
                }}
              >
                🥈
              </Box>
            </Grid>
          </Grid>
        )}
        {challenge.stats.length >= 1 && (
          <Grid item xs sx={{ width: '33%', maxWidth: '150px' }}>
            <Grid>
              <Typography
                variant={'h5'}
                sx={{
                  height: '50px',
                  lineHeight: '50px',
                  justifyContent: 'center',
                  display: 'flex',
                  verticalAlign: 'bottom',
                }}
              >
                {challenge.stats[0].user.displayName.split(' ')[0]}
              </Typography>
              <Box
                sx={{
                  height: '150px',
                  background: 'gold',
                  fontSize: '26pt',
                  justifyContent: 'center',
                  display: 'flex',
                  borderRadius: '10px',
                }}
              >
                🥇
              </Box>
            </Grid>
          </Grid>
        )}
        {challenge.stats.length >= 3 && (
          <Grid item xs sx={{ width: '33%', maxWidth: '150px' }}>
            <Grid>
              <Box sx={{ height: '100px', background: 'transparent' }}></Box>
              <Typography
                variant={'h5'}
                sx={{
                  height: '50px',
                  lineHeight: '50px',
                  justifyContent: 'center',
                  display: 'flex',
                  verticalAlign: 'bottom',
                }}
              >
                {challenge?.stats[2].user.displayName.split(' ')[0]}
              </Typography>
              <Box
                sx={{
                  height: '50px',
                  background: '#a08d51',
                  fontSize: '26pt',
                  justifyContent: 'center',
                  display: 'flex',
                  borderRadius: '10px',
                }}
              >
                🥉
              </Box>
            </Grid>
          </Grid>
        )}
      </Grid>

      <List sx={{ width: '100%' }}>
        <Divider />
        <Alert sx={{ m: 2 }} severity={'info'}>
          {challenge.description}
        </Alert>
        {challenge.automated && (
          <Alert sx={{ m: 2 }} severity={'info'}>
            {t('challenge.automatedChallenge')}
          </Alert>
        )}
        <Divider />
        {challenge.stats.map((x, index) => (
          <ChallengeStatItem challengeStatWithUser={x} index={index} />
        ))}
      </List>

      {can('update', 'challenge') && !challenge.automated && (
        <Fab
            sx={{
                background: '#66bb6a',
                position: 'fixed',
                right: '16px',
                bottom: 'calc(56px + env(safe-area-inset-bottom))',
                mb: '16px'
            }}
          onClick={() => {
            setOpen(true);
          }}
        >
          {<EditIcon sx={{ color: 'white' }} />}
        </Fab>
      )}

      <EnterPointDialog open={open} setOpen={setOpen} increaseChallengePoint={increaseChallengePoint} />

      <AlertSnackbar alertInfo={alertInfo} autoHideDuration={4000} close={() => setAlertInfo(null)} />
    </Layout>
  );
};
