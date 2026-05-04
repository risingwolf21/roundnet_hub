import { PullToRefresh } from '@/components/PullToRefresh';
import { useChallengePodiums, useChallenges, useInsertChallengeMutation } from '@/tanstack/challenge';
import { withProfiler } from '@sentry/react';

import { AppBar } from '@/components/ui/appbar';
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Item, ItemContent } from '@/components/ui/item';
import { Skeleton } from '@/components/ui/skeleton';
import { useDialogs } from '@/contexts/DialogsProvider';
import { Has } from '@/hooks/useGrants';
import groupBy from 'lodash.groupby';
import { AlertCircle, Archive, Plus, RefreshCcw } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useGrants } from '../auth/GrantsContext';
import { CreateOrUpdateChallengeDialog } from './dialogs/CreateOrUpdateChallengeDialog';


const ChallengeListSkeleton = () => (
  <div className='flex flex-col gap-2 p-2'>
    {[1, 2, 3].map((i) => (
      <Skeleton key={i} className="h-[60px] w-full rounded-xl" />
    ))}
    <div className='pt-4 flex flex-row gap-2 items-center'>
      <Skeleton className="h-6 w-32" />
    </div>
    <Skeleton className="h-[200px] w-full rounded-xl" />
  </div>
);

const ChallengeListError = ({ message, onRetry }: { message: string, onRetry: () => void }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center gap-4">
    <div className="bg-destructive/10 p-3 rounded-full">
      <AlertCircle className="size-8 text-destructive" />
    </div>
    <div>
      <h3 className="text-lg font-semibold">Fehler beim Laden</h3>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
    <Button variant="outline" onClick={onRetry} className="gap-2">
      <RefreshCcw className="size-4" />
      Erneut versuchen
    </Button>
  </div>
);

const ChallengeListPage = () => {
  const { user } = useGrants();
  const dialogs = useDialogs();
  const navigate = useNavigate();

  const { data: challenges = [], error, isLoading, refetch } = useChallenges();
  const { data: podium = [], isLoading: isPodiumLoading, refetch: archiveRefetch } = useChallengePodiums();
  const insertChallengeMutation = useInsertChallengeMutation();

  const handleRefresh = async () => {
    await Promise.all([refetch(), archiveRefetch()]);
  };

  return (
    <div>
      <AppBar
        className='!border-b !shadow-sm'
        title="Challenges"
        user={user}
        actions={
          <Has perm={"challenge.create"}>
            <Button variant={"ghost"} size={"icon-lg"}
              onClick={async () => {
                const result = await dialogs.open(CreateOrUpdateChallengeDialog, { user });
                if (result) {
                  await insertChallengeMutation.mutateAsync(result, {
                    onError: (error) =>
                      toast.error('Challenge konnte nicht erstellt werden. ' + error.message),
                    onSuccess: (data) => {
                      toast.success('Challenge wurde erfolgreich erstellt.');
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
          {isLoading || isPodiumLoading ? (
            <ChallengeListSkeleton />
          ) : error ? (
            <ChallengeListError
              message={error instanceof Error ? error.message : 'Unbekannter Fehler'}
              onRetry={handleRefresh}
            />
          ) : (
            <div className='flex flex-col gap-2 p-2'>
              {
                challenges.map((entry) => <Item key={entry.id} variant={"outline"} className='p-1 pl-2' onClick={() => {
                  navigate(`/challenges/${entry.id}`);
                }}><div>
                    <div className='text-md font-semibold'>{entry.name}</div>
                    <div className='text-md text-muted-foreground'>{entry.description}</div>
                  </div>
                </Item>)
              }

              <div className='text-lg font-bold pt-4 flex flex-row gap-2 items-center'>
                <Archive />
                Archivierte Challenges
              </div>

              {
                podium.map((entry) => <Item key={entry.challenge_id} variant={"outline"} className='p-1 pl-2' onClick={() => {
                  navigate(`/challenges/${entry.challenge_id}`);
                }}>
                  <ItemContent className='p-2'>
                    <div className='text-base font-semibold'>{entry.challenge_name}</div>

                    <div
                      className="grid [grid-template-columns:repeat(var(--rank-count),1fr)] gap-2 mx-auto"
                      style={
                        {
                          "--rank-count": new Set(entry.podium.map((x) => x.rank)).size.toString(),
                        } as React.CSSProperties
                      }>
                      {Object.entries(groupBy(entry.podium, x => x.rank.toString())).map(([rank, items]) => {
                        return (
                          <div
                            key={rank}
                            className={`flex flex-col items-center w-full transition-all`}
                          >
                            <Card className="w-full border-0 shadow-none bg-zinc-50 dark:bg-zinc-900 gap-1 pb-1">
                              <CardHeader className='w-full flex flex-col items-center'>
                                <div className='text-3xl'>
                                  {
                                    rank === '1' ? '🥇' : rank === '2' ? '🥈' : rank === '3' ? '🥉' : `#${rank}`
                                  }
                                </div>
                                <AvatarGroup>
                                  {
                                    items.map((x: {
                                      user_id: string;
                                      name: string;
                                      score: number;
                                      rank: number;
                                      image_url: string;
                                    }) => (
                                      <Avatar key={x.user_id}>
                                        <AvatarImage src={x.image_url} alt={x.name} />
                                        <AvatarFallback>{x.name.charAt(0)}</AvatarFallback>
                                      </Avatar>
                                    ))
                                  }
                                </AvatarGroup>
                              </CardHeader>
                              <CardContent className="flex flex-col items-center p-2 text-center">
                                <div className='w-full truncate'>
                                  {
                                    items.map((x) => (
                                      <div key={x.user_id} className='text-sm text-muted-foreground'>
                                        {x.name}
                                      </div>
                                    ))
                                  }
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        );
                      })}
                    </div>
                  </ItemContent>
                </Item>)
              }
            </div>
          )}
        </PullToRefresh>
      </main>
    </div>
  );
};

export default withProfiler(ChallengeListPage);