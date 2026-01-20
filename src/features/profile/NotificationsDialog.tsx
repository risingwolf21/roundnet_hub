import { useNotificationTags, useNotificationTopics, useUpdateNotificationPreferences } from '@/tanstack/notifications';
import { PropsWithChildren } from 'react';
import NotificationGate from './NotificationGate';

import Layout from '@/components/layout/Layout';
import NotificationsOff from '@mui/icons-material/NotificationsOff';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { useGrants } from '../auth/GrantsContext';

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

export const isNotificationSupported =
  'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;

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

const NotificationsDialog = () => {
  const { user } = useGrants();
  const { data: notificationTags = [], isLoading } = useNotificationTags(user);
  const { data: topics = [] } = useNotificationTopics();
  const updateNotificationPreferences = useUpdateNotificationPreferences(user);

  return (
    <Layout appBarConfig={{ title: 'Benachrichtigungen', showProfile: false, navigateBackPath: '/user' }}>
      <Container sx={{ p: 0, pb: 'env(safe-area-inset-bottom)' }}>
        <Typography sx={{ fontSize: 16, fontWeight: 'bold', m: 2 }} color="text.secondary">
          Einstellungen
        </Typography>
        <NotificationGate />
        <Divider />
        <Typography sx={{ fontSize: 16, fontWeight: 'bold', m: 2 }} color="text.secondary">
          Abonnierte Benachrichtigungen
        </Typography>
        {!isNotificationSupported && (
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
        {isNotificationSupported && Notification.permission === 'granted' && (
          <Box sx={{ pt: 2 }}>
            {topics.map((x) => (
              <NotificationSwitch
                key={x.topic}
                primary={x.description ?? x.topic}
                {...(x.description && { secondary: x.topic })}
                active={notificationTags.find((y) => y.topic === x.topic)?.enabled ?? true}
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
    </Layout>
  );
};
export default NotificationsDialog;
