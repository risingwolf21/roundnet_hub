import { Add } from '@mui/icons-material';
import { Box, CircularProgress, Fab, List, ListItem, ListSubheader, Typography } from '@mui/material';
import moment from 'moment';
import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Layout from 'src/components/Layout';
import { RootState, useAppDispatch } from 'src/redux/store';
import { groupBy } from 'src/utils';
import { fetchMatchesAsync } from './slices/gamesSlice';
import { format, formatRelative } from 'date-fns';
import { t } from 'i18next';

export const GameList = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { matches, loadingMatches } = useSelector((state: RootState) => state.games);

  useEffect(() => {
    dispatch(fetchMatchesAsync());
  }, [dispatch]);

  return (
    <Layout>
      <List>
        {Array.from(
          groupBy(matches, (x: FullUserMatch) => moment(new Date(x.created_at ?? '')).format('DD MMMM yyyy'))
        ).map(([key, value]) => (
          <List
            key={key}
            subheader={
              <ListSubheader
                sx={{
                  zIndex: '-1',
                  fontWeight: 'bold',
                  lineHeight: 'normal',
                  my: 2,
                  color: 'rgba(0,0,0,0.87)',
                }}
              >
                {t('format.distanceToNow', { date: new Date(key) })}
              </ListSubheader>
            }
          >
            {value.map((x, index) => (
              <ListItem key={index} divider>
                <Box sx={{ display: 'flex', flexDirection: 'row', width: '100%' }}>
                  <Box
                    sx={{
                      display: 'flex',
                      flexGrow: 1,
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
                  {x.set_results?.split(',').map((y, index) => {
                    const [team_a_score, team_b_score] = y.trim().split(':');
                    let teamAWon = team_a_score > team_b_score;
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

        {loadingMatches && (
          <Box key="loadingEntries" sx={{ alignItems: 'center', display: 'flex', flexDirection: 'column', pt: 10 }}>
            <CircularProgress />
            <Typography sx={{ fontSize: '18pt', fontWeight: 'bold' }}>Einträge werden geladen</Typography>
          </Box>
        )}

        {matches.length <= 0 && !loadingMatches && (
          <Box key="noEntries" sx={{ alignItems: 'center', display: 'flex', flexDirection: 'column', pt: 10 }}>
            <Typography sx={{ fontSize: '30pt', fontWeight: 'bold' }}>📖</Typography>
            <Typography sx={{ fontSize: '18pt', fontWeight: 'bold' }}>Keine Einträge gefunden</Typography>
          </Box>
        )}

        <Fab
          key={'addScore'}
          sx={{
            background: '#66bb6a',
            color: '#fff',
            position: 'fixed',
            right: '16px',
            bottom: 'calc(16px + env(safe-area-inset-bottom))',
          }}
          onClick={() => navigate('/matches/report')}
        >
          <Add />
        </Fab>
      </List>
    </Layout>
  );
};
