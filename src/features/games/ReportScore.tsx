import Layout from '@/components/layout/Layout';
import { useCreateMatch, usePlayers } from '@/tanstack/games';
import { useNotifications } from '@toolpad/core/useNotifications';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { v4 as uuid, v4 } from 'uuid';
import { useApplication } from '../auth/ApplicationContext';

import NumberField from '@/components/mui/NumberField';
import { SearchIconWrapper, Search as SearchWrapper, StyledInputBase } from '@/components/SearchBar';
import { Has } from '@/hooks/useGrants';
import { formatDateToDatabase } from '@/utils';
import AccountBox from '@mui/icons-material/AccountBox';
import Add from '@mui/icons-material/Add';
import Close from '@mui/icons-material/Close';
import Delete from '@mui/icons-material/Delete';
import Save from '@mui/icons-material/Save';
import { default as SearchIcon } from '@mui/icons-material/Search';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import Fab from '@mui/material/Fab';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Stack from '@mui/system/Stack';
import { captureException } from '@sentry/react';
import { DialogProps, useDialogs } from '@toolpad/core';
import { t } from 'i18next';

type Props = {
  options: (Player | PlayerWithSimpleUser)[];
  selected: PlayerWithSimpleUser[];
  loading: boolean;
  label: string;
  value: PlayerSelection;
  disabled: boolean;
  onSelect: (value: PlayerSelection) => void;
  onRemove?: () => void;
};
const SelectPlayer = ({ options, selected, loading, label, value, disabled, onSelect, onRemove }: Props) => {
  const dialogs = useDialogs();

  const displayName = value && 'name' in value ? value.name : value?.display_name ?? 'Unknown';
  const avatarUrl = value && 'avatarUrl' in value ? value?.avatarUrl ?? value?.rg_avatar_url ?? '' : '';
  const isGuest = value && value.linked_user_id === null;

  return (
    <Card sx={{ borderRadius: 1, p: 0, '.MuiListItemSecondaryAction-root': { right: "8px" } }}>
      <ListItem
        disablePadding
        sx={{ p: 1 }}
        secondaryAction={onRemove && <IconButton sx={{ mr: 0 }} edge="end" onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}>
          <Close />
        </IconButton>}>
        <ListItemButton
          disabled={disabled}
          sx={{ p: 0 }}
          onClick={async () => {
            const result = await dialogs.open(SelectPlayerDialog, {
              options: options,
              selectedPlayers: selected,
            });
            if (result) {
              onSelect(result);
            }
          }}>
          <ListItemAvatar sx={(theme) => ({
            [theme.breakpoints.down('xs')]: {
              display: 'none',
            },
          })}>
            <Avatar sx={{ borderRadius: 2 }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="logo" width={'100%'} height={'100%'} />
              ) : (
                loading ? <CircularProgress size={24} /> : <AccountBox />
              )}
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={loading ? "Wird geladen..." : displayName ?? 'Nicht gewählt'}
            secondary={isGuest ? 'Gastspieler' : value?.rg_id ?? label} slotProps={{
              primary: {
                whiteSpace: 'nowrap',
                overflow: 'clip',
                textOverflow: 'ellipsis',
              },
              secondary: {
                whiteSpace: 'nowrap',
                overflow: 'clip',
                textOverflow: 'ellipsis',
              },
            }} />

        </ListItemButton>
      </ListItem>
    </Card>
  );
};

// Unser State akzeptiert nun beides
type PlayerSelection = PlayerWithSimpleUser | Player | null;

