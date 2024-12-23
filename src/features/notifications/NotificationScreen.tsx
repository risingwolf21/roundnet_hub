import { useSelector } from 'react-redux';
import { RootState, useAppDispatch } from '../../redux/store';
import { can } from '../../utils/PermissionService';
import { AlertSnackbar } from '../../components/AlertSnackbar';
import React from 'react';
import { Navigate } from 'react-router-dom';
import { HOMEPAGE } from '../../constants';
import { Fab, LinearProgress, List, ListItem, ListItemText } from '@mui/material';
import { DoneAll } from '@mui/icons-material';
import { fetchNotificationsAsync, notificationsSelector } from './slices/notificationsSlice';
import { SupabaseUserRepository } from '../../repository/UserRepository';
import Layout from '../../components/Layout';
import { useAuth } from '../auth/AuthContext';

const NotificationScreen = () => {
  const { loading, error } = useSelector((state: RootState) => state.notifications);
  const user = useAuth();
  const notifications = useSelector((state: RootState) => notificationsSelector.selectAll(state));
  const dispatch = useAppDispatch();

  if (!can('view', 'notifications')) return <Navigate to={`/${HOMEPAGE}`} replace={true} />;

  const markNotificationsAsRead = () => {
    SupabaseUserRepository.markNotificationsAsRead(user).then((result) => {
      dispatch(fetchNotificationsAsync(user));
    });
  };

  return (
    <Layout appBarConfig={{ showBackButton: true }}>
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
      {error && <AlertSnackbar alertInfo={{ message: error, severity: 'error' }} />}
    </Layout>
  );
};

export default NotificationScreen;
