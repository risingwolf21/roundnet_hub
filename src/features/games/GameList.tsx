import { ListError, ListSectionHeader, ListSkeleton, SegmentedControl, sideBar } from '@/components/list/ListParts';
import { PullToRefresh } from '@/components/PullToRefresh';
import { AppBar } from '@/components/ui/appbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Item } from '@/components/ui/item';
import { useDialogs } from '@/contexts/DialogsProvider';
import { cn } from '@/lib/utils';
import { useMatches } from '@/tanstack/games';
import { format, intlFormatDistance, isAfter, parseISO } from 'date-fns';
import groupBy from 'lodash.groupby';
import { CircleCheck, Lock, Plus, SearchX, Trophy, TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useGrants } from '../auth/GrantsContext';
import ReportScore from './ReportScore';

type GameView = 'all' | 'mine' | 'missing';

type SetScore = { a: string; b: string; aWon: boolean };

const parseSets = (scores: string | null): SetScore[] =>
  (scores?.split(',').filter((x) => x.trim()) ?? []).map((set) => {
    const [a, b] = set.trim().split(':');
    return { a, b, aWon: Number(a) > Number(b) };
  });

const GameList = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const dialogs = useDialogs();
  const { user } = useGrants();
  const [view, setView] = useState<GameView>('all');

  const { data: matches = [], error, isLoading, refetch } = useMatches();

  const rows = useMemo(
    () =>
      matches.map((match) => {
        const sets = parseSets(match.set_scores);
        const side: 'a' | 'b' | null = [match.team_a_p1, match.team_a_p2].includes(user.id)
          ? 'a'
          : [match.team_b_p1, match.team_b_p2].includes(user.id)
            ? 'b'
            : null;
        return { match, sets, side, missingScores: side !== null && sets.length === 0 };
      }),
    [matches, user.id]
  );

  const missingCount = rows.filter((x) => x.missingScores).length;
  const visibleRows = rows.filter((x) =>
    view === 'all' ? true : view === 'mine' ? x.side !== null : x.missingScores
  );

  const byDay = Object.entries(groupBy(visibleRows, (x) => format(x.match.created_at ?? '', 'yyyy-MM-dd')))
    .sort(([key1], [key2]) => (isAfter(key1, key2) ? -1 : 1));

  return (
    <div>
      <AppBar
        className='!border-b !shadow-sm'
        title={t('games.list.title')}
        user={user}
      />
      <main className='flex-1 size-full pb-safe-bottom'>
        <div className="px-4 pt-3">
          <SegmentedControl<GameView>
            ariaLabel={t('games.list.title')}
            value={view}
            onChange={setView}
            options={[
              { value: 'all', label: t('games.list.tabAll') },
              { value: 'mine', label: t('games.list.tabMine') },
              { value: 'missing', label: t('games.list.tabMissing'), count: missingCount },
            ]}
          />
        </div>
        <PullToRefresh onRefresh={() => refetch()}>
          <div
            className="flex flex-col gap-2 p-4 pt-2"
            style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}
          >
            {isLoading && <ListSkeleton rows={5} />}

            {!isLoading && error && (
              <ListError
                title={t('games.list.loadError')}
                description={t('games.list.loadErrorDescription')}
                retryLabel={t('challenge.list.retry')}
                onRetry={() => refetch()}
              />
            )}

            {!isLoading && !error && visibleRows.length === 0 && (
              <Empty className="mt-12">
                <EmptyHeader>
                  <EmptyMedia variant="icon">{view === 'missing' ? <CircleCheck /> : <SearchX />}</EmptyMedia>
                  <EmptyTitle>
                    {view === 'missing' ? t('games.list.noneMissing') : t('games.list.empty')}
                  </EmptyTitle>
                  <EmptyDescription>
                    {view === 'missing'
                      ? t('games.list.noneMissingDescription')
                      : view === 'mine'
                        ? t('games.list.emptyMine')
                        : t('games.list.emptyDescription')}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}

            {!isLoading && !error && byDay.map(([key, value]) => (
              <section key={key} className="flex w-full flex-col gap-2">
                <ListSectionHeader
                  title={intlFormatDistance(parseISO(key), new Date(), { unit: 'day', locale: i18n.resolvedLanguage })}
                  count={value.length}
                />
                {[...value]
                  .sort((a, b) => (isAfter(b.match.created_at ?? '', a.match.created_at ?? '') ? 1 : -1))
                  .map(({ match, sets, side, missingScores }) => {
                    const aSets = sets.filter((s) => s.aWon).length;
                    const bSets = sets.length - aSets;
                    const winner = aSets > bSets ? 'a' : bSets > aSets ? 'b' : null;
                    const eloChange = Number(side === 'a' ? match.elo_change_a : match.elo_change_b);
                    const showElo = side !== null && match.rated && sets.length > 0 && Number.isFinite(eloChange) && eloChange !== 0;

                    return (
                      <Item
                        key={match.match_id}
                        variant="outline"
                        className={sideBar(
                          missingScores ? 'warning' : side && winner ? (winner === side ? 'success' : 'error') : 'neutral'
                        )}
                        onClick={() => navigate(`/matches/${match.match_id}`)}
                      >
                        <div className="flex w-full flex-col gap-2 py-1">
                          <div className="flex items-stretch gap-3">
                            <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                              {(['a', 'b'] as const).map((team) => (
                                <div
                                  key={team}
                                  className={cn(
                                    'flex items-center gap-1.5 truncate',
                                    winner === team ? 'font-bold' : winner ? 'text-muted-foreground' : ''
                                  )}
                                >
                                  {winner === team && <Trophy className="size-3.5 shrink-0 text-warning" />}
                                  <span className="truncate">{team === 'a' ? match.team_a_name : match.team_b_name}</span>
                                  {side === team && <Badge variant="secondary" className="shrink-0">{t('games.list.you')}</Badge>}
                                </div>
                              ))}
                            </div>
                            {sets.length > 0 && (
                              <div className="flex shrink-0 items-center gap-3 tabular-nums">
                                {sets.map((set, index) => (
                                  <div key={index} className="flex flex-col items-center gap-0.5 text-center">
                                    <span className={cn(set.aWon ? 'font-bold' : 'text-muted-foreground')}>{set.a}</span>
                                    <span className={cn(!set.aWon ? 'font-bold' : 'text-muted-foreground')}>{set.b}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {(missingScores || !match.rated || !match.is_public || showElo) && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {missingScores && (
                                <Badge variant="warning"><TriangleAlert />{t('games.list.enterScores')}</Badge>
                              )}
                              {!match.rated && <Badge variant="outline">{t('games.list.unrated')}</Badge>}
                              {!match.is_public && <Badge variant="outline"><Lock />{t('games.list.private')}</Badge>}
                              {showElo && (
                                <Badge variant={eloChange > 0 ? 'success' : 'destructive'}>
                                  {eloChange > 0 ? '+' : ''}{eloChange.toFixed(1)} Elo
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </Item>
                    );
                  })}
              </section>
            ))}
          </div>
        </PullToRefresh>
        {/* Every player may enter their own matches (add_match_with_sets checks participation). */}
        <div
          className="fixed right-6 z-50"
          style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
        >
          <Button
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl bg-primary text-primary-foreground transition-all hover:-translate-y-1 active:translate-y-0 active:shadow-md"
            aria-label={t('games.list.add')}
            onClick={() => dialogs.open(ReportScore)}
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      </main>
    </div>
  );
};
export default GameList;
