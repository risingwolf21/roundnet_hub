import { customEnLocale } from '@/lib/date-fns';
import { useUpsertSetsToMatch } from '@/tanstack/games';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { captureException } from '@sentry/react';
import { DialogProps, NotificationsProvider, useNotifications } from '@toolpad/core';
import { useState } from 'react';

import Close from '@mui/icons-material/Close';
import Delete from '@mui/icons-material/Delete';
import AppBar from '@mui/material/AppBar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import TextField from '@mui/material/TextField';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';

type ReportSetsDialogProps = {
  matchId: string;
  team_a_name: string;
  team_b_name: string;
  sets: MatchSet[] | null;
};

const Content = ({ payload, onClose }: DialogProps<ReportSetsDialogProps, MatchSet[] | null>) => {
  const notifications = useNotifications();

  const [sets, setSets] = useState<MatchSet[]>(
    payload.sets ?? [{ id: '0', created_at: '', set_number: 1, match: '', team_a_score: 0, team_b_score: 0 }]
  );

  const upsertSetsToMatch = useUpsertSetsToMatch(payload.matchId);

  return (
    <>
      <AppBar sx={{ position: 'static', pt: 'env(safe-area-inset-top)' }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => onClose(null)}>
            <Close />
          </IconButton>
          <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
            Sätze eintragen
          </Typography>
          <Button
            color="inherit"
            onClick={async () => {
              upsertSetsToMatch.mutate(
                { sets },
                {
                  onSuccess: (result) => onClose(result),
                  onError: (error) => {
                    captureException(error);
                    notifications.show('Die Sätze konnten nicht gespeichert werden.', { severity: 'error' });
                  },
                }
              );
            }}
          >
            Speichern
          </Button>
        </Toolbar>
      </AppBar>
      <List sx={{ pl: 2, pr: 2, pb: 10, width: '100%' }}>
        <ListItem divider disableGutters disablePadding sx={{ width: '100%' }}>
          <>
            <Grid size={5} sx={{ p: 2 }}>
              <TextField
                size="small"
                fullWidth
                defaultValue={payload.team_a_name}
                value={payload.team_a_name}
                label={'Team A'}
                disabled
              />
            </Grid>
            <Grid size={5} sx={{ p: 2 }}>
              <TextField
                size="small"
                fullWidth
                defaultValue={payload.team_b_name}
                value={payload.team_b_name}
                label={'Team B'}
                disabled
              />
            </Grid>
            <Grid size={2} sx={{ p: 2 }}></Grid>
          </>
        </ListItem>
        {sets.map((x, index) => (
          <ListItem divider disableGutters disablePadding>
            <>
              <Grid size={5} sx={{ p: 2 }}>
                <TextField
                  size="small"
                  type="number"
                  fullWidth
                  value={x.team_a_score.toString()}
                  onChange={(e) =>
                    setSets(sets.map((y) => (y.id === x.id ? { ...x, team_a_score: Number(e.target.value) } : y)))
                  }
                  label={`Satz ${x.set_number} - Team A`}
                />
              </Grid>
              <Grid size={5} sx={{ p: 2 }}>
                <TextField
                  size="small"
                  type="number"
                  fullWidth
                  value={x.team_b_score.toString()}
                  onChange={(e) =>
                    setSets(sets.map((y) => (y.id === x.id ? { ...x, team_b_score: Number(e.target.value) } : y)))
                  }
                  label={`Satz ${x.set_number} - Team B`}
                />
              </Grid>
              <Grid size={2} sx={{ p: 2 }}>
                {index > 0 && (
                  <IconButton onClick={() => setSets([...sets.filter((y) => y.set_number !== x.set_number)])}>
                    <Delete />
                  </IconButton>
                )}
              </Grid>
            </>
          </ListItem>
        ))}
        <Grid size={12} sx={{ p: 2 }}>
          <Button
            onClick={() =>
              setSets([
                ...sets,
                {
                  id: (sets.length + 1).toString(),
                  created_at: '',
                  set_number: sets.length + 1,
                  match: '',
                  team_a_score: 0,
                  team_b_score: 0,
                },
              ])
            }
          >
            Neuen Satz erstellen
          </Button>
        </Grid>
      </List>
    </>
  );
};

export const ReportSetsDialog = ({ payload, open, onClose }: DialogProps<ReportSetsDialogProps, MatchSet[] | null>) => {
  return (
    <Dialog fullScreen open={open} onClose={() => onClose(null)}>
      <NotificationsProvider>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={customEnLocale}>
          <Content onClose={onClose} open={open} payload={payload} />
        </LocalizationProvider>
      </NotificationsProvider>
    </Dialog>
  );
};
