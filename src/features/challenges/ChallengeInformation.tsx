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
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useGrants } from '../auth/GrantsContext';

import { PullToRefresh } from '@/components/PullToRefresh';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AppBar } from '@/components/ui/appbar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDialogs } from '@/contexts/DialogsProvider';
import { formatDateFromDatabaseNotNull } from '@/utils';
import { format, isAfter } from 'date-fns';
import { Edit, Info, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { ChallengeActivityList } from './ChallengeActivityList';
import { ChallengeLeaderboard } from './ChallengeLeaderboard';
import { CreateOrUpdateChallengeDialog } from './dialogs/CreateOrUpdateChallengeDialog';
import EnterPointDialog from './dialogs/EnterPointDialog';
import { ChallengeInformationSkeleton } from './skeleton/ChallengeInformationSkeleton';

const ChallengeInformation = ({ challengeId }: { challengeId: string }) => {
  const { t } = useTranslation();
  const { user } = useGrants();
  const dialogs = useDialogs();

  const { data: challenge = null, isLoading } = useChallenge(challengeId);
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

  if (isLoading || !challenge) {
    return <ChallengeInformationSkeleton />
  }

  return <div>
    <AppBar
      className='!border-b !shadow-sm'
      title={challenge.name}
      user={user}
      actions={
        <Has perm={"challenge.manage"}>
          <Button variant={"ghost"} size={"icon-lg"} onClick={async () => {
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
        <div>
          <div className="p-2">
            {/* Beschreibungs-Block (scrollt normal weg) */}
            <div key={"info"} className="gap-2 flex w-full max-w-lg flex-col mb-6">
              <div className="text-sm font-semibold">
                {t('costs.description')}
              </div>
              <div className="text-sm text-muted-foreground">
                {challenge.description || t('challenge.noDescription')}
              </div>
              {
                challenge.end_date && isAfter(new Date(), challenge.end_date) && <Alert key={'alert'} className='p-2' variant="info">
                  <Info />
                  <AlertDescription>
                    {t('challenge.ended', { endDate: format(challenge.end_date, "dd.MM.yyyy") })}
                  </AlertDescription>
                </Alert>
              }
            </div>
          </div>
          <Tabs defaultValue={"activity"} className="w-full relative flex flex-col">

            <div className="sticky top-14 p-2 z-40 w-full px-2 pb-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <TabsList className="grid w-full grid-cols-2 border !h-12 shadow-sm">
                <TabsTrigger value="activity" className="h-10 data-[state=active]:bg-primary/5">{t('challenge.tabs.activity')}</TabsTrigger>
                <TabsTrigger value="leaderboard" className="h-10 data-[state=active]:bg-primary/5">{t('challenge.tabs.leaderboard')}</TabsTrigger>
              </TabsList>
            </div>

            <div className='px-2'>
              <TabsContent value={"activity"} className="m-0 mt-2">
                <ChallengeActivityList challenge={challenge} user_challenge_stats={user_challenge_stats} />
              </TabsContent>

              <TabsContent value={"leaderboard"} className="m-0 mt-2">
                <ChallengeLeaderboard challenge_points={leaderboard} isLoading={isLeaderboardLoading} />
              </TabsContent>
            </div>
          </Tabs>
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
          disabled={challenge.end_date ? (isAfter(new Date(), formatDateFromDatabaseNotNull(challenge.end_date))) : false}
          onClick={async () => {
            if (challenge) {
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
            }
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
