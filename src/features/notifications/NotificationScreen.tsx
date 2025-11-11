import { PullToRefresh } from '@/components/pull-to-refresh/PullToRefresh';
import { useAllNotifications, useMarkNotificationsAsRead } from '@/tanstack/notifications';
import Layout from '../../components/layout/Layout';
import { useGrants } from '../auth/GrantsContext';

import { Json } from '@/types/supabase-generated.types';
import DoneAll from '@mui/icons-material/DoneAll';
import Box from '@mui/material/Box';
import Fab from '@mui/material/Fab';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router';

const NotificationsPage = () => {
  return (
    <Layout>
      <NotificationScreen />
    </Layout>
  );
};

function hasStringUrl(value: Json): value is { url: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    typeof (value as any).url === "string"
  );
}

const NotificationScreen = () => {
  const { user } = useGrants();
  const navigate = useNavigate();
  const { data: notifications = [], isLoading, refetch } = useAllNotifications(user);

  const markNotificationsAsRead = useMarkNotificationsAsRead(user.userId);

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
            <ListItemButton
              key={notification.id}
              onClick={() => {
                if (notification.data && hasStringUrl(notification.data)) {
                  navigate(notification.data.url);
                }
              }}>
              <ListItemText primary={notification.title} secondary={notification.body} />
            </ListItemButton>
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
          mb: '16px',
        }}
        onClick={() => markNotificationsAsRead.mutate()}
      >
        <DoneAll sx={{ color: 'white', mr: 1 }} />
        Als gelesen markieren
      </Fab>
    </PullToRefresh>
  );
};

export default NotificationsPage;
