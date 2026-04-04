import { ChallengeStatWithUser } from '@/types/supabaseTypes';
import { formatDateFromDatabase } from '@/utils';
import { useMemo } from 'react';

import { InfiniteScrollList } from '@/components/InfiniteScrollList';
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '@/components/ui/item';
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
        <div className="text-sm font-semibold ml-2">
          {date}
        </div>
        <div className='flex flex-col gap-2 p-2'>
          {entries.map((x) => (
            <Item key={x.fullUser.id} variant={"outline"} className='p-0'>
              <ItemContent className='p-2'>
                <ItemTitle className="line-clamp-1">
                  {x.fullUser.name}
                </ItemTitle>
                <ItemDescription>
                  +{x.count}
                </ItemDescription>
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
            // <div key={x.fullUser.id} className="flex items-center justify-between rounded-md border p-2">
            //   <div className="flex items-center gap-2">
            //     <Avatar>
            //       <AvatarImage src={x.fullUser.avatarUrl || undefined} alt={x.fullUser.name || undefined} />
            //       <AvatarFallback>{x.fullUser.name ? x.fullUser.name[0] : 'U'}</AvatarFallback>
            //     </Avatar>
            //     <div>
            //       <div>{x.fullUser.name}</div>
            //     </div>
            //   </div>
            // </div>
            // <ListItem divider sx={{ display: 'flex', p: 0, mr: 4, justifyContent: 'space-between' }} key={x.id}>
            //   <Stack direction={"row"}>
            //     <Stack sx={{ justifyContent: "center" }}>
            //       <ListItemAvatar>
            //         <Avatar sx={{ borderRadius: 2 }}>
            //           {x.fullUser.avatarUrl ? (
            //             <img src={x.fullUser.avatarUrl} alt="avatar" width="100%" height="100%" />
            //           ) : (
            //             <AccountBox />
            //           )}
            //         </Avatar>
            //       </ListItemAvatar>
            //     </Stack>
            //     <Stack>
            //       <ListItemText primary={`+${x.count}`} secondary={x.fullUser.displayName} />
            //       <ListItemText primary={x.meta?.category} secondary={x.meta?.comment} />
            //     </Stack>
            //   </Stack>
            //   {x.image_url && (
            //     <CardMedia
            //       component="img"
            //       loading="lazy"
            //       sx={{ width: '100%', maxWidth: '50%', maxHeight: '250px' }}
            //       image={x.image_url}
            //       alt="Challenge image"
            //     />
            //   )}
            // </ListItem>
          ))}
        </div>
      </div>
    ))
    }
  </InfiniteScrollList >
  );
};
