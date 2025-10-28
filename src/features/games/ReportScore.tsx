import Layout from '@/components/layout/Layout';
import { useCreateMatch, usePlayers } from '@/tanstack/games';
import { captureException } from '@sentry/react';
import { useNotifications } from '@toolpad/core/useNotifications';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useApplication } from '../auth/ApplicationContext';

import Delete from '@mui/icons-material/Delete';
import Save from '@mui/icons-material/Save';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import Fab from '@mui/material/Fab';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

type Props = {
  options: PlayerWithSimpleUser[];
  loading: boolean;
  label: string;
  value: PlayerWithSimpleUser | null;
  onSelect: (value: PlayerWithSimpleUser | null) => void;
};
const SelectPlayer = ({ options, loading, label, value, onSelect }: Props) => {
  return (
    <Autocomplete
      disablePortal
      fullWidth
      loading={loading}
      options={options}
      value={value}
      getOptionLabel={(option) => option.name}
      getOptionKey={(option) => option.userId}
      isOptionEqualToValue={(o, v) => o.userId === v.userId}
      onChange={(_e, v) => onSelect(v)}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          slotProps={{
            input: {
              ...params.InputProps,
              endAdornment: (
                <React.Fragment>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </React.Fragment>
              ),
            },
          }}
        />
      )}
    />
  );
};

