import { AccountBox, Add, CalendarMonth, CardTravel, ContentCopy, Warning } from '@mui/icons-material';
import { Alert, Avatar, Box, Button, Card, CardActionArea, CardContent, CardHeader, Chip, Fab, IconButton, List, ListItem, ListItemAvatar, ListItemText, ListSubheader, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { useDialogs, useNotifications } from '@toolpad/core';
import { t } from 'i18next';
import moment from 'moment';
import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import Layout from 'src/components/layout/Layout';
import { PullToRefresh } from 'src/components/pull-to-refresh/PullToRefresh';
import { useMatch, useMatches } from 'src/tanstack/games';
import { groupBy } from 'src/utils';
import { ReportSetsDialog } from './dialogs/ReportSetsDialog';
import { UserMatchesView } from 'src/types/supabaseTypes';
import { isAfter } from 'date-fns';

const MatchInformation = () => {
  const { matchId } = useParams();
  const notifications = useNotifications();
  const navigate = useNavigate();
  const dialogs = useDialogs();

  const { data: match = null, error, isLoading, refetch } = useMatch(matchId);

  useEffect(() => {
    if (error)
      notifications.show(error.message, { severity: "error", actionText: "Neu laden", onAction: () => refetch() })
  }, [error, notifications, refetch]);

  if (!match)
    return <Layout>
      <Alert severity='error'>Das Spiel konnte nicht gefunden werden oder wird gerade geladen.</Alert>
    </Layout>

  return (
    <Layout>
      <Stack direction={"column"} spacing={2} sx={{ m: 1, justifyContent: "center" }}>
        <Card sx={{ borderRadius: 2, py: 0, px: 0, mt: 1 }}>
          <CardContent>
            <Stack direction={"row"} spacing={2}>
              <Typography variant="h5" component="div">
                Team - {match.elo_calc?.eff_team_a}
              </Typography>

              <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <Chip color='primary' size='small' label={match.elo_calc?.category_a} />
              </Box>
            </Stack>
            <ListItem sx={{ pl: 0 }} secondaryAction={<Typography sx={{ fontWeight: "bold" }}>{match.team_a.player_1.ka_index}</Typography>}>
              <ListItemAvatar>
                <Avatar sx={{ borderRadius: 2 }}>
                  {match.player_1a?.avatarUrl ? (
                    <img src={match.player_1a?.avatarUrl} alt="logo" width={'100%'} height={'100%'} />
                  ) : (
                    <AccountBox />
                  )}
                </Avatar>
              </ListItemAvatar>
              <ListItemText primary={match.player_1a?.displayName} />
            </ListItem>
            <ListItem sx={{ pl: 0 }} secondaryAction={<Typography sx={{ fontWeight: "bold" }}>{match.team_a.player_2.ka_index}</Typography>}>
              <ListItemAvatar>
                <Avatar sx={{ borderRadius: 2 }}>
                  {match.player_2a?.avatarUrl ? (
                    <img src={match.player_2a?.avatarUrl} alt="logo" width={'100%'} height={'100%'} />
                  ) : (
                    <AccountBox />
                  )}
                </Avatar>
              </ListItemAvatar>
              <ListItemText primary={match.player_2a?.displayName} />
            </ListItem>
          </CardContent>

        </Card>


        <Paper sx={{ p: 0 }}>
          <Typography variant='h4' fontWeight={"bold"}>Sätze 1:0</Typography>
        </Paper>

        <Card sx={{ borderRadius: 2, py: 0, px: 0, mt: 1 }}>
          <CardContent>
            <Stack direction={"row"} spacing={2}>
              <Typography variant="h5" component="div">
                Team - {match.elo_calc?.eff_team_b}
              </Typography>

              <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <Chip color='primary' size='small' label={match.elo_calc?.category_b} />
              </Box>
            </Stack>
            <ListItem sx={{ pl: 0 }} secondaryAction={<Typography sx={{ fontWeight: "bold" }}>{match.team_b.player_1.ka_index}</Typography>}>
              <ListItemAvatar>
                <Avatar sx={{ borderRadius: 2 }}>
                  {match.player_1b?.avatarUrl ? (
                    <img src={match.player_1b?.avatarUrl} alt="logo" width={'100%'} height={'100%'} />
                  ) : (
                    <AccountBox />
                  )}
                </Avatar>
              </ListItemAvatar>
              <ListItemText primary={match.player_1b?.displayName} />
            </ListItem>
            <ListItem sx={{ pl: 0 }} secondaryAction={<Typography sx={{ fontWeight: "bold" }}>{match.team_b.player_2.ka_index}</Typography>}>
              <ListItemAvatar>
                <Avatar sx={{ borderRadius: 2 }}>
                  {match.player_2b?.avatarUrl ? (
                    <img src={match.player_2b?.avatarUrl} alt="logo" width={'100%'} height={'100%'} />
                  ) : (
                    <AccountBox />
                  )}
                </Avatar>
              </ListItemAvatar>
              <ListItemText primary={match.player_2b?.displayName} />
            </ListItem>
          </CardContent>

        </Card>
      </Stack>
    </Layout>
  );
};
export default MatchInformation;