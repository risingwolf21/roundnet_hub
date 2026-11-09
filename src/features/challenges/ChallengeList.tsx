import { ListError, ListSectionHeader, ListSkeleton, sideBar } from '@/components/list/ListParts';
import { PullToRefresh } from '@/components/PullToRefresh';
import { useChallengePodiums, useChallenges, useInsertChallengeMutation } from '@/tanstack/challenge';
import { withProfiler } from '@sentry/react';

import { AppBar } from '@/components/ui/appbar';
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import { useDialogs } from '@/contexts/DialogsProvider';
import { Has } from '@/hooks/useGrants';
import { ChallengeRepository, ChallengeWithGroup } from '@/repository/ChallengeRepository';
import { differenceInCalendarDays, format } from 'date-fns';
import groupBy from 'lodash.groupby';
import { Archive, CalendarClock, ChevronRight, Infinity as InfinityIcon, Plus, Target, Trophy, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useGrants } from '../auth/GrantsContext';
import { CreateOrUpdateChallengeDialog } from './dialogs/CreateOrUpdateChallengeDialog';

const MEDALS: Record<string, string> = { '1': '🥇', '2': '🥈', '3': '🥉' };

type ArchivedChallenge = Awaited<ReturnType<typeof ChallengeRepository.fetchPodiums>>[number];

