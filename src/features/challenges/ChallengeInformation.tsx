import { Has } from '@/hooks/useGrants';
import { queryClient } from '@/lib/queryClient';
import {
  challengeKeys,
  useChallenge,
  useChallengeLeaderboard,
  useChallengeStatsForUser,
  useIncreasePointForUserMutation,
  useUpdateChallengeMutation
} from '@/tanstack/challenge';
import { captureException, withProfiler } from '@sentry/react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGrants } from '../auth/GrantsContext';

import { groupSideBar, ListError, SegmentedControl } from '@/components/list/ListParts';
import { PullToRefresh } from '@/components/PullToRefresh';
import { AppBar } from '@/components/ui/appbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDialogs } from '@/contexts/DialogsProvider';
import { cn } from '@/lib/utils';
import { formatDateFromDatabaseNotNull } from '@/utils';
import { useGroup } from '@/tanstack/groups';
import { differenceInCalendarDays, isAfter, isSameDay, isSameWeek } from 'date-fns';
import { Edit, Infinity as InfinityIcon, Plus, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { ChallengeActivityList } from './ChallengeActivityList';
import { ChallengeLeaderboard, rankLeaderboard } from './ChallengeLeaderboard';
import { CreateOrUpdateChallengeDialog } from './dialogs/CreateOrUpdateChallengeDialog';
import EnterPointDialog from './dialogs/EnterPointDialog';
import { ChallengeInformationSkeleton } from './skeleton/ChallengeInformationSkeleton';

type View = 'activity' | 'leaderboard';

const Stat = ({ label, value, limit }: { label: string; value: string | number; limit?: number | null }) => (
  <div className="flex flex-col items-center rounded-lg bg-muted px-2 py-2 text-center">
    <span className="text-xl font-bold tabular-nums">
      {value}
      {limit ? <span className="text-sm font-medium text-muted-foreground"> / {limit}</span> : null}
    </span>
    <span className="text-xs text-muted-foreground">{label}</span>
  </div>
);

const ChallengeInformation = ({ challengeId }: { challengeId: string }) => {
  const { t, i18n } = useTranslation();
  const { user } = useGrants();
  const dialogs = useDialogs();
  const [view, setView] = useState<View>('activity');
  // eslint-disable-next-line @eslint-react/naming-convention/use-state
  const [now] = useState(() => new Date());

  const { data: challenge = null, isLoading, isError, refetch: refetchChallenge } = useChallenge(challengeId);
  const { data: group } = useGroup(challenge?.group);
  const { data: user_challenge_stats = [] } = useChallengeStatsForUser(challengeId, user);
  const { data: leaderboard = [], isLoading: isLeaderboardLoading } = useChallengeLeaderboard(challengeId);

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: challengeKeys.challengeInformation(challengeId) });
  };

  const increasePointMutation = useIncreasePointForUserMutation(challengeId);
  const updateChallengeMutation = useUpdateChallengeMutation();

  const increaseChallengePoint = useCallback(
    async (
      created_at: Date,
      image: { dataUrl: string; fileName: string } | null,
      count: number,
      comment?: string,
      category?: string
    ) => {
      if (!user || !challenge) {
        toast.error(t('challenge.somethingWentWrong'));
        return;
      }

      increasePointMutation.mutate(
        {
          user,
          challenge: challenge.id,
          created_at,
          image,
          count,
          comment,
          category,
        },
        {
          onSuccess: (data) => {
            toast.success(data.imageFailedToUpload ? t('challenge.pointAddedImageFailed') : t('challenge.pointAdded'));
          },
          onError: (error) => {
            captureException(error);
            toast.error(error.message);
          },
        }
      );
    },
    [challenge, user, increasePointMutation, t]
  );

  const mine = useMemo(() => {
    const dated = user_challenge_stats.map((x) => ({ count: x.count, date: new Date(x.created_at) }));
    const sum = (list: typeof dated) => list.reduce((acc, x) => acc + x.count, 0);
    const place = rankLeaderboard(leaderboard).find((x) => x.entry.user === user.id)?.place;
    return {
      total: sum(dated),
      today: sum(dated.filter((x) => isSameDay(x.date, now))),
      week: sum(dated.filter((x) => isSameWeek(x.date, now, { weekStartsOn: 1 }))),
      rank: place === undefined ? null : place + 1,
    };
  }, [user_challenge_stats, leaderboard, user.id, now]);

  if (isLoading) {
    return <ChallengeInformationSkeleton />;
  }

  if (isError || !challenge) {
    return (
      <div>
        <AppBar title={t('challenge.info.notFoundTitle')} user={user} primaryAction="back" navigateBackPath="/challenges/list" />
        <main className="flex-1 size-full pb-safe-bottom">
          <ListError
            title={t('challenge.info.notFoundTitle')}
            description={t(isError ? 'challenge.somethingWentWrong' : 'challenge.info.notFoundDescription')}
            retryLabel={t('challenge.list.retry')}
            onRetry={() => refetchChallenge()}
          />
        </main>
      </div>
    );
  }

  const dateFormat = new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium' });
  const ended = !!challenge.end_date && isAfter(now, formatDateFromDatabaseNotNull(challenge.end_date));
  const notStarted = !!challenge.start_date && isAfter(new Date(challenge.start_date), now);
  const daysLeft = challenge.end_date ? differenceInCalendarDays(new Date(challenge.end_date), now) : null;

  return <div>
    <AppBar
      className='!border-b !shadow-sm'
      title={challenge.name}
      user={user}
      actions={
        <Has perm={"challenge.manage"}>
          <Button variant={"ghost"} size={"icon-lg"} aria-label={t('challenge.dialog.titleUpdate')} onClick={async () => {
            const result = await dialogs.open(CreateOrUpdateChallengeDialog, { user, challenge });
            if (result) {
              await updateChallengeMutation.mutateAsync(
                { challenge: result },
                {
                  onError: (error) =>
                    toast.error(t('challenge.updateError', { error: error.message })),
                  onSuccess: () =>
                    toast.success(t('challenge.updateSuccess')),
                }
              );
            }
          }}>
            <Edit />
          </Button>
        </Has>
      }
    />
    <PullToRefresh onRefresh={refetch}>
      <main className="flex-1 flex flex-col size-full pb-safe-bottom">
        <div className="flex flex-col gap-3 p-4" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
          <section
            className={cn('flex flex-col gap-3 rounded-xl border bg-card p-4', groupSideBar(group?.color).className)}
            style={groupSideBar(group?.color).style}
          >
            {group && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: group.color }} />
                {group.name}
              </span>
            )}
            <p className="text-sm text-muted-foreground">{challenge.description || t('challenge.noDescription')}</p>
            <div className="flex flex-wrap items-center gap-1.5">
              {ended ? (
                <Badge variant="secondary">{t('challenge.list.endedOn', { date: dateFormat.format(new Date(challenge.end_date!)) })}</Badge>
              ) : notStarted ? (
                <Badge variant="info">{t('challenge.list.startsOn', { date: dateFormat.format(new Date(challenge.start_date!)) })}</Badge>
              ) : daysLeft === null ? (
                <Badge variant="success">
                  <InfinityIcon />
                  {t('challenge.list.ongoing')}
                </Badge>
              ) : (
                <Badge variant={daysLeft <= 3 ? 'warning' : 'success'}>
                  {daysLeft <= 0 ? t('challenge.list.endsToday') : t('challenge.list.endsInDays', { count: daysLeft })}
                </Badge>
              )}
              {challenge.max_points_per_week ? (
                <Badge variant="outline">{t('challenge.info.maxPerWeek', { count: challenge.max_points_per_week })}</Badge>
              ) : null}
              {challenge.automated && (
                <Badge variant="outline">
                  <Zap />
                  {t('challenge.list.automated')}
                </Badge>
              )}
            </div>
            {challenge.automated && (
              <p className="text-xs text-muted-foreground">{t('challenge.automatedChallenge')}</p>
            )}
          </section>

          <section aria-label={t('challenge.info.yourProgress')} className={cn('grid gap-2', mine.rank ? 'grid-cols-3' : 'grid-cols-2')}>
            <Stat label={t('challenge.info.yourPoints')} value={mine.total} />
            {mine.rank && <Stat label={t('challenge.info.yourRank')} value={`#${mine.rank}`} />}
            <Stat label={t('challenge.info.today')} value={mine.today} limit={challenge.max_points_per_day} />
          </section>
          {challenge.max_points_per_week ? (
            <p className="px-1 text-xs text-muted-foreground">
              {t('challenge.info.thisWeek', { count: mine.week, max: challenge.max_points_per_week })}
            </p>
          ) : null}

          <div className="sticky top-14 z-40 -mx-4 bg-background/95 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SegmentedControl<View>
              value={view}
              onChange={setView}
              ariaLabel={t('challenge.info.view')}
              options={[
                { value: 'activity', label: t('challenge.tabs.activity') },
                { value: 'leaderboard', label: t('challenge.tabs.leaderboard') },
              ]}
            />
          </div>

          {view === 'activity' ? (
            <ChallengeActivityList challenge={challenge} user_challenge_stats={user_challenge_stats} />
          ) : (
            <ChallengeLeaderboard challenge_points={leaderboard} isLoading={isLeaderboardLoading} currentUserId={user.id} />
          )}
        </div>
      </main>
    </PullToRefresh>
    <Has perm={'challenges.stats.write'}>
      <div
        className="fixed right-6 z-50"
        style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl bg-primary text-primary-foreground transition-all hover:-translate-y-1 active:translate-y-0 active:shadow-md"
          disabled={ended}
          onClick={async () => {
            const result = await dialogs.open(EnterPointDialog, {
              dates: user_challenge_stats.map((x) => x.created_at),
              maxEntriesPerWeek: challenge.max_points_per_week,
              maxEntriesPerDay: challenge.max_points_per_day,
              comments_enabled: challenge.comments_enabled,
              category_enabled: challenge.category_enabled,
              category_options: challenge.category_options
            });

            if (result)
              increaseChallengePoint(result.date, result.image, result.count, result.comment, result.category);
          }}
        >
          <Plus className="h-6 w-6" />
          <span className="sr-only">{t('challenge.createPoint')}</span>
        </Button>
      </div>
    </Has>
  </div>
};

export default withProfiler(ChallengeInformation);
