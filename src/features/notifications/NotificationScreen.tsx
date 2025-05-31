import { DoneAll } from '@mui/icons-material';
import { Box, Fab, List, ListItem, ListItemText, Typography } from '@mui/material';
import React from 'react';
import { PullToRefresh } from 'src/components/pull-to-refresh/PullToRefresh';
import Layout from '../../components/Layout';
import { SupabaseUserRepository } from '../../repository/UserRepository';
import { useAuthentication } from '../auth/AuthContext';
import { useAllNotifications } from 'src/tanstack/notifications';

const NotificationsPage = () => {

  return <Layout>
    <NotificationScreen />
  </Layout>
}

const NotificationScreen = () => {
  const { user } = useAuthentication();
  const { data: notifications = [], isLoading, refetch } = useAllNotifications(user);

  const markNotificationsAsRead = () => {
    SupabaseUserRepository.markNotificationsAsRead(user).then((result) => {
      refetch()
    });
  };

  if (isLoading) {
    return <Box sx={{ alignItems: 'center', display: 'flex', flexDirection: 'column', pt: 10 }}>
      <Typography sx={{ fontSize: '30pt', fontWeight: 'bold' }}>⌛</Typography>
      <Typography sx={{ fontSize: '18pt', fontWeight: 'bold' }}>Challenge wird geladen...</Typography>
    </Box>
  }

  return (<PullToRefresh onRefresh={() => refetch()}>
    <List sx={{ width: '100%' }}>
      {notifications.map((notification) => {
        return (
          <ListItem key={notification.id}>
            <ListItemText primary={notification.title} secondary={notification.body} />
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
        mb: '16px',
      }}
      onClick={markNotificationsAsRead}
    >
      <DoneAll sx={{ color: 'white', mr: 1 }} />
      Als gelesen markieren
    </Fab>
  </PullToRefresh>
  );
};

export default NotificationsPage;
