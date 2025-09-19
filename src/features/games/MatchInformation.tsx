import Layout from '@/components/layout/Layout';
import { LoadingIndicator } from '@/components/LoadingIndicator';
import { useMatch } from '@/tanstack/games';
import { AccountBox } from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { useNotifications } from '@toolpad/core';
import { useEffect } from 'react';
import { useParams } from 'react-router';

type Props = {
  title: string;
  expected?: number;
  eff_team?: number;
  cat_team?: string;
  sets: { score: number; won: boolean }[];
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
            {[0, 0, 0].map((x) => (
              <Skeleton variant="rectangular" width={40} height={40} />
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
  sets,
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 2, py: 1 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Typography fontWeight={'bold'}>Sätze</Typography>
          </Box>
          <Stack direction={'row'} spacing={1}>
            {sets.map((x) => (
              <Chip color={x.won ? 'success' : 'default'} variant={'filled'} label={x.score} />
            ))}
          </Stack>
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
  const notifications = useNotifications();

  const { data: match = null, error, isLoading, refetch } = useMatch(matchId);

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
      <Layout appBarConfig={{ navigateBackPath: '/matches' }}>
        <LoadingIndicator loading={true} />
        <Stack direction={'column'} spacing={2} sx={{ m: 1, justifyContent: 'center' }}>
          <LoadingTeamCard />
          <LoadingTeamCard />
        </Stack>
      </Layout>
    );

  if (!match)
    return (
      <Layout>
        <Alert severity="error">Das Spiel konnte nicht gefunden werden oder wird gerade geladen.</Alert>
      </Layout>
    );

  return (
    <Layout appBarConfig={{ navigateBackPath: '/matches' }}>
      <Stack direction={'column'} spacing={2} sx={{ m: 1, justifyContent: 'center' }}>
        <TeamCard
          title="Team A"
          expected={match.elo_calc_log?.expected_a}
          eff_team={match.elo_calc_log?.eff_team_a}
          cat_team={match.elo_calc_log?.category_a}
          sets={match.sets.reduce(
            (curr, prev) => [...curr, { score: prev.team_a_score, won: prev.team_b_score < prev.team_a_score }],
            new Array<{ score: number; won: boolean }>()
          )}
          p1_eff={player1a_history?.eff_old_rating}
          p2_eff={player2a_history?.eff_old_rating}
          p1_delta={(player1a_history?.eff_new_rating ?? 0) - (player1a_history?.eff_old_rating ?? 0)}
          p2_delta={(player2a_history?.eff_new_rating ?? 0) - (player2a_history?.eff_old_rating ?? 0)}
          p1={match.player_1a}
          p2={match.player_2a}
          rated={match.rated}
        />

        <TeamCard
          title="Team B"
          expected={match.elo_calc_log?.expected_b}
          eff_team={match.elo_calc_log?.eff_team_b}
          cat_team={match.elo_calc_log?.category_b}
          sets={match.sets.reduce(
            (curr, prev) => [...curr, { score: prev.team_b_score, won: prev.team_b_score > prev.team_a_score }],
            new Array<{ score: number; won: boolean }>()
          )}
          p1_eff={player1b_history?.eff_old_rating}
          p2_eff={player2b_history?.eff_old_rating}
          p1_delta={(player1b_history?.eff_new_rating ?? 0) - (player1b_history?.eff_old_rating ?? 0)}
          p2_delta={(player2b_history?.eff_new_rating ?? 0) - (player2b_history?.eff_old_rating ?? 0)}
          p1={match.player_1b}
          p2={match.player_2b}
          rated={match.rated}
        />
      </Stack>
    </Layout>
  );
};
export default MatchInformation;
