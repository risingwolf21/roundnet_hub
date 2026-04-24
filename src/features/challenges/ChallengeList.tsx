import { withProfiler } from '@sentry/react';
import { useDialogs, useNotifications } from '@toolpad/core';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { CreateOrUpdateChallengeDialog } from './dialogs/CreateOrUpdateChallengeDialog';

import { useInsertChallengeMutation } from '@/tanstack/challenge';
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

const ChallengeList = ({
  user,
  challenges,
  archived_challenges,
  isLoading,
  error,
}: {
  user: UserWithGroups;
  challenges: Challenge[];
  archived_challenges?: InfiniteData<{ data: Challenge[]; nextPage?: number }>;
  isLoading: boolean;
  error: Error | null;
}) => {
  const notifications = useNotifications();
  const navigate = useNavigate();
  const dialogs = useDialogs();
  const insertChallengeMutation = useInsertChallengeMutation();

  useEffect(() => {
    if (error) notifications.show(error.message, { severity: 'error' });
  }, [error, notifications]);

  if (isLoading) {
    return <LinearProgress sx={{ position: 'fixed', top: 56, left: 0, right: 0 }} />;
  }

  if (challenges.length <= 0 && (archived_challenges?.pages?.length ?? 0) <= 0) {
    return (
      <Box sx={{ alignItems: 'center', display: 'flex', flexDirection: 'column', pt: 10 }}>
        <Typography sx={{ fontSize: '30pt', fontWeight: 'bold' }}>🏅</Typography>
        <Typography sx={{ fontSize: '18pt', fontWeight: 'bold' }}>Keine Challenges gefunden</Typography>
      </Box>
    );
  }

  return (
    <List>
      {challenges.length > 0 && (
        <List
          sx={{ width: '100%' }}
          subheader={
            <ListSubheader
              sx={{
                fontWeight: 'bold',
                lineHeight: 'normal',
                my: 1,
                color: 'rgba(0,0,0,0.87)',
              }}
            >
              Aktive Challenges
            </ListSubheader>
          }
        >
          {challenges.map((entry: Challenge) => (
            <ListItem key={entry.id} divider onClick={() => navigate('/challenges/' + entry.id)}>
              <ListItemText primary={entry.name} secondary={entry.description} />
            </ListItem>
          ))}
        </List>
      )}
      {archived_challenges && archived_challenges.pages.flatMap((x) => x.data).length > 0 && (
        <List
          sx={{ width: '100%' }}
          subheader={
            <ListSubheader
              sx={{
                fontWeight: 'bold',
                lineHeight: 'normal',
                my: 1,
                color: 'rgba(0,0,0,0.87)',
              }}
            >
              Archivierte Challenges
            </ListSubheader>
          }
        >
          {archived_challenges.pages
            .flatMap((x) => x.data)
            .map((entry: Challenge) => (
              <ListItem key={entry.id} divider onClick={() => navigate('/challenges/' + entry.id)}>
                <ListItemText primary={entry.name} secondary={entry.description} />
              </ListItem>
            ))}
        </List>
      )}
      <Fab
        sx={{
          background: 'primary.light',
          position: 'fixed',
          right: '16px',
          bottom: 'calc(16px + env(safe-area-inset-bottom))',
        }}
        onClick={async () => {
          const result = await dialogs.open(CreateOrUpdateChallengeDialog, { user });
          if (result) {
            await insertChallengeMutation.mutateAsync(result, {
              onError: (error) =>
                notifications.show('Challenge konnte nicht erstellt werden. ' + error.message, { severity: 'error' }),
              onSuccess: (data) => {
                notifications.show('Challenge wurde erfolgreich erstellt.', { severity: 'success' });
                navigate('/challenges/' + data.id);
              },
            });
          }
        }}
      >
        <Add sx={{ color: 'white' }} />
      </Fab>
    </List>
  );
};

export default withProfiler(ChallengeList);
