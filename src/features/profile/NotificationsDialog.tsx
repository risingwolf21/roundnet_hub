import { useNotificationTags, useNotificationTopics, useUpdateNotificationPreferences } from '@/tanstack/notifications';
import { UserWithGroups } from '@/types/supabaseTypes';
import { DialogProps } from '@toolpad/core/useDialogs';
import { PropsWithChildren } from 'react';
import NotificationGate from './NotificationGate';

import Close from '@mui/icons-material/Close';
import NotificationsOff from '@mui/icons-material/NotificationsOff';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Switch from '@mui/material/Switch';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';

const NotificationSwitch = ({
  primary,
  secondary,
  active,
  update,
  loading,
}: {
  primary: string;
  secondary?: string;
  active: boolean;
  loading: boolean;
  update: (newValue: boolean) => void;
}) => {
  return (
    <ListItem
      secondaryAction={
        loading ? (
          <CircularProgress />
        ) : (
          <Switch
            checked={active}
            onChange={(event) => {
              event.stopPropagation();
              update(event.target.checked);
            }}
          />
        )
      }
    >
      <ListItemText primary={primary} {...(secondary !== null && { secondary: secondary })} />
    </ListItem>
  );
};

export const isNotificationSupported = () =>
  'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;

type NotificationsDialogPayload = {
  user: UserWithGroups;
  notificationSupported: boolean;
};

const CenterContainer = ({ children }: PropsWithChildren) => (
  <Container
    style={{
      minHeight: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {children}
  </Container>
);

export const NotificationsDialog = ({
  payload,
  open,
  onClose,
}: DialogProps<NotificationsDialogPayload, string | null>) => {
  const { data: notificationTags = [], isLoading } = useNotificationTags(payload.user);
  const { data: topics = [] } = useNotificationTopics();
  const updateNotificationPreferences = useUpdateNotificationPreferences(payload.user);

  return (
    <Dialog fullScreen open={open} onClose={() => onClose(null)}>
      <AppBar sx={{ position: 'static', pt: 'env(safe-area-inset-top)' }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => onClose(null)}>
            <Close />
          </IconButton>
          <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
            Benachrichtigungen
          </Typography>
        </Toolbar>
      </AppBar>
      <Container sx={{ p: 0 }}>
        <Typography sx={{ fontSize: 16, fontWeight: 'bold', m: 2 }} color="text.secondary">
          Einstellungen
        </Typography>
        <NotificationGate />
        <Divider />
        <Typography sx={{ fontSize: 16, fontWeight: 'bold', m: 2 }} color="text.secondary">
          Abonnierte Benachrichtigungen
        </Typography>
        {!payload.notificationSupported && (
          <CenterContainer>
            <NotificationsOff color="error" fontSize="large" />
            <Typography
              sx={{
                mt: 2,
                wordWrap: 'normal',
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '18pt',
                color: 'primary',
                padding: 2,
              }}
            >
              Dieses Gerät kann keine Benachrichtigungen empfangen
            </Typography>
          </CenterContainer>
        )}
        {payload.notificationSupported && Notification.permission === 'granted' && (
          <Box sx={{ pt: 2 }}>
            {topics.map((x) => (
              <NotificationSwitch
                primary={x.description ?? x.topic}
                {...(x.description && { secondary: x.topic })}
                active={notificationTags.find((y) => y.topic === x.topic)?.enabled ?? false}
                update={(newValue) => {
                  updateNotificationPreferences.mutate({
                    topic: x.topic,
                    enabled: newValue,
                    scopeType: x.scope_type,
                  });
                }}
                loading={isLoading}
              />
            ))}
          </Box>
        )}
      </Container>
    </Dialog>
  );
};
