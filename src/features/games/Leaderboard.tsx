import { ListError, ListSectionHeader, ListSkeleton } from '@/components/list/ListParts';
import { PullToRefresh } from '@/components/PullToRefresh';
import { AppBar } from '@/components/ui/appbar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Item } from '@/components/ui/item';
import { useDialogs } from '@/contexts/DialogsProvider';
import { cn } from '@/lib/utils';
import { useLeaderboard } from '@/tanstack/games';
import { Minus, SearchX, TrendingDown, TrendingUp, Trophy } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGrants } from '../auth/GrantsContext';
import { GameHistoryDialog } from './dialogs/GameHistoryDialog';

type Entry = NonNullable<ReturnType<typeof useLeaderboard>['data']>[number];

const MEDAL_CLASSES = ['bg-warning/20 text-warning-900', 'bg-muted text-foreground', 'bg-error/10 text-error-900'];

const Trend = ({ value, className }: { value: number | null; className?: string }) => {
  const { t } = useTranslation();
  const trend = value ?? 0;
  const Icon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  return (
    <span
      title={t('matches.leaderboardTooltip', { trend: trend.toFixed(1) })}
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium tabular-nums',
        trend > 0 ? 'text-success' : trend < 0 ? 'text-error' : 'text-muted-foreground',
        className
      )}
    >
      <Icon className="size-3.5" />
      {trend > 0 ? '+' : ''}
      {trend.toFixed(1)}
    </span>
  );
};

const PlayerAvatar = ({ entry, className }: { entry: Entry; className?: string }) => {
  const dialogs = useDialogs();
  return (
    <Avatar
      className={className}
      onClick={(event) => {
        if (!entry.linked_user_id) return;
        event.stopPropagation();
        dialogs.userProfile(entry.linked_user_id);
      }}
    >
      <AvatarImage src={entry.avatar_url || undefined} alt={entry.name || undefined} />
      <AvatarFallback>{entry.name ? entry.name[0] : 'U'}</AvatarFallback>
    </Avatar>
  );
};

const Podium = ({ entries, onOpen }: { entries: Entry[]; onOpen: (entry: Entry) => void }) => {
  const { t } = useTranslation();
  // Visual order: 2nd, 1st, 3rd
  const order = [entries[1], entries[0], entries[2]];
  return (
    <div className="grid grid-cols-3 items-end gap-2">
      {order.map((entry) => {
        const place = Math.min(entry.position ?? 1, 3) - 1;
        const first = place === 0;
        return (
          <button
            key={entry.player_id}
            type="button"
            onClick={() => onOpen(entry)}
            aria-label={`${entry.position}. ${entry.name}, ${entry.rating?.toFixed()}`}
            className={cn(
              'flex min-w-0 flex-col items-center gap-1 rounded-xl border bg-card px-2 pb-3 pt-3 text-center transition-colors hover:bg-muted/50',
              first && 'pb-5 pt-4'
            )}
          >
            <div className="relative">
              <PlayerAvatar entry={entry} className={cn(first ? 'size-16' : 'size-12')} />
              <span
                className={cn(
                  'absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full border-2 border-card text-xs font-bold',
                  MEDAL_CLASSES[place]
                )}
              >
                {first ? <Trophy className="size-3.5" /> : entry.position}
              </span>
            </div>
            <span className="mt-1 w-full truncate text-sm font-semibold">{entry.name}</span>
            <span className="text-lg font-bold tabular-nums leading-none">{entry.rating?.toFixed()}</span>
            <Trend value={entry.trend_30_days} />
            {entry.activity_status === 'Provisional' && (
              <Badge variant="outline">{t('games.leaderboard.provisional')}</Badge>
            )}
          </button>
        );
      })}
    </div>
  );
};

