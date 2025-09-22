import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Skeleton from '@mui/material/Skeleton';

export const LoadingDrinkItem = () => {
  return (
    <ListItem divider secondaryAction={<Skeleton width={'30px'} height={'30px'} variant={'rectangular'} />}>
      <ListItemAvatar>
        <Skeleton width={'40px'} height={'40px'} variant={'rectangular'} sx={{ borderRadius: 2 }} />
      </ListItemAvatar>
      <ListItemText
        primary={<Skeleton variant={'text'} width={'65%'} />}
        secondary={<Skeleton variant={'text'} width={'65%'} />}
      />
    </ListItem>
  );
};
