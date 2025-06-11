import { Close, NotificationsOff } from "@mui/icons-material";
import { AppBar, Box, CircularProgress, Dialog, Grid2, IconButton, ListItem, ListItemText, Switch, Toolbar, Typography } from "@mui/material";
import { DialogProps } from "@toolpad/core/useDialogs";
import { useNotifications } from "@toolpad/core/useNotifications";
import React, { PropsWithChildren } from "react";
import { PullToRefresh } from "src/components/pull-to-refresh/PullToRefresh";
import { AppDispatch } from "src/redux/store";
import { useAddNotificationTag, useNotificationTags, useRemoveNotificationTag } from "src/tanstack/notifications";
import { UserWithGroups } from "src/types/supabaseTypes";
import { BRANDING } from "src/utils";

const NotificationSwitch = ({
  title,
  active,
  update,
  loading
}: {
  title: string;
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
      <ListItemText primary={title} />
    </ListItem>
  );
};

export const isNotificationSupported = () =>
  'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;

type NotificationsDialogPayload = {
  dispatch: AppDispatch;
  user: UserWithGroups;
  notificationSupported: boolean
}


const CenterContainer = ({ children }: PropsWithChildren) => <Grid2
  container
  spacing={0}
  direction="column"
  alignItems="center"
  justifyContent="center"
  style={{ minHeight: '100%' }}
>{children}</Grid2>

export const NotificationsDialog = ({ payload, open, onClose }: DialogProps<NotificationsDialogPayload, string | null>) => {

  const notifications = useNotifications();

  const iOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const android = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent);

  const { data: notificationTags = [], isLoading, refetch } = useNotificationTags(payload.user);
  const addNotificationTag = useAddNotificationTag(payload.user);
  const removeNotificationTag = useRemoveNotificationTag(payload.user);

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
    <PullToRefresh onRefresh={() => refetch()}>
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
        (payload.notificationSupported && Notification.permission !== 'granted') && (
          <CenterContainer>
            <NotificationsOff color="warning" fontSize="large" />
            <Typography
              sx={{
                mt: 2,
                wordWrap: 'normal',
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '16pt',
                color: 'primary',
                padding: 2,
              }}
            >
              Benachrichtigungen sind derzeit für dieses Gerät deaktiviert. Gehe in die Einstellungen und aktiviere Sie.
            </Typography>
            {
              (iOS || android) && <Typography sx={{
                mt: 2,
                wordWrap: 'normal',
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '14pt',
                color: 'primary',
                padding: 2,
              }}>Aktivierung der Benachrichtigungen:</Typography>
            }
            {
              iOS && <Typography sx={{
                mt: 2,
                wordWrap: 'normal',
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '12pt',
                color: 'primary',
                padding: 2,
              }}>{`Einstellungen > Apps > ${BRANDING.title} Web App > Benachrichtigungen`}</Typography>
            }
            {
              android && <Typography sx={{
                mt: 2,
                wordWrap: 'normal',
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '12pt',
                color: 'primary',
                padding: 2,
              }}>{`Drücken und halten des App Icons auf dem Home Bildschirm > Einstellungen > Benachrichtigungen`}</Typography>
            }
          </CenterContainer>
        )
      }
      {
        payload.notificationSupported && Notification.permission === 'granted' && (
          <Box sx={{ pt: 2 }}>
            {
              [
                { tag: "eventComments", title: "Event Kommentare" },
                { tag: "eventCancelled", title: "Event abgesagt" },
                { tag: "eventUpdated", title: "Event aktualisiert" },
                { tag: "challengeStatAdded", title: "Challenge Eintrag hinzugfügt" },
              ].map(x => <NotificationSwitch
                title={x.title}
                active={notificationTags.includes(x.tag)}
                update={(newValue) => {
                  if (newValue) {
                    addNotificationTag.mutate({
                      tag: x.tag
                    }, {
                      onError: (error) => notifications.show("Es ist ein Fehler beim hinzufügen aufgetreten. " + error.message, { severity: "error" })
                    })
                  } else {
                    removeNotificationTag.mutate({
                      tag: x.tag
                    }, {
                      onError: (error) => notifications.show("Es ist ein Fehler beim hinzufügen aufgetreten. " + error.message, { severity: "error" })
                    })
                  }
                }}
                loading={isLoading}
              />)
            }
          </Box>
        )
      }
    </PullToRefresh>
  </Dialog>
}