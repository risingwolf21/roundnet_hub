import { Warning } from '@mui/icons-material';
import { Box, Button, List, ListItem, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useDialogs } from '@toolpad/core';
import React from 'react';
import { useAuthentication } from 'src/features/auth/AuthProvider';
import { ReportSetsDialog } from 'src/features/games/dialogs/ReportSetsDialog';
import { GamesRepository } from 'src/repository/GamesRepository';

type EventInformationGamesProps = {
  eventId: string;
};

const EventInformationGames = ({
  eventId,
}: EventInformationGamesProps) => {
  const dialogs = useDialogs();
  const { user } = useAuthentication();

  const { data: matches = [], isLoading, refetch } = useQuery<FullMatch[]>({
    queryKey: ['events', eventId, "matches"],
    enabled: !!eventId,
    queryFn: () => GamesRepository.fetchGamesForEvent(eventId)
  })

  if (matches.length === 0 || isLoading)
    return null;

  return (
    <Box sx={{ p: 0, alignSelf: 'center' }}>
      <Typography sx={{ fontSize: 16, fontWeight: 'bold', mt: 2 }} color="text.secondary" gutterBottom>
        Spiele
      </Typography>
      <List sx={{ p: 0 }}>
        {
          matches.map(x => <ListItem key={x.id} divider sx={{ px: 0 }}>
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
                  {x.team_a.name}
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
                  {x.team_b.name}
                </Typography>
              </Box>
              {
                x.sets.length === 0
                && (x.team_a.player1.player === user.userId
                  || x.team_a.player2.player === user.userId
                  || x.team_b.player1.player === user.userId
                  || x.team_b.player2.player === user.userId) && <Button startIcon={<Warning color='warning' />} onClick={async () => {
                    const result = await dialogs.open(ReportSetsDialog, { matchId: x.id, team_a_name: x.team_a.name, team_b_name: x.team_b.name, sets: null });
                    if (result) {
                      refetch();
                    }
                  }}>Score eintragen</Button>
              }
              {
                x.sets.sort((a, b) => a.set_number < b.set_number ? 1 : -1).map((y) => {
                  let teamAWon = y.team_a_score > y.team_b_score;
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
                        {y.team_a_score}
                      </Typography>
                      <Typography
                        sx={{
                          textAlign: 'end',
                          fontSize: '1rem',
                          color: `rgba(0,0,0,${teamAWon ? '0.6' : '0.87'})`,
                          fontWeight: teamAWon ? '400' : 'bold',
                        }}
                      >
                        {y.team_b_score}
                      </Typography>
                    </Box>
                  );
                })}
            </Box>
          </ListItem>)
        }
      </List>
    </Box>
  );
};

export default EventInformationGames;
