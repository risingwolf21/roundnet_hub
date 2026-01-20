import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Skeleton from '@mui/material/Skeleton';

export const LoadingEventInformation = () => (
  <Box sx={{ px: 2, pt: 1 }}>
    <Box sx={{ p: 0, alignSelf: 'center' }}>
      <ListItem disablePadding>
        <ListItemAvatar>
          <Skeleton variant={'rectangular'} width={'40px'} height={'40px'} sx={{ borderRadius: 2 }} />
        </ListItemAvatar>
        <ListItemText
          primary={<Skeleton variant={'rectangular'} width={'65%'} />}
          secondary={<Skeleton sx={{ mt: 1 }} variant={'rectangular'} width={'65%'} />}
        />
      </ListItem>
      <ListItem sx={{ mt: 1 }} disablePadding>
        <ListItemAvatar>
          <Skeleton variant={'rectangular'} width={'40px'} height={'40px'} sx={{ borderRadius: 2 }} />
        </ListItemAvatar>
        <ListItemText
          primary={<Skeleton variant={'rectangular'} width={'65%'} />}
          secondary={<Skeleton sx={{ mt: 1 }} variant={'rectangular'} width={'65%'} />}
        />
      </ListItem>
      <ListItem sx={{ py: 1 }} disablePadding>
        <ListItemAvatar sx={{}}></ListItemAvatar>
        <Skeleton sx={{ mt: 1, borderRadius: '16px' }} variant={'rectangular'} width={'100%'} height="150px" />
      </ListItem>

      <Skeleton sx={{ mt: 2, mb: 2 }} width={'150px'} variant={'rectangular'} />

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
