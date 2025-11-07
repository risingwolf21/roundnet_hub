import Layout from '@/components/layout/Layout';
import { PullToRefresh } from '@/components/pull-to-refresh/PullToRefresh';
import { useMatches } from '@/tanstack/games';
import { UserMatchesView } from '@/types/supabaseTypes';
import { useDialogs, useNotifications } from '@toolpad/core';
import { format, isAfter } from 'date-fns';
import { t } from 'i18next';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ReportSetsDialog } from './dialogs/ReportSetsDialog';

import Add from '@mui/icons-material/Add';
import Warning from '@mui/icons-material/Warning';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Fab from '@mui/material/Fab';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListSubheader from '@mui/material/ListSubheader';
import Typography from '@mui/material/Typography';
import groupBy from 'lodash.groupby';

const GameList = () => {
  const notifications = useNotifications();
  const navigate = useNavigate();
  const dialogs = useDialogs();

  const { data: matches = [], error, isLoading, refetch } = useMatches();

  useEffect(() => {
    if (error)
      notifications.show(error.message, { severity: 'error', actionText: 'Neu laden', onAction: () => refetch() });
  }, [error, notifications, refetch]);

  return (
    <Layout>
      <PullToRefresh onRefresh={() => refetch()}>
        <List
          sx={(theme) => ({
            overscrollBehavior: 'none',
            [theme.breakpoints.down('xl')]: { pb: 12 },
            [theme.breakpoints.up('xl')]: { pb: 0 },
          })}
        >
          {Object.entries(groupBy(matches, (x: UserMatchesView) => format(x.created_at ?? '', 'dd MMMM yyyy')))
            .sort(([key1, _v1], [key2, _v2]) => (isAfter(key1, key2) ? -1 : 1))
            .map(([key, value]) => (
              <List
                key={key}
                subheader={
                  <ListSubheader
                    sx={{
                      fontWeight: 'bold',
                      lineHeight: 'normal',
                      my: 1,
                      color: 'rgba(0,0,0,0.87)',
                    }}
                  >
                    {t('format.distanceToNow', { date: new Date(key) })}
                  </ListSubheader>
                }
              >
                {value.map((x) => (
                  <ListItem key={x.id} divider onClick={() => navigate(`/matches/${x.id}`)}>
                    <Box sx={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
                      <Box
                        sx={{
                          flexGrow: 1,
                          display: 'flex',
                          flexDirection: 'row',
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: '1rem',
                              color: 'rgba(0,0,0,0.87)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {x.team_a_name}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: '1rem',
                              color: 'rgba(0,0,0,0.87)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {x.team_b_name}
                          </Typography>
                        </Box>
                        {!x.rated && (
                          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', ml: 2 }}>
                            <Chip color="info" variant="outlined" size="small" label="Ungewertet" />
                          </Box>
                        )}
                      </Box>
                      {!x.set_results && x.id && (
                        <Button
                          startIcon={<Warning color="warning" />}
                          onClick={async () => {
                            const result = await dialogs.open(ReportSetsDialog, {
                              matchId: x.id!,
                              team_a_name: x.team_a_name!,
                              team_b_name: x.team_b_name!,
                              sets: null,
                            });
                            if (result) {
                              refetch();
                            }
                          }}
                        >
                          Score eintragen
                        </Button>
                      )}
                      {x.set_results?.split(',').map((y) => {
                        const [team_a_score, team_b_score] = y.trim().split(':');
                        const teamAWon = team_a_score > team_b_score;
                        return (
                          <Box
                            sx={{
                              display: 'flex',
                              ml: 2,
                              flexDirection: 'column',
                            }}
                          >
                            <Typography
                              sx={{
                                textAlign: 'end',
                                fontSize: '1rem',
                                color: `rgba(0,0,0,${teamAWon ? '0.87' : '0.6'})`,
                                fontWeight: teamAWon ? 'bold' : '400',
                              }}
                            >
                              {team_a_score}
                            </Typography>
                            <Typography
                              sx={{
                                textAlign: 'end',
                                fontSize: '1rem',
                                color: `rgba(0,0,0,${teamAWon ? '0.6' : '0.87'})`,
                                fontWeight: teamAWon ? '400' : 'bold',
                              }}
                            >
                              {team_b_score}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  </ListItem>
                ))}
              </List>
            ))}

          {matches.length <= 0 && !isLoading && (
            <Box key="noEntries" sx={{ alignItems: 'center', display: 'flex', flexDirection: 'column', pt: 10 }}>
              <Typography sx={{ fontSize: '30pt', fontWeight: 'bold' }}>📖</Typography>
              <Typography sx={{ fontSize: '18pt', fontWeight: 'bold' }}>Keine Einträge gefunden</Typography>
            </Box>
          )}

          <Fab
            key={'addScore'}
            sx={{
              background: 'primary.light',
              color: 'primary.contrastText',
              position: 'fixed',
              right: '16px',
              bottom: 'calc(16px + env(safe-area-inset-bottom))',
            }}
            onClick={() => navigate('/matches/report')}
          >
            <Add />
          </Fab>
        </List>
      </PullToRefresh>
    </Layout>
  );
};
export default GameList;
