import { Box, Divider, ListItem, ListItemAvatar, ListItemText, Skeleton } from '@mui/material';

export const LoadingEventInformation = () => (
  <Box sx={{ px: 2, pt: 1 }}>
    <Box sx={{ p: 0, alignSelf: 'center' }}>
      <Skeleton variant={'rectangular'} />
      <Skeleton sx={{ mt: 1 }} variant={'rectangular'} />
      <Skeleton sx={{ mt: 1 }} variant={'rectangular'} />
      <Divider sx={{ pt: 1 }} />
      <Skeleton sx={{ mt: 2, mb: 2 }} width={'150px'} variant={'rectangular'} />
      <ListItem
        divider
        disablePadding
        sx={{ py: 1 }}
        secondaryAction={<Skeleton variant={'rectangular'} width={'35px'} height={'35px'} />}
      >
        <ListItemAvatar>
          <Skeleton variant={'circular'} width={'25px'} height={'25px'} />
        </ListItemAvatar>
        <ListItemText primary={<Skeleton variant={'rectangular'} width={'65%'} />} />
      </ListItem>
      <ListItem
        divider
        disablePadding
        sx={{ py: 1 }}
        secondaryAction={<Skeleton variant={'rectangular'} width={'35px'} height={'35px'} />}
      >
        <ListItemAvatar>
          <Skeleton variant={'circular'} width={'25px'} height={'25px'} />
        </ListItemAvatar>
        <ListItemText primary={<Skeleton variant={'rectangular'} width={'65%'} />} />
      </ListItem>
      <Skeleton sx={{ mt: 2, mb: 2 }} width={'150px'} variant={'rectangular'} />
      <ListItem sx={{ py: 2 }} divider disablePadding>
        <ListItemAvatar>
          <Skeleton variant={'rectangular'} width={'40px'} height={'40px'} sx={{ borderRadius: 2 }} />
        </ListItemAvatar>
        <ListItemText
          primary={<Skeleton variant={'rectangular'} width={'35%'} />}
          secondary={<Skeleton sx={{ mt: 1 }} variant={'rectangular'} width={'65%'} />}
        />
      </ListItem>
      <ListItem sx={{ py: 2 }} divider disablePadding>
        <ListItemAvatar>
          <Skeleton variant={'rectangular'} width={'40px'} height={'40px'} sx={{ borderRadius: 2 }} />
        </ListItemAvatar>
        <ListItemText
          primary={<Skeleton variant={'rectangular'} width={'35%'} />}
          secondary={<Skeleton sx={{ mt: 1 }} variant={'rectangular'} width={'65%'} />}
        />
      </ListItem>
    </Box>
  </Box>
);
