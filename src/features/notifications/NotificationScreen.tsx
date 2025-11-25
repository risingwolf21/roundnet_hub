import { PullToRefresh } from '@/components/pull-to-refresh/PullToRefresh';
import { useAllNotifications, useDismissNotification, useMarkNotificationsAsRead } from '@/tanstack/notifications';
import Layout from '../../components/layout/Layout';
import { useGrants } from '../auth/GrantsContext';

import { Json } from '@/types/supabase-generated.types';
import DeleteIcon from '@mui/icons-material/Delete';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Fab from '@mui/material/Fab';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Stack from '@mui/system/Stack';
import { useNavigate } from 'react-router';

const NotificationsPage = () => {
  return (
    <Layout>
      <NotificationScreen />
    </Layout>
  );
};

function hasStringUrl(value: Json): value is { url: string } {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && typeof (value as any).url === 'string';
}

const NotificationScreen = () => {
  const { user } = useGrants();
  const navigate = useNavigate();
  const { data: notifications = [], isLoading, refetch } = useAllNotifications(user);

  const markNotificationsAsRead = useMarkNotificationsAsRead(user.id);
  const dismissNotification = useDismissNotification();

  if (isLoading) {
    return (
      <Box sx={{ alignItems: 'center', display: 'flex', flexDirection: 'column', pt: 10 }}>
        <Typography sx={{ fontSize: '30pt', fontWeight: 'bold' }}>⌛</Typography>
        <Typography sx={{ fontSize: '18pt', fontWeight: 'bold' }}>Nachrichten werden geladen...</Typography>
      </Box>
    );
  }

  return (
    <PullToRefresh onRefresh={() => refetch()}>
      <List sx={{ width: '100%' }}>
        {notifications.map((notification) => {
          return (
            <ListItem
              divider
              key={notification.id}
              onClick={() => {
                if (notification.data && hasStringUrl(notification.data)) {
                  navigate(notification.data.url);
                }
                dismissNotification.mutate(notification.id);
              }}
            >
              <Stack direction={'row'} sx={{ width: '100%', pr: 2 }}>
                <ListItemText sx={{ flexGrow: 1 }} primary={notification.title} secondary={notification.body} />
                {!notification.dismissed_at && (
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <Badge
                      badgeContent=" "
                      variant="dot"
                      color="error"
                      sx={{ '.MuiBadge-badge': { width: '12px', height: '12px', borderRadius: '6px' } }}
                    />
                  </div>
                )}
              </Stack>
            </ListItem>
          );
        })}
      </List>
      <Fab
        variant={'extended'}
        color={'primary'}
        sx={{
          color: '#fff',
          backgroundColor: (theme) => theme.palette.primary.main,
          position: 'fixed',
          right: '16px',
          bottom: 'calc(16px + env(safe-area-inset-bottom))',
        }}
        onClick={() => markNotificationsAsRead.mutate()}
      >
        <DeleteIcon sx={{ color: 'white', mr: 1 }} />
        Alle löschen
      </Fab>
    </PullToRefresh>
  );
};

export default NotificationsPage;
