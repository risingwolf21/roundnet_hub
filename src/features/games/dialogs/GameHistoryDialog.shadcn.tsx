import { usePlayerMatches } from "@/tanstack/games";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import ListItem from "@mui/material/ListItem";
import Typography from "@mui/material/Typography";
import { DialogProps } from "@toolpad/core";
import { useNavigate } from "react-router";

import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Item } from "@/components/ui/item";
import { cn } from "@/lib/utils";
import TrendingDown from '@mui/icons-material/TrendingDown';
import TrendingFlat from '@mui/icons-material/TrendingFlat';
import TrendingUp from '@mui/icons-material/TrendingUp';

type GameHistoryDialogProps = {
  player_id: string
  name: string
  rating: string
}

export const GameHistoryDialogShadcn = ({ payload: { player_id, name, rating }, open, onClose }: DialogProps<GameHistoryDialogProps>) => {
  const { data: games = [], isLoading, isFetching } = usePlayerMatches(player_id);
  const navigate = useNavigate();

  return <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
    <AlertDialogContent variant={"default"} className={"p-0 flex flex-col"}>
      <AlertDialogHeader className="p-4 pb-0">
        <AlertDialogTitle className={"flex gap-2 items-center"}>
          {name}
          <Badge>{rating}</Badge>
        </AlertDialogTitle>
      </AlertDialogHeader>
      <div className="flex flex-col gap-2 p-2 pt-0">
        {
          (isLoading || isFetching) && <CircularProgress />
        }
        {
          games.map((match) => {
            const sets = (match.set_scores?.split(",").filter(x => x) ?? []).map(x => {
              const [team_a_score, team_b_score] = x.trim().split(':');
              const teamAWon = Number(team_a_score) > Number(team_b_score);
              return {
                teamAWon,
                team_a_score,
                team_b_score
              }
            });
            const teamASetWins = sets.reduce((acc, curr) => acc + (curr.teamAWon ? 1 : -1), 0);
            const elo_change_a = Number(match.elo_change_a?.toFixed() ?? 0);

            return <Item key={match.match_id} variant={"outline"} className='p-1 pl-2' onClick={() => {
              onClose();
              navigate(`/matches/${match.match_id}`);
            }}>
              <div className={cn("w-full flex flex-row justify-between relative gap-4 pl-4 p-2 rounded-md after:absolute after:inset-y-2 after:left-0 after:w-1 after:rounded-full", {
                'after:bg-success/70': teamASetWins > 0,
                'after:bg-error/70': teamASetWins < 0,
              })
              }>
                <div className='flex-1 min-w-0 ml-2 flex flex-row justify-between'>
                  <div className='flex flex-row gap-4'>
                    <div>
                      <div>
                        <div className={cn('text-md', {
                          "font-bold": teamASetWins > 0
                        })}>
                          {match.team_a_name}
                        </div>
                        <div className={cn('text-md', {
                          "font-bold": teamASetWins < 0
                        })}>
                          {match.team_b_name}
                        </div>
                      </div>
                    </div>
                  </div>
                  {
                    sets.map((x, i) => <div key={i}>
                      <div className={cn('text-md', {
                        "font-bold": x.teamAWon
                      })}>{x.team_a_score}</div>
                      <div className={cn('text-md', {
                        "font-bold": !x.teamAWon
                      })}>{x.team_b_score}</div>
                    </div>)
                  }
                </div>

              </div>
            </Item>
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
      </div>
    </AlertDialogContent>
  </AlertDialog>
}