const ReportScore = () => {
  const [sets, setSets] = useState<MatchSet[]>([
    { id: '', created_at: '', set_number: 1, match: '', team_a_score: 0, team_b_score: 0 },
  ]);
  const notifications = useNotifications();
  const navigate = useNavigate();
  const { user } = useApplication();

  const createMatch = useCreateMatch();

  const [rating_enabled, setRatingEnabled] = useState(true);
  const [player1a, setPlayer1a] = useState<PlayerWithSimpleUser | null>(null);
  const [player2a, setPlayer2a] = useState<PlayerWithSimpleUser | null>(null);
  const [player1b, setPlayer1b] = useState<PlayerWithSimpleUser | null>(null);
  const [player2b, setPlayer2b] = useState<PlayerWithSimpleUser | null>(null);

  const { data: players = [], error, isLoading, refetch } = usePlayers();

  useEffect(() => {
    if (error)
      notifications.show(error?.message, {
        severity: 'error',
        actionText: 'Neu laden',
        onAction: () => {
          refetch();
        },
      });
  }, [error, notifications, refetch]);

  const saveScores = () => {
    if (!player1a) {
      notifications.show('Player 1 of Team A not defined', { severity: 'error' });
      return;
    }
    if (!player2a) {
      notifications.show('Player 2 of Team A not defined', { severity: 'error' });
      return;
    }
    if (!player1b) {
      notifications.show('Player 1 of Team B not defined', { severity: 'error' });
      return;
    }
    if (!player2b) {
      notifications.show('Player 2 of Team B not defined', { severity: 'error' });
      return;
    }
    if (sets.length <= 0) {
      notifications.show('Need at least one recorded set of this match', { severity: 'error' });
      return;
    }
    for (const set of sets) {
      if (set.team_a_score === 0 && set.team_b_score === 0) {
        notifications.show(`Scores need in ${set.set_number} set`, { severity: 'error' });
        return;
      }
      if (set.team_a_score === set.team_b_score) {
        notifications.show(`Cannot have a draw in ${set.set_number} set`, { severity: 'error' });
        return;
      }
    }
    const [name1a, ...surname1a] = player1a.name.split(' ');
    const [name2a, ...surname2a] = player2a.name.split(' ');
    const [name1b, ...surname1b] = player1b.name.split(' ');
    const [name2b, ...surname2b] = player2b.name.split(' ');
    let team_a_name = (surname1a.pop() ?? name1a) + '/' + (surname2a.pop() ?? name2a);
    let team_b_name = (surname1b.pop() ?? name1b) + '/' + (surname2b.pop() ?? name2b);

    createMatch.mutate(
      {
        sets,
        team_a: {
          name: team_a_name,
          player_1: player1a.userId,
          player_1_rating: player1a.ka_index,
          player_2: player2a.userId,
          player_2_rating: player2a.ka_index,
        },
        team_b: {
          name: team_b_name,
          player_1: player1b.userId,
          player_1_rating: player1b.ka_index,
          player_2: player2b.userId,
          player_2_rating: player2b.ka_index,
        },
        rating_enabled: rating_enabled,
        created_by: user?.userId,
      },
      {
        onSuccess: () => navigate('/matches'),
        onError: (error) => {
          captureException(error);
          notifications.show(error.message, { severity: 'error' });
        },
      }
    );
  };

  return (
    <Layout>
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Grid container sx={{ maxWidth: 700 }}>
          <Grid size={6} sx={{ p: 2 }}>
            <Typography sx={{ fontWeight: 'bold' }}>Team A</Typography>
          </Grid>
          <Grid size={6} sx={{ p: 2 }}>
            <Typography sx={{ fontWeight: 'bold' }}>Team B</Typography>
          </Grid>
          <Grid size={6} sx={{ p: 2 }}>
            <SelectPlayer
              label="Player 1"
              loading={isLoading}
              value={player1a}
              options={players.filter(
                (x) =>
                  ![player1b, player2a, player2b]
                    .filter((x) => x)
                    .map((x) => x?.userId)
                    .includes(x.userId)
              )}
              onSelect={setPlayer1a}
            />
          </Grid>
          <Grid size={6} sx={{ p: 2 }}>
            <SelectPlayer
              label="Player 1"
              loading={isLoading}
              value={player1b}
              options={players.filter(
                (x) =>
                  ![player1a, player2a, player2b]
                    .filter((x) => x)
                    .map((x) => x?.userId)
                    .includes(x.userId)
              )}
              onSelect={setPlayer1b}
            />
          </Grid>
          <Grid size={6} sx={{ p: 2 }}>
            <SelectPlayer
              label="Player 2"
              loading={isLoading}
              value={player2a}
              options={players.filter(
                (x) =>
                  ![player1b, player1a, player2b]
                    .filter((x) => x)
                    .map((x) => x?.userId)
                    .includes(x.userId)
              )}
              onSelect={setPlayer2a}
            />
          </Grid>
          <Grid size={6} sx={{ p: 2 }}>
            <SelectPlayer
              label="Player 2"
              loading={isLoading}
              value={player2b}
              options={players.filter(
                (x) =>
                  ![player1b, player1a, player2a]
                    .filter((x) => x)
                    .map((x) => x?.userId)
                    .includes(x.userId)
              )}
              onSelect={setPlayer2b}
            />
          </Grid>
          <Grid size={12} sx={{ p: 2 }}>
            <Typography sx={{ fontWeight: 'bold' }}>Wertung</Typography>
          </Grid>
          <Grid size={12}>
            <ListItem>
              <ListItemAvatar>
                <Checkbox checked={rating_enabled} onChange={(_e, v) => setRatingEnabled(v)} />
              </ListItemAvatar>
              <ListItemText primary={'Soll das Spiel in die Index Wertung eingehen?'} />
            </ListItem>
          </Grid>
          <Grid size={12} sx={{ p: 2 }}>
            <Typography sx={{ fontWeight: 'bold' }}>Scores</Typography>
          </Grid>

          <List sx={{ width: '100%' }}>
            {sets.map((x) => (
              <ListItem divider disableGutters disablePadding>
                <>
                  <Grid size={5} sx={{ p: 2 }}>
                    <TextField
                      size="small"
                      type="number"
                      value={x.team_a_score.toString()}
                      onChange={(e) => {
                        setSets([
                          ...sets.filter((y) => y.set_number !== x.set_number),
                          { ...x, team_a_score: Number(e.target.value) },
                        ]);
                      }}
                      label={`Satz ${x.set_number} - Team A`}
                    />
                  </Grid>
                  <Grid size={5} sx={{ p: 2 }}>
                    <TextField
                      size="small"
                      type="number"
                      value={x.team_b_score.toString()}
                      onChange={(e) =>
                        setSets([
                          ...sets.filter((y) => y.set_number !== x.set_number),
                          { ...x, team_b_score: Number(e.target.value) },
                        ])
                      }
                      label={`Satz ${x.set_number} - Team B`}
                    />
                  </Grid>
                  <Grid size={2} sx={{ p: 2 }}>
                    <IconButton onClick={() => setSets([...sets.filter((y) => y.set_number !== x.set_number)])}>
                      <Delete />
                    </IconButton>
                  </Grid>
                </>
              </ListItem>
            ))}
          </List>
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
        </Grid>
        <Fab
          key={'addScore'}
          sx={{
            background: 'primary.light',
            color: 'primary.contrastLight',
            position: 'fixed',
            right: '16px',
            bottom: 'calc(16px + env(safe-area-inset-bottom))',
          }}
          onClick={saveScores}
        >
          <Save />
        </Fab>
      </Box>
    </Layout>
  );
};
export default ReportScore;