/** Ended challenge: the winner on top, places 2 and 3 in one muted line. Tied players share a place. */
const ArchivedChallengeRow = ({ challenge, onClick }: { challenge: ArchivedChallenge; onClick: () => void }) => {
  const { t, i18n } = useTranslation();
  const places = Object.entries(groupBy(challenge.podium, (x) => x.rank.toString())).sort(([a], [b]) => Number(a) - Number(b));
  const [winners, ...others] = places.map(([rank, entries]) => ({ rank, entries }));

  return (
    <Item variant="outline" className={sideBar('neutral')} onClick={onClick}>
      <ItemContent>
        <ItemTitle className="line-clamp-2">{challenge.challenge_name}</ItemTitle>
        {challenge.end_date && (
          <ItemDescription>
            {t('challenge.list.endedOn', {
              date: new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium' }).format(new Date(challenge.end_date)),
            })}
          </ItemDescription>
        )}
        {winners ? (
          <>
            <div className="mt-1 flex items-center gap-2 rounded-lg bg-primary/10 px-2 py-1.5">
              <span className="shrink-0 text-lg leading-none" role="img" aria-label={t('challenge.info.place', { place: 1 })}>
                {MEDALS[winners.rank]}
              </span>
              <AvatarGroup className="shrink-0">
                {winners.entries.slice(0, 3).map((x) => (
                  <Avatar key={x.user_id} size="sm">
                    <AvatarImage src={x.image_url || undefined} alt={x.name} />
                    <AvatarFallback>{x.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                ))}
              </AvatarGroup>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{winners.entries.map((x) => x.name).join(', ')}</span>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {t('challenge.info.points', { count: winners.entries[0].score })}
              </span>
            </div>
            {others.length > 0 && (
              <p className="truncate px-2 text-xs text-muted-foreground">
                {others.map(({ rank, entries }) => `${MEDALS[rank] ?? `#${rank}`} ${entries.map((x) => x.name).join(', ')}`).join(' · ')}
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">{t('challenge.list.noPoints')}</p>
        )}
      </ItemContent>
      <ItemActions>
        <ChevronRight className="size-4 text-muted-foreground" />
      </ItemActions>
    </Item>
  );
};

const ChallengeRow = ({ challenge, onClick }: { challenge: ChallengeWithGroup; onClick: () => void }) => {
  const { t } = useTranslation();
  const now = new Date();
  const notStarted = !!challenge.start_date && new Date(challenge.start_date) > now;
  const daysLeft = challenge.end_date ? differenceInCalendarDays(new Date(challenge.end_date), now) : null;

  return (
    <Item variant="outline" onClick={onClick}>
      <ItemContent>
        <ItemTitle>{challenge.name}</ItemTitle>
        {challenge.description && <ItemDescription className="line-clamp-2">{challenge.description}</ItemDescription>}
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          {challenge.fullGroup && (
            <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: challenge.fullGroup.color }} />
              <span className="truncate">{challenge.fullGroup.name}</span>
            </span>
          )}
          {notStarted ? (
            <Badge variant="info">
              <CalendarClock />
              {t('challenge.list.startsOn', { date: format(new Date(challenge.start_date!), 'dd.MM.yyyy') })}
            </Badge>
          ) : daysLeft === null ? (
            <Badge variant="secondary">
              <InfinityIcon />
              {t('challenge.list.ongoing')}
            </Badge>
          ) : (
            <Badge variant={daysLeft <= 3 ? 'warning' : 'secondary'}>
              <CalendarClock />
              {daysLeft <= 0 ? t('challenge.list.endsToday') : t('challenge.list.endsInDays', { count: daysLeft })}
            </Badge>
          )}
          {challenge.max_points_per_day !== null && challenge.max_points_per_day > 0 && (
            <Badge variant="outline">
              <Target />
              {t('challenge.list.maxPerDay', { count: challenge.max_points_per_day })}
            </Badge>
          )}
          {challenge.automated && (
            <Badge variant="outline">
              <Zap />
              {t('challenge.list.automated')}
            </Badge>
          )}
        </div>
      </ItemContent>
    </Item>
  );
};

const ChallengeListPage = () => {
  const { t } = useTranslation();
  const { user } = useGrants();
  const dialogs = useDialogs();
  const navigate = useNavigate();

  const { data: challenges = [], error, isLoading, refetch } = useChallenges();
  const { data: podium = [], isLoading: isPodiumLoading, error: podiumError, refetch: archiveRefetch } = useChallengePodiums();
  const insertChallengeMutation = useInsertChallengeMutation();

  const handleRefresh = async () => {
    await Promise.all([refetch(), archiveRefetch()]);
  };

  const loading = isLoading || isPodiumLoading;
  const failure = error ?? podiumError;

  return (
    <div>
      <AppBar
        className='!border-b !shadow-sm'
        title={t('navigation.challenges')}
        user={user}
        actions={
          <Has perm={"challenge.create"}>
            <Button variant={"ghost"} size={"icon-lg"} aria-label={t('challenge.list.create')}
              onClick={async () => {
                const result = await dialogs.open(CreateOrUpdateChallengeDialog, { user });
                if (result) {
                  await insertChallengeMutation.mutateAsync(result, {
                    onError: (error) =>
                      toast.error(t('challenge.createError', { error: error.message })),
                    onSuccess: (data) => {
                      toast.success(t('challenge.createSuccess'));
                      navigate('/challenges/' + data.id);
                    },
                  });
                }
              }}>
              <Plus />
            </Button>
          </Has>
        }
      />
      <main className='flex-1 size-full pb-safe-bottom'>
        <PullToRefresh onRefresh={handleRefresh}>
          <div className='flex flex-col gap-2 p-2' style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>
            {loading && <ListSkeleton rows={4} />}

            {!loading && failure && (
              <ListError
                title={t('games.list.loadError')}
                description={failure instanceof Error ? failure.message : t('challenge.list.unknownError')}
                retryLabel={t('challenge.list.retry')}
                onRetry={handleRefresh}
              />
            )}

            {!loading && !failure && (
              <>
                {challenges.length === 0 ? (
                  <Empty className="mt-8">
                    <EmptyHeader>
                      <EmptyMedia variant="icon"><Trophy /></EmptyMedia>
                      <EmptyTitle>{t('challenge.list.empty')}</EmptyTitle>
                      <EmptyDescription>{t('challenge.list.emptyDescription')}</EmptyDescription>
                      <Has perm="challenge.create">
                        <EmptyDescription>{t('challenge.list.emptyAdminHint')}</EmptyDescription>
                      </Has>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  <section className="flex flex-col gap-2">
                    <ListSectionHeader title={t('challenge.list.active')} count={challenges.length} />
                    {challenges.map((entry) => (
                      <ChallengeRow key={entry.id} challenge={entry} onClick={() => navigate(`/challenges/${entry.id}`)} />
                    ))}
                  </section>
                )}

                {podium.length > 0 && (
                  <section className="flex flex-col gap-2">
                    <ListSectionHeader icon={<Archive />} title={t('challenge.list.archived')} count={podium.length} className="pt-4" />
                    {podium.map((entry) => (
                      <ArchivedChallengeRow key={entry.challenge_id} challenge={entry} onClick={() => navigate(`/challenges/${entry.challenge_id}`)} />
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

export default withProfiler(ChallengeListPage);
