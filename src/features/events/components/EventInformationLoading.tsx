import { List, ListItemText, Skeleton } from '@mui/material';
import React from 'react';
import { LoadingEventInformation } from './LoadingEventInformation';

const EventInformationLoading = () => {
  return (
    <List sx={{ p: 0, pb: 'calc(16px + env(safe-area-inset-bottom))' }}>
      <Skeleton variant={'rectangular'} width={'100%'} height={'150px'} />
      <ListItemText
        sx={{ m: 0, mt: 2 }}
        primary={<Skeleton variant={'rectangular'} />}
        secondary={<Skeleton sx={{ mt: 1 }} variant={'rectangular'} />}
      />
      <LoadingEventInformation />
    </List>
  );
};

export default EventInformationLoading;
