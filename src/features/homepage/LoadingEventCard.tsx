import ThumbDownOffAlt from '@mui/icons-material/ThumbDownOffAlt';
import ThumbUpOffAlt from '@mui/icons-material/ThumbUpOffAlt';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import IconButton from '@mui/material/IconButton';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Skeleton from '@mui/material/Skeleton';

export const LoadingEventCard = () => {
  return (
    <Card
      elevation={3}
      sx={{
        width: 200,
        flexShrink: 0,
      }}
    >
      <CardHeader sx={{ pb: 1 }} title={<Skeleton variant="rectangular" width={'100%'} height={'24px'} />} />

      <CardContent sx={{ pt: 1 }}>
        <ListItem disablePadding dense>
          <ListItemAvatar sx={{ display: 'flex', minWidth: '40px' }}>
            <Skeleton variant="rectangular" width={'24px'} height={'24px'} />
          </ListItemAvatar>
          <ListItemText primary={<Skeleton variant="rectangular" width={'100%'} height={'24px'} />} />
        </ListItem>
        <ListItem disablePadding dense>
          <ListItemAvatar sx={{ display: 'flex', minWidth: '40px' }}>
            <Skeleton variant="rectangular" width={'24px'} height={'24px'} />
          </ListItemAvatar>
          <ListItemText
            primary={<Skeleton variant="rectangular" width={'100%'} height={'24px'} />}
            slotProps={{
              primary: {
                whiteSpace: 'nowrap',
                overflow: 'clip',
                textOverflow: 'ellipsis',
              },
            }}
          />
        </ListItem>
      </CardContent>
      <CardActions disableSpacing sx={{ justifyContent: 'start', pt: 0 }}>
        <IconButton disabled>
          <ThumbDownOffAlt fontSize="inherit" sx={{ fontSize: '28px' }} />
        </IconButton>
        <IconButton disabled>
          <ThumbUpOffAlt fontSize="inherit" sx={{ fontSize: '28px' }} />
        </IconButton>
      </CardActions>
    </Card>
  );
};
