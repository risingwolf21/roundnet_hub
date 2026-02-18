import Layout from '@/components/layout/Layout';
import { LoadingIndicator } from '@/components/LoadingIndicator';
import { useDeleteMatch, useMatch } from '@/tanstack/games';
import { useDialogs, useNotifications } from '@toolpad/core';
import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';

import { Has } from '@/hooks/useGrants';
import AccountBox from '@mui/icons-material/AccountBox';
import Delete from '@mui/icons-material/Delete';
import Edit from '@mui/icons-material/Edit';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Fab from '@mui/material/Fab';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ReportSetsDialog } from './dialogs/ReportSetsDialog';

type Props = {
  title: string;
  expected?: number;
  eff_team?: number;
  cat_team?: string;
  p1_eff?: number | null;
  p2_eff?: number | null;
  p1_delta?: number | null;
  p2_delta?: number | null;
  p1: User | null;
  p2: User | null;
  rated: boolean;
};

const deltaChip = (delta?: number | null) =>
  delta && <Chip color={delta > 0 ? 'success' : 'error'} size="small" label={delta.toFixed()} />;

const LoadingTeamCard = () => {
  return (
    <Card elevation={3} sx={{ borderRadius: 2, py: 0, px: 0, mt: 1 }}>
      <CardContent sx={{ p: 0 }}>
        <Box sx={{ flexDirection: 'row', display: 'flex', justifyContent: 'space-between', p: 2 }}>
          <Stack direction={'row'} spacing={2}>
            <Typography variant="h5" component="div">
              <Skeleton variant="text" width={80} height={30} />
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Skeleton variant="rectangular" />
            </Box>
          </Stack>
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Skeleton variant="rectangular" />
          </Box>
        </Box>
        <Divider />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2, py: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Skeleton variant="text" width={100} />
          </Box>
          <Stack direction={'row'} spacing={1}>
            {[0, 1, 2].map((x) => (
              <Skeleton key={`skeleton-${x}`} variant="rectangular" width={40} height={40} />
            ))}
          </Stack>
        </Box>
        <Divider />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2, py: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Skeleton variant="text" width={100} />
          </Box>
          <Skeleton variant="rectangular" />
        </Box>
        <Divider />
        <ListItem>
          <ListItemAvatar>
            <Avatar sx={{ borderRadius: 2 }}>
              <Skeleton variant="rectangular" width={40} height={40} />
            </Avatar>
          </ListItemAvatar>
          <ListItemText primary={<Skeleton variant="text" />} />
        </ListItem>
        <ListItem>
          <ListItemAvatar>
            <Avatar sx={{ borderRadius: 2 }}>
              <Skeleton variant="rectangular" width={40} height={40} />
            </Avatar>
          </ListItemAvatar>
          <ListItemText primary={<Skeleton variant="text" />} />
        </ListItem>
      </CardContent>
    </Card>
  );
};

const TeamCard = ({
  title,
  expected,
  eff_team,
  cat_team,
  p1_eff,
  p2_eff,
  p1_delta,
  p2_delta,
  p1,
  p2,
  rated,
}: Props) => {
  return (
    <Card elevation={3} sx={{ borderRadius: 2, py: 0, px: 0, mt: 1 }}>
      <CardContent sx={{ p: 0 }}>
        <Box sx={{ flexDirection: 'row', display: 'flex', justifyContent: 'space-between', p: 2 }}>
          <Stack direction={'row'} spacing={2}>
            <Typography variant="h5" component="div">
              {title}
            </Typography>
            {rated && (
              <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Chip color="primary" size="small" label={cat_team} />
              </Box>
            )}
          </Stack>
          {rated && (
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <Chip color="default" label={eff_team?.toFixed()} />
            </Box>
          )}
        </Box>
        <Divider />
        {rated && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2, py: 1 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography fontWeight={'bold'}>Gewinnwahrscheinlichkeit</Typography>
              </Box>
              <Chip
                color={(expected ?? 0) > 0.5 ? 'success' : 'warning'}
                variant={'filled'}
                label={((expected ?? 0) * 100).toFixed() + ' %'}
              />
            </Box>
            <Divider />
          </>
        )}
        <ListItem
          secondaryAction={
            rated && (
              <Stack direction={'row'} spacing={1}>
                <Typography sx={{ fontWeight: 'bold' }}>{p1_eff?.toFixed(0)}</Typography>
                {deltaChip(p1_delta)}
              </Stack>
            )
          }
        >
          <ListItemAvatar>
            <Avatar sx={{ borderRadius: 2 }}>
              {p1?.avatarUrl ? <img src={p1?.avatarUrl} alt="logo" width={'100%'} height={'100%'} /> : <AccountBox />}
            </Avatar>
          </ListItemAvatar>
          <ListItemText primary={p1?.displayName} />
        </ListItem>
        <ListItem
          secondaryAction={
            rated && (
              <Stack direction={'row'} spacing={1}>
                <Typography sx={{ fontWeight: 'bold' }}>{p2_eff?.toFixed(0)}</Typography>
                {deltaChip(p2_delta)}
              </Stack>
            )
          }
        >
          <ListItemAvatar>
            <Avatar sx={{ borderRadius: 2 }}>
              {p2?.avatarUrl ? <img src={p2?.avatarUrl} alt="logo" width={'100%'} height={'100%'} /> : <AccountBox />}
            </Avatar>
          </ListItemAvatar>
          <ListItemText primary={p2?.displayName} />
        </ListItem>
      </CardContent>
    </Card>
  );
};

