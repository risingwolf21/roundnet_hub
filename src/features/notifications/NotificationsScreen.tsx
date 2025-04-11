import { ArrowBack, Save } from '@mui/icons-material';
import {
  AppBar,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  Fab,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material';
import { useNotifications } from '@toolpad/core/useNotifications';
import { TFunction } from 'i18next';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { LoadingIndicator } from '../../components/LoadingIndicator';
import { SupabaseUserRepository } from '../../repository/UserRepository';
import { useApplication } from '../auth/AuthContext';

const userTags: NotificationTags[] = ['eventComments', 'userRegistration', 'paymentRequest', 'paymentPending'];

const NotificationsScreenProvider = () => {
  const { user } = useApplication();
  const { t } = useTranslation();

  return <NotificationsScreen t={t} user={user!} />;
};

type NotificationsScreenProps = {
  t: TFunction;
  user: User;
};

export const NotificationsScreen = ({ user, t }: NotificationsScreenProps) => {
  const [activeUserTags, setActiveUserTags] = useState<NotificationTags[]>(user.notifications ?? []);
  const [loading, setLoading] = useState(false);
  const [notificationPermissionGranted, setNotificationPermissionGranted] = useState(false);
  const navigate = useNavigate();
  const notifications = useNotifications();

  useEffect(() => {
    Notification.requestPermission().then((result) => {
      setNotificationPermissionGranted(result === 'granted');
    });
  }, []);

  const handleChange = (tag: NotificationTags) => {
    if (!activeUserTags.includes(tag)) {
      setActiveUserTags([...activeUserTags, tag]);
    } else {
      setActiveUserTags(activeUserTags.filter((x) => x !== tag));
    }
  };

  const saveTags = () => {
    setLoading(true);
    SupabaseUserRepository.updateNotificationTags(activeUserTags, user).then((r) => {
      setLoading(false);
      if (!r.error) {
        notifications.show('Successfully updated your notification preferences', { severity: 'info' });
      } else {
        notifications.show('Something went wrong here: ' + r.error.message, { severity: 'error' });
      }
    });
  };

  return (
    <Dialog open={true} fullScreen>
      <Box>
        <AppBar position="sticky" sx={{ pt: 'env(safe-area-inset-top)' }}>
          <Toolbar>
            <IconButton edge="start" color="inherit" onClick={() => navigate(-1)} aria-label="close">
              <ArrowBack />
            </IconButton>
            <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
              Benachrichtigungen
            </Typography>
          </Toolbar>
        </AppBar>
        <LoadingIndicator loading={false} />
        <List>
          {!notificationPermissionGranted && (
            <ListItem key={'requestPermission'} secondaryAction={<Button variant={'text'} title={'Request'} />}>
              <ListItemText primary={'Request Notification permissions'} />
            </ListItem>
          )}
          {userTags.map((x) => (
            <ListItemButton key={x} onClick={() => handleChange(x)} disabled={!notificationPermissionGranted}>
              <ListItemAvatar>
                <Checkbox checked={activeUserTags.includes(x)} onChange={(_) => handleChange(x)} />
              </ListItemAvatar>
              <ListItemText primary={t('notificationTags.' + x)} />
            </ListItemButton>
          ))}
        </List>
        <Fab
          sx={{
            background: '#66bb6a',
            position: 'fixed',
            right: '16px',
            bottom: 'calc(16px + env(safe-area-inset-bottom))',
          }}
          onClick={saveTags}
        >
          {!loading ? <Save sx={{ color: 'white' }} /> : <CircularProgress />}
        </Fab>
      </Box>
    </Dialog>
  );
};

export default NotificationsScreenProvider;
