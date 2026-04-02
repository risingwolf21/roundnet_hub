import { PullToRefresh } from '@/components/pull-to-refresh/PullToRefresh';
import { useMatches } from '@/tanstack/games';
import { format, intlFormatDistance, isAfter } from 'date-fns';
import { useNavigate } from 'react-router';

import { AppBar } from '@/components/ui/appbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Item } from '@/components/ui/item';
import { cn } from '@/lib/utils';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import groupBy from 'lodash.groupby';
import { Lock, Plus, TriangleAlert } from 'lucide-react';
import { useGrants } from '../auth/GrantsContext';

const GameListShadcn = () => {
  const navigate = useNavigate();
  const { user } = useGrants();

  const { data: matches = [], error, isLoading, refetch } = useMatches();

  return (
    <div>
      <AppBar
        className='!border-b !shadow-sm'
        title="Spiellist"
        user={user}
      />
      <main className='flex-1 size-full pb-safe-bottom'>
        <PullToRefresh onRefresh={() => refetch()}>
          <div className="flex p-4 flex-col space-y-2">
            {Object.entries(groupBy(matches, (x: UserMatchesView) => format(x.created_at ?? '', 'dd MMMM yyyy')))
              .sort(([key1], [key2]) => (isAfter(key1, key2) ? -1 : 1))
              .map(([key, value]: [string, UserMatchesView[]]) => (
                <div key={key} className="flex w-full gap-2 flex-col">
                  <div className="text-sm font-semibold ml-2">
                    {
                      intlFormatDistance(new Date(key), new Date(), { unit: 'day' })
                    }
                  </div>
                  {
                    value
                      .sort((a, b) => b.created_at && a.created_at && isAfter(b.created_at, a.created_at) ? 1 : -1)
                      .map((x) => {
                        const sets = (x.set_scores?.split(",").filter(x => x) ?? []).map(x => {
                          const [team_a_score, team_b_score] = x.trim().split(':');
                          const teamAWon = Number(team_a_score) > Number(team_b_score);
                          return {
                            teamAWon,
                            team_a_score,
                            team_b_score
                          }
                        });
                        const matchMember = [x.team_a_p1, x.team_a_p2, x.team_b_p1, x.team_b_p2].includes(user.id);
                        const teamASetWins = sets.reduce((acc, curr) => acc + (curr.teamAWon ? 1 : -1), 0);

                        return <Item key={x.match_id} variant={"outline"} className='p-1 pl-2' onClick={() => navigate(`/matches/${x.match_id}`)}>
                          <div key={x.match_id} className={cn("w-full flex flex-row justify-between relative gap-4 pl-4 p-2 rounded-md after:absolute after:inset-y-2 after:left-0 after:w-1 after:rounded-full", {
                            'after:bg-error/70': sets.length === 0 && matchMember,
                            'after:hidden': sets.length !== 0,
                          })
                          }>
                            <div className='flex-1 min-w-0 ml-2 flex flex-row justify-between'>
                              <div className='flex flex-row gap-4'>
                                <div>
                                  <div>
                                    <div className={cn('text-md', {
                                      "font-bold": teamASetWins > 0
                                    })}>
                                      {x.team_a_name}
                                    </div>
                                    <div className={cn('text-md', {
                                      "font-bold": teamASetWins < 0
                                    })}>
                                      {x.team_b_name}
                                    </div>
                                  </div>
                                </div>
                                <div className='flex justify-center flex-col'>
                                  {!x.rated && (
                                    <Badge variant={"info"}>Ungewertet</Badge>
                                  )}
                                  {!x.is_public && (
                                    <Badge variant={"outline"}><Lock />Privat</Badge>
                                  )}
                                </div>
                              </div>
                              <div className='flex flex-row gap-2'>
                                {
                                  (sets.length === 0 && matchMember)
                                    ? <Button variant={"warning"}>
                                      <TriangleAlert />
                                      Scores eintragen</Button>
                                    : <>
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
                                    </>
                                }
                              </div>
                            </div>

                          </div>
                        </Item>
                      })
                  }
                </div>
              ))}

            {matches.length <= 0 && !isLoading && (
              <Box key="noEntries" sx={{ alignItems: 'center', display: 'flex', flexDirection: 'column', pt: 10 }}>
                <Typography sx={{ fontSize: '30pt', fontWeight: 'bold' }}>📖</Typography>
                <Typography sx={{ fontSize: '18pt', fontWeight: 'bold' }}>Keine Einträge gefunden</Typography>
              </Box>
            )}
          </div>
        </PullToRefresh>
        <div
          className="fixed right-6 z-50"
          style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
        >
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl bg-primary text-primary-foreground transition-all hover:-translate-y-1 active:translate-y-0 active:shadow-md"
            onClick={() => navigate('/matches/report')}
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      </main>
    </div>
  );
};
export default GameListShadcn;
