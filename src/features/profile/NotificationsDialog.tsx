import { Close, NotificationsOff } from "@mui/icons-material";
import { AppBar, Box, CircularProgress, Container, Dialog, Divider, IconButton, ListItem, ListItemText, Switch, Toolbar, Typography } from "@mui/material";
import { DialogProps } from "@toolpad/core/useDialogs";
import React, { PropsWithChildren } from "react";
import { useNotificationTags, useNotificationTopics, useUpdateNotificationPreferences } from "src/tanstack/notifications";
import { UserWithGroups } from "src/types/supabaseTypes";
import NotificationGate from "./NotificationGate";

const NotificationSwitch = ({
  primary,
  secondary,
  active,
  update,
  loading
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
        loading
          ? <CircularProgress />
          : <Switch
            checked={active}
            onChange={(event) => {
              event.stopPropagation();
              update(event.target.checked);
            }}
          />
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
  notificationSupported: boolean
}


const CenterContainer = ({ children }: PropsWithChildren) => <Container
  style={{ minHeight: '100%', display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}
>{children}</Container>

export const NotificationsDialog = ({ payload, open, onClose }: DialogProps<NotificationsDialogPayload, string | null>) => {

  const { data: notificationTags = [], isLoading } = useNotificationTags(payload.user);
  const { data: topics = [] } = useNotificationTopics();
  const updateNotificationPreferences = useUpdateNotificationPreferences(payload.user);

  return <Dialog fullScreen open={open} onClose={() => onClose(null)}>
    <AppBar sx={{ position: 'static', pt: "env(safe-area-inset-top)" }}>
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          onClick={() => onClose(null)}>
          <Close />
        </IconButton>
        <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
          Benachrichtigungen
        </Typography>
      </Toolbar>
    </AppBar>
    <Container sx={{ p: 0 }}>
      <Typography sx={{ fontSize: 16, fontWeight: 'bold', m: 2  }} color="text.secondary">
        Einstellungen
      </Typography>
      <NotificationGate />
      <Divider />
      <Typography sx={{ fontSize: 16, fontWeight: 'bold', m: 2 }} color="text.secondary">
        Abonnierte Benachrichtigungen
      </Typography>
      {
        !payload.notificationSupported && <CenterContainer>
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
      }
      {
        payload.notificationSupported && Notification.permission === 'granted' && (
          <Box sx={{ pt: 2 }}>
            {
              topics.map(x => <NotificationSwitch
                primary={x.description ?? x.topic}
                {
                ...(x.description && { secondary: x.topic })
                }
                active={notificationTags.find(y => y.topic === x.topic)?.enabled ?? false}
                update={(newValue) => {
                  updateNotificationPreferences.mutate({
                    topic: x.topic,
                    enabled: newValue,
                    scopeType: x.scope_type,
                  });
                }}
                loading={isLoading}
              />)
            }
          </Box>
        )
      }
    </Container>
  </Dialog>
}