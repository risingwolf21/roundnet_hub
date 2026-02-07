import { PullToRefresh } from '@/components/pull-to-refresh/PullToRefresh';
import { useAllNotifications, useMarkNotificationsAsRead } from '@/tanstack/notifications';
import Layout from '../../components/layout/Layout';
import { useGrants } from '../auth/GrantsContext';

import { Json } from '@/types/supabase-generated.types';
import DeleteIcon from '@mui/icons-material/Delete';
import Box from '@mui/material/Box';
import Fab from '@mui/material/Fab';
import List from '@mui/material/List';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router';
import { NotificationItem } from './NotificationItem';

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

  const markNotificationsAsRead = useMarkNotificationsAsRead(user);

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
        {notifications.map((notification) => (
          <NotificationItem key={notification.id} notification={notification} />
        ))}
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
