import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Item } from '@/components/ui/item';
import { TabsContent } from '@/components/ui/tabs';
import { useDialogs } from '@/contexts/DialogsProvider';
import { cn } from '@/lib/utils';
import { EventsUserView } from '@/types/supabaseTypes';
import { Lock, MessageSquare, Plus } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { v4 } from 'uuid';
import ReportScore from '../../../games/ReportScore';

const MatchesTab = ({ event, matches }: { event: EventsUserView; matches: FullMatch[] }) => {
  const { t } = useTranslation();
  const dialogs = useDialogs();
  const navigate = useNavigate();

  return (
    <TabsContent value="matches" className="m-0">
      <Card className="pt-0 gap-0">
        <CardHeader className="border-b !py-2">
          <div className="flex justify-between items-center !p-0">
            <CardTitle className="text-lg flex items-center">
              {t('navigation.matches')}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-2">
          {matches.length > 0 ? (
            matches.map(x => {
              const sets = (x.sets?.filter(x => x) ?? []).map(x => {
                const { team_a_score, team_b_score } = x;
                const teamAWon = Number(team_a_score) > Number(team_b_score);
                return {
                  teamAWon,
                  team_a_score,
                  team_b_score
                };
              });
              const teamASetWins = sets.reduce((acc, curr) => acc + (curr.teamAWon ? 1 : -1), 0);

              return (
                <Item key={x.id} variant={"outline"} className='p-1 pl-2' onClick={() => navigate(`/matches/${x.id}`)}>
                  <div key={x.id} className={cn("w-full flex flex-row justify-between relative gap-4 pl-4 p-2 rounded-md after:absolute after:inset-y-2 after:left-0 after:w-1 after:rounded-full", {
                    'after:hidden': x.sets.length !== 0,
                  })}>
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
                            <Badge variant={"outline"}>{t('games.list.unrated')}</Badge>
                          )}
                          {!x.is_public && (
                            <Badge variant={"outline"}><Lock className="mr-1 size-3" />{t('games.list.private')}</Badge>
                          )}
                        </div>
                      </div>
                      <div className='flex flex-row h-full items-center gap-2'>
                        {sets.map((x: any) => (
                          <div key={v4()}>
                            <div className={cn('text-md', {
                              "font-bold": x.teamAWon
                            })}>{x.team_a_score}</div>
                            <div className={cn('text-md', {
                              "font-bold": !x.teamAWon
                            })}>{x.team_b_score}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Item>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-3 text-muted-foreground">
              <MessageSquare className="h-10 w-10 opacity-20" />
              <p><Trans i18nKey="events.matchesTab.empty" components={{ br: <br /> }} /></p>
              <Button onClick={async () => {
                dialogs.open(ReportScore, { eventId: event.id });
              }}>
                <Plus />
                {t('events.matchesTab.addMatch')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
};

export default MatchesTab;
