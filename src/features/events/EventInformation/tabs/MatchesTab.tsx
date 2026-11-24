import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { sideBar } from '@/components/list/ListParts';
import { Card, CardContent } from '@/components/ui/card';
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
      <Card>
        <CardContent className="flex flex-col gap-3">
          {matches.length > 0 ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{t('events.matchesTab.played', { count: matches.length })}</h3>
                {!readOnly && (
                  <Button variant="outline" onClick={addMatch}>
                    <Plus />
                    {t('events.matchesTab.addMatch')}
                  </Button>
                )}
              </div>
              {matches.map((x) => {
                const sets = (x.sets?.filter((s) => s) ?? []).map((s) => ({
                  id: s.id,
                  teamAWon: Number(s.team_a_score) > Number(s.team_b_score),
                  team_a_score: s.team_a_score,
                  team_b_score: s.team_b_score,
                }));
                const setsA = sets.filter((s) => s.teamAWon).length;
                const setsB = sets.length - setsA;

                return (
                  <Item
                    key={x.id}
                    variant="outline"
                    className={cn('cursor-pointer p-3', sideBar(setsA !== setsB ? 'success' : 'neutral'))}
                    onClick={() => navigate(`/matches/${x.id}`)}
                  >
                    <div className="flex w-full items-center gap-3">
                      <div className="min-w-0 flex-1 text-sm">
                        <div className={cn('truncate', setsA > setsB && 'font-bold')}>{x.team_a_name}</div>
                        <div className={cn('truncate', setsB > setsA && 'font-bold')}>{x.team_b_name}</div>
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
                      <div className="flex shrink-0 items-center gap-2 text-sm tabular-nums text-muted-foreground">
                        {sets.map((s) => (
                          <div key={s.id} className="w-6 text-center">
                            <div className={cn(s.teamAWon && 'font-bold text-foreground')}>{s.team_a_score}</div>
                            <div className={cn(!s.teamAWon && 'font-bold text-foreground')}>{s.team_b_score}</div>
                          </div>
                        ))}
                        <div className="w-7 border-l pl-2 text-center text-base font-bold text-foreground" aria-label={t('events.matchesTab.setScore', { a: setsA, b: setsB })}>
                          <div>{setsA}</div>
                          <div>{setsB}</div>
                        </div>
                      </div>
                    </div>
                  </Item>
                );
              })}
            </>
          ) : (
            <Empty className="p-4">
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
