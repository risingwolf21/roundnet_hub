import React from 'react';
import { Stack, Typography, List, ListItem, ListItemAvatar, Avatar, ListItemText, CardMedia } from '@mui/material';
import { AccountBox } from '@mui/icons-material';
import { groupBy } from 'lodash';
import { formatDateFromDatabase } from 'src/utils';
import { ChallengeStatWithUser } from 'src/types/supabaseTypes';

export const ChallengeActivityList = ({ stats }: { stats: ChallengeStatWithUser[] }) => {
  const grouped = groupBy(stats ?? [], (a) => formatDateFromDatabase(a.created_at).toDateString());
  const sortedEntries = Object.entries(grouped).sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <Stack spacing={1} direction="column" sx={{ m: 1, mb: 12 }}>
      {sortedEntries.map(([date, entries]) => (
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
                <ListItemText primary={"+1"} secondary={x.fullUser.displayName} />
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
    </Stack>
  );
};