const ReportScore = () => {
  const [sets, setSets] = useState<MatchSet[]>([
    { id: '', created_at: '', set_number: 1, match: '', team_a_score: 0, team_b_score: 0 },
  ]);
  const notifications = useNotifications();
  const navigate = useNavigate();
  const { user } = useApplication();

  const createMatch = useCreateMatch();

  const [rating_enabled, setRatingEnabled] = useState(true);
  const [is_public, setIsPublic] = useState(true);
  const [player1a, setPlayer1a] = useState<PlayerSelection>(null);
  const [player2a, setPlayer2a] = useState<PlayerSelection>(null);
  const [player1b, setPlayer1b] = useState<PlayerSelection>(null);
  const [player2b, setPlayer2b] = useState<PlayerSelection>(null);

  const { data, error, isLoading, refetch } = usePlayers(user);

  if (data?.me && !player1a) {
    setPlayer1a(data.me);
  }

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
    const resolveInfo = (p: Player | PlayerWithSimpleUser) => {
      if ('name' in p) {
        return {
          id: p.id,
          name: p.name,
          rating: p.ka_index
        };
      }
      return {
        id: p.player,
        name: p.display_name || 'Unbekannt',
        rating: p.ka_index
      };
    };

    const p1a = resolveInfo(player1a);
    const p2a = resolveInfo(player2a);
    const p1b = resolveInfo(player1b);
    const p2b = resolveInfo(player2b);

    const getLastName = (fullName: string) => {
      const parts = fullName.trim().split(' ');
      return parts.pop() || fullName;
    };

    const team_a_name = `${getLastName(p1a.name)}/${getLastName(p2a.name)}`;
    const team_b_name = `${getLastName(p1b.name)}/${getLastName(p2b.name)}`;

    const playerNamesMapping: { [key: string]: string } = {};
    [p1a, p2a, p1b, p2b].forEach(p => {
      playerNamesMapping[p.id] = p.name;
    });

    createMatch.mutate(
      {
        sets,
        team_a: {
          name: team_a_name,
          player_1: p1a.id,
          player_1_rating: p1a.rating,
          player_2: p2a.id,
          player_2_rating: p2a.rating,
        },
        team_b: {
          name: team_b_name,
          player_1: p1b.id,
          player_1_rating: p1b.rating,
          player_2: p2b.id,
          player_2_rating: p2b.rating,
        },
        rating_enabled: rating_enabled,
        is_public: is_public,
        created_by: user?.id,
        playerNamesMapping,
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
          <Grid size={6} sx={{ p: 1 }}>
            <SelectPlayer
              options={(data?.players ?? [])}
              selected={[player1a, player2a, player2b, player1b].filter((x): x is PlayerWithSimpleUser => x !== null)}
              loading={isLoading}
              label={'Player 1'}
              value={player1a}
              disabled={data?.me ? true : false}
              onSelect={(value) => setPlayer1a(value)}
            />
          </Grid>
          <Grid size={6} sx={{ p: 1 }}>
            <SelectPlayer
              options={(data?.players ?? [])}
              selected={[player1a, player2a, player2b, player1b].filter((x): x is PlayerWithSimpleUser => x !== null)}
              loading={isLoading}
              label={'Player 1'}
              value={player1b}
              disabled={false}
              onSelect={(value) => setPlayer1b(value)}
              {...(player1b && { onRemove: () => setPlayer1b(null) })}
            />
          </Grid>
          <Grid size={6} sx={{ p: 1 }}>
            <SelectPlayer
              options={(data?.players ?? [])}
              selected={[player1a, player2a, player2b, player1b].filter((x): x is PlayerWithSimpleUser => x !== null)}
              loading={isLoading}
              label={'Player 2'}
              value={player2a}
              disabled={false}
              onSelect={(value) => setPlayer2a(value)}
              {...(player2a && { onRemove: () => setPlayer2a(null) })}
            />
          </Grid>
          <Grid size={6} sx={{ p: 1 }}>
            <SelectPlayer
              options={(data?.players ?? [])}
              selected={[player1a, player2a, player2b, player1b].filter((x): x is PlayerWithSimpleUser => x !== null)}
              loading={isLoading}
              label={'Player 2'}
              value={player2b}
              disabled={false}
              onSelect={(value) => setPlayer2b(value)}
              {...(player2b && { onRemove: () => setPlayer2b(null) })}
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
            <Typography sx={{ fontWeight: 'bold' }}>Sichtbarkeit</Typography>
          </Grid>
          <Grid size={12}>
            <ListItem>
              <ListItemAvatar>
                <Checkbox checked={is_public} onChange={(_e, v) => setIsPublic(v)} />
              </ListItemAvatar>
              <ListItemText primary={'Soll das Spiel öffentlich sichtbar sein?'} />
            </ListItem>
          </Grid>
          <Grid size={12} sx={{ p: 2 }}>
            <Typography sx={{ fontWeight: 'bold' }}>Scores</Typography>
          </Grid>

          <List sx={{ width: '100%' }}>
            {sets.map((x) => (
              <ListItem key={x.id} divider disableGutters disablePadding>
                <>
                  <Grid size={5} sx={{ p: 2 }}>
                    <TextField
                      size="small"
                      type="number"
                      value={x.team_a_score.toString()}
                      onChange={(e) => {
                        setSets([
                          ...sets.map((y) => y.set_number !== x.set_number ? y : { ...x, team_a_score: Number(e.target.value) }),
                        ])
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
                          ...sets.map((y) => y.set_number !== x.set_number ? y : { ...x, team_b_score: Number(e.target.value) }),
                        ])
                      }
                      label={`Satz ${x.set_number} - Team B`}
                    />
                  </Grid>
                  <Grid size={2} sx={{ p: 2 }}>
                    <IconButton onClick={() => setSets([
                      ...sets
                        .filter((y) => y.set_number !== x.set_number)
                        .map((y, i) => ({ ...y, set_number: i + 1 }))
                    ])}>
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
                    id: uuid(),
                    created_at: formatDateToDatabase(new Date()),
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


const SelectPlayerDialog = ({ open, onClose, payload }: DialogProps<{ options: (Player | PlayerWithSimpleUser)[], selectedPlayers: PlayerWithSimpleUser[] }, PlayerSelection>) => {

  const [searchString, setSearchString] = useState('');
  const dialogs = useDialogs();

  return (
    <Dialog open={open} onClose={() => onClose(null)} fullScreen>
      <Box
        sx={{
          width: '100%',
          direction: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AppBar position="sticky" sx={{ pt: 'env(safe-area-inset-top)' }}>
          <Toolbar>
            <IconButton size="large" edge="start" color="inherit" onClick={() => onClose(null)}>
              <Close />
            </IconButton>
            <SearchWrapper sx={{ flexGrow: 1 }}>
              <SearchIconWrapper>
                <SearchIcon />
              </SearchIconWrapper>
              <StyledInputBase
                sx={{ width: '100% !important', flexGrow: 1 }}
                placeholder="Suche nach einem Nutzer"
                inputProps={{ 'aria-label': 'search' }}
                value={searchString}
                onChange={(e: { target: { value: React.SetStateAction<string> } }) => setSearchString(e.target.value)}
              />
            </SearchWrapper>
          </Toolbar>
        </AppBar>
        <List sx={{ width: '100%' }}>
          {payload.options
            .filter(
              (x: Player | PlayerWithSimpleUser) =>
                searchString === '' || (('name' in x) ? x.name : x.display_name ?? '').toLowerCase().includes(searchString.toLowerCase())
            )
            .map((user: Player | PlayerWithSimpleUser) => {

              const displayName = 'name' in user ? user.name : user?.display_name ?? 'Unknown';
              const avatarUrl = 'avatarUrl' in user ? user?.avatarUrl ?? user?.rg_avatar_url ?? '' : '';
              return <ListItemButton key={user.player} onClick={() => onClose(user)} disabled={payload.selectedPlayers.some((x) => x.id === user.player)}>
                <ListItemAvatar>
                  <Avatar sx={{ borderRadius: 2 }}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="logo" width={'100%'} height={'100%'} />
                    ) : (
                      <AccountBox />
                    )}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText primary={displayName} secondary={t('userName')} />
              </ListItemButton>
            })}
        </List>
        <Has perm={"games.create.guest-player"}>
          <Fab
            sx={{
              position: 'fixed',
              right: '16px',
              bottom: 'calc(16px + env(safe-area-inset-bottom))',
            }}
            onClick={async () => {
              const result = await dialogs.open(CreatePlayerDialog);
              if (result) {
                onClose(result);
              }
            }}
          >
            <Add />
          </Fab>
        </Has>
      </Box>
    </Dialog>
  )
};

const CreatePlayerDialog = ({ open, onClose }: DialogProps<undefined, Player | null>) => {
  const [name, setName] = useState('');
  const [index, setIndex] = useState(1000);

  const submit = () => {

    onClose({
      created_at: formatDateToDatabase(new Date()),
      gender: 'm',
      rg_avatar_url: null,
      rg_link: null,
      rg_id: null,
      rg_index: null,
      hide_rating: false,
      effective_rating_cached: index,
      matches_played: 0,
      player: v4(),
      pro_status: false,
      display_name: name,
      ka_index: index,
      linked_user_id: null
    })
  }

  return (
    <Dialog open={open} onClose={() => onClose(null)} fullScreen>
      <Box
        sx={{
          width: '100%',
          direction: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AppBar position="sticky" sx={{ pt: 'env(safe-area-inset-top)' }}>
          <Toolbar>
            <IconButton size="large" edge="start" color="inherit" onClick={() => onClose(null)}>
              <Close />
            </IconButton>
            <Typography variant="h6" component="div">
              Spieler erstellen
            </Typography>
            <Button color="inherit" sx={{ marginLeft: 'auto' }} onClick={submit}>
              Speichern
            </Button>
          </Toolbar>
        </AppBar>
        <Stack direction={'column'} sx={{ p: 2, gap: 2 }}>
          <TextField label={'Name'} fullWidth value={name} onChange={(e) => setName(e.target.value)} />
          <Has perm={"games.create.guest-player.with_index"}>
            <NumberField step={50} label={'Index'} min={800} max={2000} defaultValue={1000} value={index} onValueChange={(e) => e && setIndex(e)} />
          </Has>
        </Stack>
      </Box>
    </Dialog>
  )
}