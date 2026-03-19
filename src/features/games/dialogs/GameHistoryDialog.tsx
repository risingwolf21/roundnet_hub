import { usePlayerMatches } from "@/tanstack/games";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Typography from "@mui/material/Typography";
import { DialogProps } from "@toolpad/core";
import { useNavigate } from "react-router";

import TrendingDown from '@mui/icons-material/TrendingDown';
import TrendingFlat from '@mui/icons-material/TrendingFlat';
import TrendingUp from '@mui/icons-material/TrendingUp';
type GameHistoryDialogProps = {
  player_id: string
  name: string
  rating: string
}

export const GameHistoryDialog = ({ payload: { player_id, name, rating }, open, onClose }: DialogProps<GameHistoryDialogProps>) => {
  const { data: games = [], isLoading, isFetching } = usePlayerMatches(player_id);
  const navigate = useNavigate();

  return <Dialog fullWidth open={open} onClose={() => onClose()}>
    <Box sx={{ flexDirection: "row", display: "flex", alignItems: "center" }}>
      <DialogTitle>
        {name}
      </DialogTitle>
      <Chip
        label={rating}
        color={'default'}
        size="small"
        sx={{ fontWeight: "bold", py: 2 }} />
    </Box>
    <List>
      {
        (isLoading || isFetching) && <CircularProgress />
      }
      {
        games.map((match) => {
          const elo_change_a = Number(match.elo_change_a?.toFixed() ?? 0);
          return <ListItem divider key={match.match_id} onClick={() => {
            navigate(`/matches/${match.match_id}`);
            onClose();
          }}>
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
                      color: `rgba(0,0,0,${match.winner_side === 'team_a' ? '0.87' : '0.6'})`,
                      fontWeight: match.winner_side === 'team_a' ? 'bold' : '400',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {match.team_a_name}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '1rem',
                      color: `rgba(0,0,0,${match.winner_side === 'team_b' ? '0.87' : '0.6'})`,
                      fontWeight: match.winner_side === 'team_b' ? 'bold' : '400',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {match.team_b_name}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{
                display: 'flex',
                ml: 2,
                flexDirection: 'column',
                justifyContent: "center"
              }}>
                <Chip
                  color={elo_change_a > 0 ? 'success' : elo_change_a < 0 ? 'warning' : 'default'}
                  size="small"
                  label={match.elo_change_a?.toFixed()}
                  icon={elo_change_a > 0 ? <TrendingUp /> : elo_change_a < 0 ? <TrendingDown /> : <TrendingFlat />} />
              </Box>
              {match.set_scores?.split(',').map((y) => {
                const teamAScore = Number(y.split(':')[0]);
                const teamBScore = Number(y.split(':')[1]);
                const teamAWon = teamAScore > teamBScore;
                return (
                  <Box
                    key={y}
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
                      {teamAScore}
                    </Typography>
                    <Typography
                      sx={{
                        textAlign: 'end',
                        fontSize: '1rem',
                        color: `rgba(0,0,0,${teamAWon ? '0.6' : '0.87'})`,
                        fontWeight: teamAWon ? '400' : 'bold',
                      }}
                    >
                      {teamBScore}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </ListItem>
        })
      }
    </List>
  </Dialog>
}