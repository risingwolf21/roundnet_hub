import { ChallengeStatWithUser } from '@/types/supabaseTypes';
import { formatDateFromDatabase } from '@/utils';
import { useMemo } from 'react';

import { InfiniteScrollList } from '@/components/InfiniteScrollList';
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item';
import { Separator } from '@/components/ui/separator';
import { useInfiniteChallengeStats } from '@/tanstack/challenge';
import groupBy from 'lodash.groupby';

type ChallengeActivityListProps = {
  challenge: Challenge;
};

export const ChallengeActivityListShadcn = ({ challenge }: ChallengeActivityListProps) => {
  const { data: stats, fetchNextPage, isFetchingNextPage, hasNextPage } = useInfiniteChallengeStats(challenge.id);

  const sortedEntries = useMemo(() => {
    const grouped = groupBy(
      stats?.pages.flatMap((x) => x.data) ?? [],
      (a) => formatDateFromDatabase(a.created_at)?.toDateString() ?? ''
    );
    return Object.entries(grouped).sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime());
  }, [stats]);

  return (<InfiniteScrollList
    hasNextPage={hasNextPage}
    isFetchingNextPage={isFetchingNextPage}
    fetchNextPage={fetchNextPage}
  >
    {sortedEntries.map(([date, entries]: [string, ChallengeStatWithUser[]]) => (
      <div key={date}>
        <div className="text-sm font-semibold py-2 pl-1">
          {date}
        </div>
        <div className='flex flex-col gap-2 p-0'>
          {entries.map((x) => (
            <Item key={x.fullUser.id} variant={"outline"} className='p-2'>
              <ItemContent>
                <ItemTitle className="line-clamp-1 px-2">
                  {x.fullUser.name}
                </ItemTitle>
                <ItemDescription className='px-2'>
                  +{x.count}
                </ItemDescription>

                {
                  (x.meta?.category || x.meta?.comment) && <>
                    <Separator />
                    <ItemTitle className="line-clamp-1 font-semibold px-2">
                      {x.meta.category}
                    </ItemTitle>
                    <ItemDescription className='px-2'>
                      {x.meta.comment}
                    </ItemDescription>
                  </>
                }
              </ItemContent>
              {
                x.image_url && <ItemMedia variant="image" className='h-75 w-full max-w-1/2'>
                  <img
                    src={x.image_url}
                    loading='lazy'
                    className="w-full h-full"
                  />
                </ItemMedia>
              }
            </Item>
          ))}
        </div>
      </div>
    ))
    }
  </InfiniteScrollList >
  );
};
