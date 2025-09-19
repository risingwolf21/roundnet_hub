import Layout from '@/components/layout/Layout';
import { useCreateMatch, usePlayers, useTeams } from '@/tanstack/games';
import { GamesTable } from '@/types/supabaseTypes';
import { Delete, Save } from '@mui/icons-material';
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Fab,
  Grid2 as Grid,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import { captureException } from '@sentry/react';
import { useNotifications } from '@toolpad/core/useNotifications';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useApplication } from '../auth/ApplicationContext';

type Props = {
  options: SimpleUser[];
  loading: boolean;
  label: string;
  value: SimpleUser | null;
  onSelect: (value: SimpleUser | null) => void;
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
      onChange={(e, v) => onSelect(v)}
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

type SelectTeamProps = {
  options: GamesTable<'teams'>[];
  loading: boolean;
  label: string;
  onSelect: (value: GamesTable<'teams'> | null) => void;
};
const SelectTeam = ({ options, loading, label, onSelect }: SelectTeamProps) => {
  return (
    <Autocomplete
      disablePortal
      fullWidth
      loading={loading}
      options={options}
      getOptionLabel={(option) => option.name}
      onChange={(e, v) => onSelect(v)}
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
  const [player1a, setPlayer1a] = useState<SimpleUser | null>(null);
  const [player2a, setPlayer2a] = useState<SimpleUser | null>(null);
  const [player1b, setPlayer1b] = useState<SimpleUser | null>(null);
  const [player2b, setPlayer2b] = useState<SimpleUser | null>(null);

  const { data: players = [], error, isLoading, refetch } = usePlayers();
  const { data: teams = [], error: teamsError, isLoading: teamsLoading, refetch: teamsRefetch } = useTeams();

  const blocked1 = [player1a, player1b].filter(Boolean).map((u) => u!.userId);
  const blocked2 = [player2a, player2b].filter(Boolean).map((u) => u!.userId);

  useEffect(() => {
    if (error || teamsError)
      notifications.show(error?.message ?? teamsError?.message, {
        severity: 'error',
        actionText: 'Neu laden',
        onAction: () => {
          refetch();
          teamsRefetch();
        },
      });
  }, [error, teamsError, notifications, refetch]);

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
          player_2: player2a.userId,
        },
        team_b: {
          name: team_b_name,
          player_1: player1b.userId,
          player_2: player2b.userId,
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
          {/* <Grid size={6} sx={{ p: 2 }}>
            <SelectTeam
              label="Wähle ein Team"
              loading={isLoading}
              options={teams.filter(t => !blocked1.includes(t.player_1) && !blocked1.includes(t.player_2))}
              onSelect={(x) => {
                const p1a = players.find(y => y.player === x?.player_1);
                const p2a = players.find(y => y.player === x?.player_2);
                if (p1a && p2a) {
                  setPlayer1a({ userId: p1a.userId, name: p1a.name })
                  setPlayer2a({ userId: p2a.userId, name: p2a.name })
                }
              }}
            />
          </Grid>
          <Grid size={6} sx={{ p: 2 }}>
            <SelectTeam
              label="Wähle ein Team"
              loading={isLoading}
              options={teams.filter(t => !blocked2.includes(t.player_1) && !blocked2.includes(t.player_2))}
              onSelect={(x) => {
                const p1b = players.find(y => y.player === x?.player_1);
                const p2b = players.find(y => y.player === x?.player_2);
                if (p1b && p2b) {
                  setPlayer1b({ userId: p1b.userId, name: p1b.name })
                  setPlayer2b({ userId: p2b.userId, name: p2b.name })
                }
              }}
            />
          </Grid>
          <Grid size={12}>
            <Divider />
          </Grid> */}
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
                <Checkbox checked={rating_enabled} onChange={(e, v) => setRatingEnabled(v)} />
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
