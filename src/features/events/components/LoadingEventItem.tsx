import { ListItem, ListItemAvatar, ListItemText, Skeleton } from '@mui/material';
import { Box } from '@mui/system';

export const LoadingEventItem = () => {
  return (
    <ListItem
      secondaryAction={
        <Box sx={{ display: 'flex', flexDirection: 'row' }}>
          <Skeleton sx={{ mr: 1 }} width={'30px'} height={'30px'} variant={'rectangular'} />
          <Skeleton sx={{ ml: 1 }} width={'30px'} height={'30px'} variant={'rectangular'} />
        </Box>
      }
    >
      <ListItemAvatar>
        <Skeleton width={'40px'} height={'40px'} variant={'circular'} />
      </ListItemAvatar>
      <ListItemText
        primary={<Skeleton variant={'text'} width={'65%'} />}
        secondary={<Skeleton variant={'text'} width={'65%'} />}
      />
    </ListItem>
  );
};