const MatchInformation = () => {
  const { matchId } = useParams();
  const dialogs = useDialogs();
  const notifications = useNotifications();
  const navigate = useNavigate();

  const { data: match = null, error, isLoading, refetch } = useMatch(matchId);
  const useDeleteMatchMutation = useDeleteMatch(matchId);

  const player1a_history = match?.elo_history.find((x) => x.user === match.team_a.player_1.player);
  const player2a_history = match?.elo_history.find((x) => x.user === match.team_a.player_2.player);
  const player1b_history = match?.elo_history.find((x) => x.user === match.team_b.player_1.player);
  const player2b_history = match?.elo_history.find((x) => x.user === match.team_b.player_2.player);

  useEffect(() => {
    if (error)
      notifications.show(error.message, { severity: 'error', actionText: 'Neu laden', onAction: () => refetch() });
  }, [error, notifications, refetch]);

  if (isLoading)
    return (
      <Layout appBarConfig={{ navigateBackPath: -1 }}>
        <LoadingIndicator loading={true} />
        <Stack direction={'column'} spacing={2} sx={{ m: 1, justifyContent: 'center' }}>
          <LoadingTeamCard />
          <LoadingTeamCard />
        </Stack>
      </Layout>
    );

  if (!match)
    return (
      <Layout appBarConfig={{ navigateBackPath: -1 }}>
        <Alert severity="error">Das Spiel konnte nicht gefunden werden oder wird gerade geladen.</Alert>
      </Layout>
    );

  return (
    <Layout appBarConfig={{ navigateBackPath: -1 }}>
      <Stack direction={'column'} spacing={2} sx={{ m: 1, justifyContent: 'center' }}>
        <TeamCard
          title="Team A"
          expected={match.elo_calc_log?.expected_a}
          eff_team={match.elo_calc_log?.eff_team_a}
          cat_team={match.elo_calc_log?.category_a}
          p1_eff={player1a_history?.eff_old_rating}
          p2_eff={player2a_history?.eff_old_rating}
          p1_delta={(player1a_history?.eff_new_rating ?? 0) - (player1a_history?.eff_old_rating ?? 0)}
          p2_delta={(player2a_history?.eff_new_rating ?? 0) - (player2a_history?.eff_old_rating ?? 0)}
          p1={match.player_1a}
          p2={match.player_2a}
          rated={match.rated}
        />

        <Card elevation={3} sx={{ borderRadius: 2, py: 0, px: 0, mt: 1, pb: 0 }}>
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2, pt: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography fontWeight={'bold'}>Sätze</Typography>
              </Box>
              <Stack direction={'row'} spacing={1} sx={{ px: 0, py: 1, pb: 0 }}>
                {match.sets.map((x) => (
                  <Stack spacing={2} key={x.id}>
                    <Chip
                      color={x.team_b_score < x.team_a_score ? 'success' : 'default'}
                      variant={'filled'}
                      label={x.team_a_score}
                    />
                    <Chip
                      color={x.team_b_score > x.team_a_score ? 'success' : 'default'}
                      variant={'filled'}
                      label={x.team_b_score}
                    />
                  </Stack>
                ))}
              </Stack>
            </Box>
          </CardContent>
        </Card>

        <TeamCard
          title="Team B"
          expected={match.elo_calc_log?.expected_b}
          eff_team={match.elo_calc_log?.eff_team_b}
          cat_team={match.elo_calc_log?.category_b}
          p1_eff={player1b_history?.eff_old_rating}
          p2_eff={player2b_history?.eff_old_rating}
          p1_delta={(player1b_history?.eff_new_rating ?? 0) - (player1b_history?.eff_old_rating ?? 0)}
          p2_delta={(player2b_history?.eff_new_rating ?? 0) - (player2b_history?.eff_old_rating ?? 0)}
          p1={match.player_1b}
          p2={match.player_2b}
          rated={match.rated}
        />

        <Has perm={'games.update.score'}>
          <Fab sx={{
            background: 'primary.light',
            position: 'fixed',
            right: '16px',
            bottom: 'calc(16px + env(safe-area-inset-bottom))',
            mb: '16px',
          }}
            onClick={() => {
              dialogs.open(ReportSetsDialog, { matchId: match.id, team_a_name: match.team_a.name, team_b_name: match.team_b.name, sets: match.sets });
            }}>
            <Edit />
          </Fab>
        </Has>

        <Has perm={'games.delete.own'}>
          <Card sx={{ color: 'red', borderRadius: 2, py: 0, px: 0, m: 1 }}>
            <CardActionArea sx={{ px: 1 }}>
              <ListItem
                onClick={() =>
                  dialogs
                    .confirm(
                      `Möchtest du das Spiel wirklich löschen? ${match.rated ? 'Der Indexeintrag von diesem Spiel wird mit gelöscht.' : ''}`,
                      { title: 'Spiel löschen' }
                    )
                    .then((result) => {
                      if (result) {
                        useDeleteMatchMutation.mutate(undefined, {
                          onSuccess: () => navigate('/matches'),
                          onError: (error) =>
                            notifications.show('Spiel konnte nicht gelöscht werden. ' + error.message, {
                              severity: 'error',
                            }),
                        });
                      }
                    })
                }
              >
                <ListItemAvatar sx={{ flexDirection: 'row', display: 'flex', alignItems: 'center' }}>
                  <Delete />
                </ListItemAvatar>
                <ListItemText primary="Löschen" />
              </ListItem>
            </CardActionArea>
          </Card>
        </Has>

        <Has perm={'games.admin.view'}>
          <Card elevation={3} sx={{ borderRadius: 2, py: 0, px: 0, mt: 1 }}>
            <CardContent sx={{ p: 0 }}>
              <Box sx={{ flexDirection: 'row', display: 'flex', justifyContent: 'space-between', px: 2, py: 1 }}>
                <Typography sx={{ fontWeight: 'bold' }}>Admin - Informationen</Typography>
              </Box>
              <Divider />
              <ListItemButton
                dense
                onClick={() =>
                  navigator.clipboard.writeText(match.id).then(() => notifications.show('Erfolgreich kopiert'))
                }
              >
                <ListItemText
                  primary={
                    <Typography variant="body2" style={{ userSelect: 'text' }}>
                      {match.id}
                    </Typography>
                  }
                  secondary={'Match Id'}
                />
              </ListItemButton>
              <Divider />
              <ListItem dense>
                <Stack direction={'row'} spacing={2} width={'100%'}>
                  <ListItemText
                    sx={{ width: '50%' }}
                    primary={match.elo_calc_log?.rg_a1_used ?? 'not found'}
                    secondary={'RG Team A - Player 1'}
                  />
                  <ListItemText
                    sx={{ width: '50%' }}
                    primary={match.elo_calc_log?.rg_b1_used ?? 'not found'}
                    secondary={'RG Team B - Player 1'}
                  />
                </Stack>
              </ListItem>
              <ListItem dense>
                <Stack direction={'row'} spacing={2} width={'100%'}>
                  <ListItemText
                    sx={{ width: '50%' }}
                    primary={match.elo_calc_log?.rg_a2_used ?? 'not found'}
                    secondary={'RG Team A - Player 2'}
                  />
                  <ListItemText
                    sx={{ width: '50%' }}
                    primary={match.elo_calc_log?.rg_b2_used ?? 'not found'}
                    secondary={'RG Team B - Player 2'}
                  />
                </Stack>
              </ListItem>
              <Divider />
              <ListItem dense>
                <Stack direction={'row'} spacing={2} width={'100%'}>
                  <ListItemText
                    sx={{ width: '50%' }}
                    primary={match.elo_calc_log?.eff_team_a.toFixed(2) ?? 'not found'}
                    secondary={'Effective Rating Team A'}
                  />
                  <ListItemText
                    sx={{ width: '50%' }}
                    primary={match.elo_calc_log?.eff_team_b.toFixed(2) ?? 'not found'}
                    secondary={'Effective Rating Team B'}
                  />
                </Stack>
              </ListItem>
              <Divider />
              {match.elo_history.map((elo) => {
                const player = [match.player_1a, match.player_2a, match.player_1b, match.player_2b].find(
                  (x) => x?.id === elo.user
                );
                return (
                  <Stack key={elo.id}>
                    <ListItem dense>
                      <Stack direction={'row'} spacing={2} width={'100%'}>
                        <ListItemText
                          sx={{ width: '50%' }}
                          primary={player?.name ?? 'not found'}
                          secondary={'Spieler'}
                          primaryTypographyProps={{ fontWeight: 'bold' }}
                        />
                        <ListItemText sx={{ width: '50%' }} primary={elo.delta.toFixed(2)} secondary={'Delta'} />
                      </Stack>
                    </ListItem>
                    <ListItem dense>
                      <Stack direction={'row'} spacing={2} width={'100%'}>
                        <ListItemText
                          sx={{ width: '50%' }}
                          primary={elo.eff_old_rating?.toFixed(2)}
                          secondary={'Altes Rating'}
                        />
                        <ListItemText
                          sx={{ width: '50%' }}
                          primary={elo.eff_new_rating?.toFixed(2)}
                          secondary={'Neues Rating'}
                        />
                      </Stack>
                    </ListItem>
                    <Divider />
                  </Stack>
                );
              })}
            </CardContent>
          </Card>
        </Has>
      </Stack>
    </Layout>
  );
};
export default MatchInformation;