const Leaderboard = () => {
  const { t } = useTranslation();
  const { user } = useGrants();
  const dialogs = useDialogs();
  const [search, setSearch] = useState('');
  const { data: leaderboard = [], isLoading, error, refetch } = useLeaderboard(0);

  const isMe = (entry: Entry) => entry.linked_user_id === user.id || entry.player_id === user.id;
  const mine = leaderboard.find(isMe);
  const query = search.trim().toLowerCase();
  const filtered = query ? leaderboard.filter((x) => (x.name ?? '').toLowerCase().includes(query)) : leaderboard;
  const showPodium = !query && leaderboard.length >= 3;
  const podium = showPodium ? leaderboard.slice(0, 3) : [];
  const rest = showPodium ? leaderboard.slice(3) : filtered;

  const openHistory = (entry: Entry) => {
    if (entry.player_id && entry.name && entry.rating != null)
      dialogs.open(GameHistoryDialog, { player_id: entry.player_id, name: entry.name, rating: entry.rating.toFixed() });
  };

  return (
    <div>
      <AppBar
        className="!border-b !shadow-sm"
        title={t('matches.leaderboard')}
        user={user}
        showSearch={leaderboard.length > 5}
        searchPlaceholder={t('common.searchPlaceholder')}
        searchValue={search}
        onSearchChange={setSearch}
      />
      <main className="flex-1 size-full pb-safe-bottom">
        <PullToRefresh onRefresh={() => refetch()}>
          <div className="flex flex-col gap-3 p-4">
            {isLoading && <ListSkeleton rows={6} />}

            {!isLoading && error && (
              <ListError
                title={t('games.leaderboard.loadError')}
                description={t('games.leaderboard.loadErrorDescription')}
                retryLabel={t('challenge.list.retry')}
                onRetry={() => refetch()}
              />
            )}

            {!isLoading && !error && leaderboard.length === 0 && (
              <Empty className="mt-12">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Trophy />
                  </EmptyMedia>
                  <EmptyTitle>{t('games.leaderboard.empty')}</EmptyTitle>
                  <EmptyDescription>{t('games.leaderboard.emptyDescription')}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}

            {!isLoading && !error && leaderboard.length > 0 && (
              <>
                {mine ? (
                  <Item variant="outline" className="border-primary/40 bg-primary/5" onClick={() => openHistory(mine)}>
                    <div className="flex w-full items-center gap-3">
                      <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <span className="text-[10px] uppercase leading-none opacity-80">{t('games.leaderboard.rank')}</span>
                        <span className="text-lg font-bold leading-tight">{mine.position}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{t('games.leaderboard.yourRank')}</div>
                        <div className="text-xs text-muted-foreground">
                          {t('games.leaderboard.matches', { count: mine.matches_played ?? 0 })}
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-xl font-bold tabular-nums leading-none">{mine.rating?.toFixed()}</span>
                        <Trend value={mine.trend_30_days} />
                      </div>
                    </div>
                  </Item>
                ) : (
                  <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                    {t('games.leaderboard.notRankedHint')}
                  </div>
                )}

                {showPodium && <Podium entries={podium} onOpen={openHistory} />}

                {query && filtered.length === 0 && (
                  <Empty className="mt-6">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <SearchX />
                      </EmptyMedia>
                      <EmptyTitle>{t('games.leaderboard.noResults')}</EmptyTitle>
                    </EmptyHeader>
                  </Empty>
                )}

                {rest.length > 0 && (
                  <section className="flex flex-col gap-2">
                    <ListSectionHeader title={t('matches.leaderboard')} count={leaderboard.length} className="px-0 pt-0" />
                    {rest.map((entry) => (
                      <Item
                        key={entry.player_id}
                        variant="outline"
                        className={cn(isMe(entry) && 'border-primary/40 bg-primary/5')}
                        onClick={() => openHistory(entry)}
                      >
                        <div className="flex w-full items-center gap-3 py-0.5">
                          <span className="w-7 shrink-0 text-center text-base font-bold tabular-nums text-muted-foreground">
                            {entry.position}
                          </span>
                          <PlayerAvatar entry={entry} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate font-medium">{entry.name}</span>
                              {isMe(entry) && (
                                <Badge variant="secondary" className="shrink-0">
                                  {t('games.list.you')}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span>{t('games.leaderboard.matches', { count: entry.matches_played ?? 0 })}</span>
                              {entry.activity_status === 'Provisional' && (
                                <Badge variant="outline">{t('games.leaderboard.provisional')}</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-col items-end">
                            <span className="text-lg font-bold tabular-nums leading-none">{entry.rating?.toFixed()}</span>
                            <Trend value={entry.trend_30_days} />
                          </div>
                        </div>
                      </Item>
                    ))}
                  </section>
                )}
              </>
            )}
          </div>
        </PullToRefresh>
      </main>
    </div>
  );
};

export default Leaderboard;
