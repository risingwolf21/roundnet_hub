import { ChallengeStatWithUser } from '@/types/supabaseTypes';
import { formatDateFromDatabase } from '@/utils';
import { FetchNextPageOptions, InfiniteData, InfiniteQueryObserverResult } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import AccountBox from '@mui/icons-material/AccountBox';
import Avatar from '@mui/material/Avatar';
import CardMedia from '@mui/material/CardMedia';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import groupBy from 'lodash.groupby';

type ChallengeActivityListProps = {
  stats: InfiniteData<{ data: ChallengeStatWithUser[]; nextPage: number | undefined }, unknown> | undefined;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: (options?: FetchNextPageOptions) => Promise<
    InfiniteQueryObserverResult<
      InfiniteData<
        {
          data: ChallengeStatWithUser[];
          nextPage: number | undefined;
        },
        unknown
      >,
      Error
    >
  >;
};

export const ChallengeActivityList = ({
  stats,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: ChallengeActivityListProps) => {
  const grouped = groupBy(stats?.pages.flatMap((x) => x.data) ?? [], (a) =>
    formatDateFromDatabase(a.created_at)?.toDateString() ?? ""
  );
  const sortedEntries = Object.entries(grouped).sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime());
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    });

    const node = loadMoreRef.current;
    if (node) observer.observe(node);

    return () => {
      if (node) observer.unobserve(node);
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return (
    <Stack spacing={1} direction="column" sx={{ m: 1, mb: 12 }}>
      {sortedEntries.map(([date, entries]: [string, ChallengeStatWithUser[]]) => (
        <Stack spacing={1} direction="column" key={date}>
          <Typography sx={{ textAlign: 'center', color: 'rgba(0,0,0,0.6)' }}>{date}</Typography>
          <List>
            {entries.map((x) => (
              <ListItem divider sx={{ display: 'flex', p: 0, mr: 4 }} key={x.id}>
                <ListItemAvatar>
                  <Avatar sx={{ borderRadius: 2 }}>
                    {x.fullUser.avatarUrl ? (
                      <img src={x.fullUser.avatarUrl} alt="avatar" width="100%" height="100%" />
                    ) : (
                      <AccountBox />
                    )}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText primary={'+1'} secondary={x.fullUser.displayName} />
                {x.image_url && (
                  <CardMedia
                    component="img"
                    sx={{ width: '100%', maxWidth: '50%', maxHeight: '250px' }}
                    image={x.image_url}
                    alt="Challenge image"
                  />
                )}
              </ListItem>
            ))}
          </List>
        </Stack>
      ))}
      {isFetchingNextPage && <p style={{ padding: '12px' }}>Lade mehr...</p>}
      <div ref={loadMoreRef} style={{ height: 40 }} />
    </Stack>
  );
};
