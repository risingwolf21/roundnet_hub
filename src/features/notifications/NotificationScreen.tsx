import { DoneAll } from '@mui/icons-material';
import { Fab, LinearProgress, List, ListItem, ListItemText } from '@mui/material';
import { useNotifications } from '@toolpad/core/useNotifications';
import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router';
import Layout from '../../components/Layout';
import { HOMEPAGE } from '../../constants';
import { RootState, useAppDispatch } from '../../redux/store';
import { SupabaseUserRepository } from '../../repository/UserRepository';
import { can } from '../../utils/PermissionService';
import { useApplication } from '../auth/AuthContext';
import { fetchNotificationsAsync, notificationsSelector } from './slices/notificationsSlice';

const NotificationScreen = () => {
  const { loading, error } = useSelector((state: RootState) => state.notifications);
  const { user } = useApplication();
  const notifications = useSelector((state: RootState) => notificationsSelector.selectAll(state));
  const dispatch = useAppDispatch();
  const dialog = useNotifications();

  useEffect(() => {
    if (error)
      dialog.show(error, { severity: "error" });
  }, [error, dialog]);

  if (!can('view', 'notifications')) return <Navigate to={`/${HOMEPAGE}`} replace={true} />;

  const markNotificationsAsRead = () => {
    SupabaseUserRepository.markNotificationsAsRead(user!).then((result) => {
      dispatch(fetchNotificationsAsync(user!));
    });
  };

  return (
    <Layout>
      {loading && <LinearProgress sx={{ position: 'fixed', top: 56, left: 0, right: 0 }} />}
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
    </Layout>
  );
};

export default NotificationScreen;
