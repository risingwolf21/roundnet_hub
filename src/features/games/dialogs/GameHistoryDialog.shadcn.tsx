import { usePlayerMatches } from "@/tanstack/games";
import CircularProgress from "@mui/material/CircularProgress";
import { DialogProps } from "@toolpad/core";
import { useNavigate } from "react-router";

import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Item } from "@/components/ui/item";
import { cn } from "@/lib/utils";

type GameHistoryDialogProps = {
  player_id: string
  name: string
  rating: string
}

export const GameHistoryDialogShadcn = ({ payload: { player_id, name, rating }, open, onClose }: DialogProps<GameHistoryDialogProps>) => {
  const { data: games = [], isLoading, isFetching } = usePlayerMatches(player_id);
  const navigate = useNavigate();

  return <Dialog modal open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
    <DialogContent variant={"default"} className={"p-0 pb-4 flex flex-col max-h-[90dvh]"}>
      <DialogHeader className="p-4 pb-0">
        <DialogTitle className={"flex gap-2 items-center"}>
          {name}
          <Badge>{rating}</Badge>
        </DialogTitle>
      </DialogHeader>
      <div className="no-scrollbar overflow-y-auto px-4 flex flex-col gap-4 ">
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
            const elo_change = player_id === match.team_a_p1 || player_id === match.team_a_p2
              ? Number(match.elo_change_a) : Number(match.elo_change_b);

            return <Item key={match.match_id} variant={"outline"} className='p-1 pl-2' onClick={() => {
              onClose();
              navigate(`/matches/${match.match_id}`);
            }}>
              <div className={cn("w-full flex flex-row justify-between relative gap-4 pl-4 p-2 rounded-md after:absolute after:inset-y-2 after:left-0 after:w-1 after:rounded-full", {
                'after:bg-success/70': teamASetWins > 0,
                'after:bg-error/70': teamASetWins < 0,
              })
              }>
                <div className='flex-1 min-w-0 ml-2 flex flex-row justify-between gap-2'>
                  <div className='flex flex-row gap-4 flex-1'>
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
                  <div className="flex-shrink flex flex-row h-full items-center">
                    <Badge variant={elo_change > 0 ? "success" : "error"}>{elo_change}</Badge>
                  </div>
                  <div className='flex-shrink flex flex-row h-full items-center gap-2'>
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

              </div>
            </Item>
          })
        }
      </div>
    </DialogContent>
  </Dialog>
}