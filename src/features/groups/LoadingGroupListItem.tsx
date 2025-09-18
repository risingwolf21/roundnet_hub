import { Box, ListItem, ListItemAvatar, ListItemText, Skeleton } from '@mui/material';
import React from 'react';

export const LoadingGroupListItem = () => {
  return (
    <ListItem
      secondaryAction={
        <Box sx={{ display: 'flex', flexDirection: 'row' }}>
          <Skeleton sx={{ mr: 1 }} width={'70px'} height={'30px'} variant={'rectangular'} />
        </Box>
      }
    >
      <ListItemAvatar sx={{ borderRadius: 2 }}>
        <Skeleton width={'40px'} height={'40px'} variant={'rectangular'} />
      </ListItemAvatar>
      <ListItemText
        primary={<Skeleton variant={'text'} width={'65%'} />}
        secondary={<Skeleton variant={'text'} width={'65%'} />}
      />
    </ListItem>
  );
};
