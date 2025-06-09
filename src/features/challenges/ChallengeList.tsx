import { Add } from '@mui/icons-material';
import { Box, Fab, LinearProgress, List, ListItem, ListItemText, Typography } from '@mui/material';
import { withProfiler } from '@sentry/react';
import { useDialogs, useNotifications } from '@toolpad/core';
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { PullToRefresh } from 'src/components/pull-to-refresh/PullToRefresh';
import { useChallenges } from 'src/tanstack/challenge';
import Layout from '../../components/layout/Layout';
import { useAuthentication } from '../auth/AuthProvider';
import { CreateChallengeDialog } from './dialogs/CreateChallengeDialog';


const ChallengeList = () => {
  const notifications = useNotifications();
  const navigate = useNavigate();
  const dialogs = useDialogs();
  const { user } = useAuthentication();

  const { data: challenges = [], error, isLoading, refetch } = useChallenges();

  useEffect(() => {
    if (error)
      notifications.show(error.message, { severity: "error" })
  }, [error, notifications])

  return (
    <Layout>
      {isLoading && <LinearProgress sx={{ position: 'fixed', top: 56, left: 0, right: 0 }} />}
      <PullToRefresh onRefresh={() => refetch()}>
        {
          challenges.length > 0
            ? <List sx={{ width: '100%' }}>
              {challenges.map((entry: ChallengeWithFullGroup) => (
                <ListItem divider onClick={() => navigate('/challenges/' + entry.id)}>
                  <ListItemText primary={entry.name} secondary={entry.description} />
                </ListItem>
              ))}
            </List>
            : <Box sx={{ alignItems: 'center', display: 'flex', flexDirection: 'column', pt: 10 }}>
              <Typography sx={{ fontSize: '30pt', fontWeight: 'bold' }}>🏅</Typography>
              <Typography sx={{ fontSize: '18pt', fontWeight: 'bold' }}>Keine Challenges gefunden</Typography>
            </Box>
        }
      </PullToRefresh>
      <Fab
        sx={{
          background: 'primary.light',
          position: 'fixed',
          right: '16px',
          bottom: 'calc(16px + env(safe-area-inset-bottom))',
        }}
        onClick={async () => {
          await dialogs.open(CreateChallengeDialog, { user });
        }}
      >
        <Add sx={{ color: 'white' }} />
      </Fab>
    </Layout>
  );
};

export default withProfiler(ChallengeList);
