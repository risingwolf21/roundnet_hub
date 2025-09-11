import { Add } from '@mui/icons-material';
import { Box, Fab, LinearProgress, List, ListItem, ListItemText, ListSubheader, Typography } from '@mui/material';
import { withProfiler } from '@sentry/react';
import { useDialogs, useNotifications } from '@toolpad/core';
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { PullToRefresh } from 'src/components/pull-to-refresh/PullToRefresh';
import { useArchivedChallenges, useChallenges } from 'src/tanstack/challenge';
import Layout from '../../components/layout/Layout';
import { useGrants } from '../auth/GrantsContext';
import { CreateChallengeDialog } from './dialogs/CreateChallengeDialog';


const ChallengeList = () => {
  const notifications = useNotifications();
  const navigate = useNavigate();
  const dialogs = useDialogs();
  const { user } = useGrants();

  const { data: challenges = [], error, isLoading, refetch } = useChallenges();
  const { data: archived_challenges, refetch: archiveRefetch } = useArchivedChallenges();

  useEffect(() => {
    if (error)
      notifications.show(error.message, { severity: "error" })
  }, [error, notifications])

  return (
    <Layout>
      {isLoading && <LinearProgress sx={{ position: 'fixed', top: 56, left: 0, right: 0 }} />}
      <PullToRefresh onRefresh={() => {
        refetch();
        archiveRefetch();
      }}>
        {
          challenges.length === 0 && archived_challenges?.pages.length === 0 && <Box sx={{ alignItems: 'center', display: 'flex', flexDirection: 'column', pt: 10 }}>
            <Typography sx={{ fontSize: '30pt', fontWeight: 'bold' }}>🏅</Typography>
            <Typography sx={{ fontSize: '18pt', fontWeight: 'bold' }}>Keine Challenges gefunden</Typography>
          </Box>
        }
        {
          challenges.length > 0
          && <List sx={{ width: '100%' }} subheader={<ListSubheader>Aktive Challenges</ListSubheader>}>
            {challenges.map((entry: ChallengeWithFullGroup) => (
              <ListItem divider onClick={() => navigate('/challenges/' + entry.id)}>
                <ListItemText primary={entry.name} secondary={entry.description} />
              </ListItem>
            ))}
          </List>
        }
        {
          archived_challenges && archived_challenges.pages.length > 0
          && <List sx={{ width: '100%' }} subheader={<ListSubheader>Archivierte Challenges</ListSubheader>}>
            {archived_challenges.pages.flatMap(x => x.data).map((entry: ChallengeWithFullGroup) => (
              <ListItem divider onClick={() => navigate('/challenges/' + entry.id)}>
                <ListItemText primary={entry.name} secondary={entry.description} />
              </ListItem>
            ))}
          </List>
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
