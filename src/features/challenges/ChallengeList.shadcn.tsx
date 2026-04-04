import { PullToRefresh } from '@/components/pull-to-refresh/PullToRefresh';
import { useArchivedChallenges, useChallenges } from '@/tanstack/challenge';
import { withProfiler } from '@sentry/react';

import { AppBar } from '@/components/ui/appbar';
import { Item } from '@/components/ui/item';
import { useNavigate } from 'react-router';
import { useGrants } from '../auth/GrantsContext';

const ChallengeListPageShadcn = () => {
  const { user } = useGrants();
  const navigate = useNavigate();

  const { data: challenges = [], error, isLoading, refetch } = useChallenges();
  const { data: archived_challenges, refetch: archiveRefetch } = useArchivedChallenges();

  return (
    <div>
      <AppBar
        className='!border-b !shadow-sm'
        title="Challenges"
        user={user}
      />
      <main className='flex-1 size-full pb-safe-bottom'>
        <PullToRefresh
          onRefresh={() => {
            refetch();
            archiveRefetch();
          }}
        >
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
          </div>
        </PullToRefresh>
      </main>
    </div>
  );
};

export default withProfiler(ChallengeListPageShadcn);
