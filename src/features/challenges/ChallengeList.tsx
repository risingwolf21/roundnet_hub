import { withProfiler } from '@sentry/react';
import { useDialogs, useNotifications } from '@toolpad/core';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { CreateChallengeDialog } from './dialogs/CreateChallengeDialog';

import { queryClient } from '@/lib/queryClient';
import { UserWithGroups } from '@/types/supabaseTypes';
import Add from '@mui/icons-material/Add';
import Box from '@mui/material/Box';
import Fab from '@mui/material/Fab';
import LinearProgress from '@mui/material/LinearProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import Typography from '@mui/material/Typography';
import { InfiniteData } from '@tanstack/react-query';

const ChallengeList = ({ user, challenges, archived_challenges, isLoading, error }: { user: UserWithGroups, challenges: ChallengeWithFullGroup[], archived_challenges?: InfiniteData<{ data: ChallengeWithFullGroup[], nextPage?: number }>, isLoading: boolean, error: Error | null }) => {
  const notifications = useNotifications();
  const navigate = useNavigate();
  const dialogs = useDialogs();

  useEffect(() => {
    if (error) notifications.show(error.message, { severity: 'error' });
  }, [error, notifications]);

  if (isLoading) {
    return <LinearProgress sx={{ position: 'fixed', top: 56, left: 0, right: 0 }} />
  }

  if (challenges.length <= 0 && (archived_challenges?.pages?.length ?? 0) <= 0) {
    return <Box sx={{ alignItems: 'center', display: 'flex', flexDirection: 'column', pt: 10 }}>
      <Typography sx={{ fontSize: '30pt', fontWeight: 'bold' }}>🏅</Typography>
      <Typography sx={{ fontSize: '18pt', fontWeight: 'bold' }}>Keine Challenges gefunden</Typography>
    </Box>
  }


  return (
    <List>
      {
        challenges.length > 0 && (
          <List sx={{ width: '100%' }} subheader={<ListSubheader sx={{
            fontWeight: 'bold',
            lineHeight: 'normal',
            my: 1,
            color: 'rgba(0,0,0,0.87)',
          }}>Aktive Challenges</ListSubheader>}>
            {challenges.map((entry: ChallengeWithFullGroup) => (
              <ListItem divider onClick={() => navigate('/challenges/' + entry.id)}>
                <ListItemText primary={entry.name} secondary={entry.description} />
              </ListItem>
            ))}
          </List>
        )
      }
      {
        archived_challenges && archived_challenges.pages.flatMap((x) => x.data).length > 0 && (
          <List sx={{ width: '100%' }} subheader={<ListSubheader sx={{
            fontWeight: 'bold',
            lineHeight: 'normal',
            my: 1,
            color: 'rgba(0,0,0,0.87)',
          }}>Archivierte Challenges</ListSubheader>}>
            {archived_challenges.pages
              .flatMap((x) => x.data)
              .map((entry: ChallengeWithFullGroup) => (
                <ListItem divider onClick={() => navigate('/challenges/' + entry.id)}>
                  <ListItemText primary={entry.name} secondary={entry.description} />
                </ListItem>
              ))}
          </List>
        )
      }
      <Fab
        sx={{
          background: 'primary.light',
          position: 'fixed',
          right: '16px',
          bottom: 'calc(16px + env(safe-area-inset-bottom))',
        }}
        onClick={async () => {
          const result = await dialogs.open(CreateChallengeDialog, { user });
          if (result) {
            await queryClient.invalidateQueries({ queryKey: ["challenges"] });
            await queryClient.invalidateQueries({ queryKey: ["challenge", result.id] });
            navigate('/challenges/' + result.id);
          }
        }}
      >
        <Add sx={{ color: 'white' }} />
      </Fab>
    </List>
  );
};

export default withProfiler(ChallengeList);
