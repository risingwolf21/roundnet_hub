import { ChallengeStatWithUser } from '@/types/supabaseTypes';
import { formatDateFromDatabase } from '@/utils';
import { useMemo } from 'react';

import { InfiniteScrollList } from '@/components/InfiniteScrollList';
import { useInfiniteChallengeStats } from '@/tanstack/challenge';
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
  challenge: Challenge;
};

export const ChallengeActivityList = ({ challenge }: ChallengeActivityListProps) => {
  const { data: stats, fetchNextPage, isFetchingNextPage, hasNextPage } = useInfiniteChallengeStats(challenge.id);

  const sortedEntries = useMemo(() => {
    const grouped = groupBy(
      stats?.pages.flatMap((x) => x.data) ?? [],
      (a) => formatDateFromDatabase(a.created_at)?.toDateString() ?? ''
    );
    return Object.entries(grouped).sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime());
  }, [stats]);

  return (
    <Stack spacing={1} direction="column" sx={{ pl: 1, mb: 12 }}>
      <InfiniteScrollList
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      >
        {sortedEntries.map(([date, entries]: [string, ChallengeStatWithUser[]]) => (
          <Stack spacing={1} direction="column" key={date}>
            <Typography sx={{ textAlign: 'center', color: 'rgba(0,0,0,0.6)' }}>{date}</Typography>
            <List>
              {entries.map((x) => (
                <ListItem divider sx={{ display: 'flex', p: 0, mr: 4, justifyContent: 'space-between' }} key={x.id}>
                  <Stack direction={"row"}>
                    <Stack sx={{ justifyContent: "center" }}>
                      <ListItemAvatar>
                        <Avatar sx={{ borderRadius: 2 }}>
                          {x.fullUser.avatarUrl ? (
                            <img src={x.fullUser.avatarUrl} alt="avatar" width="100%" height="100%" />
                          ) : (
                            <AccountBox />
                          )}
                        </Avatar>
                      </ListItemAvatar>
                    </Stack>
                    <Stack>
                      <ListItemText primary={`+${x.count}`} secondary={x.fullUser.displayName} />
                      <ListItemText primary={x.meta?.category} secondary={x.meta?.comment} />
                    </Stack>
                  </Stack>
                  {x.image_url && (
                    <CardMedia
                      component="img"
                      loading="lazy"
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
      </InfiniteScrollList>
    </Stack>
  );
};
