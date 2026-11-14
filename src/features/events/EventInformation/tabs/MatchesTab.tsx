import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Item } from '@/components/ui/item';
import { TabsContent } from '@/components/ui/tabs';
import { useDialogs } from '@/contexts/DialogsProvider';
import { cn } from '@/lib/utils';
import { EventsUserView } from '@/types/supabaseTypes';
import { Lock, Plus, Volleyball } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import ReportScore from '../../../games/ReportScore';

const MatchesTab = ({ event, matches, readOnly = false }: { event: EventsUserView; matches: FullMatch[]; readOnly?: boolean }) => {
  const { t } = useTranslation();
  const dialogs = useDialogs();
  const navigate = useNavigate();

  const addMatch = () => dialogs.open(ReportScore, { eventId: event.id });

  return (
    <TabsContent value="matches" className="m-0">
      <Card className="pt-0 gap-0">
        <CardHeader className="border-b !py-2">
          <div className="flex items-center justify-between !p-0">
            <CardTitle className="text-lg">{t('navigation.matches')}</CardTitle>
            {!readOnly && matches.length > 0 && (
              <Button size="sm" variant="outline" onClick={addMatch}>
                <Plus />
                {t('events.matchesTab.addMatch')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 p-4">
          {matches.length > 0 ? (
            matches.map((x) => {
              const sets = (x.sets?.filter((s) => s) ?? []).map((s) => ({
                id: s.id,
                teamAWon: Number(s.team_a_score) > Number(s.team_b_score),
                team_a_score: s.team_a_score,
                team_b_score: s.team_b_score,
              }));
              const teamASetWins = sets.reduce((acc, curr) => acc + (curr.teamAWon ? 1 : -1), 0);

              return (
                <Item key={x.id} variant="outline" className="p-3" onClick={() => navigate(`/matches/${x.id}`)}>
                  <div className="flex w-full items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className={cn('truncate', teamASetWins > 0 && 'font-bold')}>{x.team_a_name}</div>
                      <div className={cn('truncate', teamASetWins < 0 && 'font-bold')}>{x.team_b_name}</div>
                      {(!x.rated || !x.is_public) && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {!x.rated && <Badge variant="outline">{t('games.list.unrated')}</Badge>}
                          {!x.is_public && (
                            <Badge variant="outline">
                              <Lock />
                              {t('games.list.private')}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 tabular-nums">
                      {sets.map((s) => (
                        <div key={s.id} className="text-center">
                          <div className={cn(s.teamAWon && 'font-bold')}>{s.team_a_score}</div>
                          <div className={cn(!s.teamAWon && 'font-bold')}>{s.team_b_score}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Item>
              );
            })
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Volleyball />
                </EmptyMedia>
                <EmptyTitle>{t('events.matchesTab.emptyTitle')}</EmptyTitle>
                <EmptyDescription>{t('events.matchesTab.emptyDescription')}</EmptyDescription>
              </EmptyHeader>
              {!readOnly && (
                <Button onClick={addMatch}>
                  <Plus />
                  {t('events.matchesTab.addMatch')}
                </Button>
              )}
            </Empty>
          )}
        </CardContent>
      </Card>
    </TabsContent>
  );
};

export default MatchesTab;
