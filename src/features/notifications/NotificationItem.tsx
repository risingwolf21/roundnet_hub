import { useDismissNotification } from '@/tanstack/notifications';
import { Json } from '@/types/supabase-generated.types';
import { Circle as CircleIcon, Done as DoneIcon } from '@mui/icons-material';
import IconButton from '@mui/material/IconButton';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Tooltip from '@mui/material/Tooltip';
import Box from '@mui/system/Box';
import { useNavigate } from 'react-router';
import { Notification } from 'types/supabase';

function hasStringUrl(value: Json): value is { url: string } {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && 'url' in value && typeof value.url === 'string';
}

export const NotificationItem = ({ notification }: { notification: Notification }) => {
  const navigate = useNavigate();
  const dismissNotification = useDismissNotification();

  return (
    <ListItem
      disablePadding
      divider
      key={notification.id}
      sx={{
        bgcolor: notification.dismissed_at ? 'transparent' : 'action.hover',
        transition: '0.2s',
        '&:hover': { bgcolor: 'action.selected' }
      }}
      secondaryAction={
        !notification.dismissed_at && (
          <Tooltip title="Als gelesen markieren">
            <IconButton
              edge="end"
              onClick={() => dismissNotification.mutate({ notficationId: notification.id })}
              color="primary"
            >
              <DoneIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )
      }
    >
      {
        !notification.dismissed_at && (
          <Box sx={{ ml: 2, display: 'flex', alignItems: 'center' }}>
            <CircleIcon sx={{ fontSize: 12, color: 'primary.main' }} />
          </Box>
        )
      }
      <ListItemButton onClick={() => {
        dismissNotification.mutate({ notficationId: notification.id }, {
          onSettled: () => {
            if (notification.data && hasStringUrl(notification.data))
              navigate(notification.data.url)
          }
        })
      }} sx={{ py: 1.5 }}>
        <ListItemText
          primary={notification.title}
          secondary={notification.body}
          slotProps={{
            primary: {
              fontWeight: notification.dismissed_at ? 400 : 700
            }
          }}
        />
      </ListItemButton>
    </ListItem>
  );
};
