import { Close, NotificationsOff } from "@mui/icons-material";
import { AppBar, Box, CircularProgress, Dialog, Grid2, IconButton, ListItem, ListItemText, Switch, Toolbar, Typography } from "@mui/material";
import { DialogProps } from "@toolpad/core/useDialogs";
import { useNotifications } from "@toolpad/core/useNotifications";
import React, { PropsWithChildren, useEffect, useState } from "react";
import { AppDispatch } from "src/redux/store";
import { SupabaseUserRepository } from "src/repository/UserRepository";
import { UserWithRolesAndPermissions } from "src/types/supabaseTypes";

const NotificationSwitch = ({
  title,
  tag,
  userId,
  active,
  update,
  loading
}: {
  title: string;
  tag: string;
  userId: string;
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
  user: UserWithRolesAndPermissions;
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

  const [loading, setLoading] = useState<boolean>(false);
  const [notificationTags, setNotificationTags] = useState<string[]>([]);
  const notifications = useNotifications();

  const iOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const android = typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)

  useEffect(() => {
    setLoading(true);
    SupabaseUserRepository.fetchNotificationSettings(payload.user.userId)
      .then(setNotificationTags)
      .finally(() => setLoading(false))
  }, [payload.user])

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
            }}>{`Einstellungen > Apps > Roundnet Karlsruhe Web App > Benachrichtigungen`}</Typography>
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
              tag={x.tag}
              userId={payload.user.userId}
              active={notificationTags.includes(x.tag)}
              update={(newValue) => {
                if (newValue) {
                  SupabaseUserRepository.addNotificationTag(x.tag, payload.user.userId).then(result => {
                    if (!result.error) {
                      setNotificationTags([...notificationTags, x.tag])
                    } else {
                      notifications.show("Es ist ein Fehler beim hinzufügen aufgetreten", { severity: "error" });
                    }
                  })
                } else {
                  SupabaseUserRepository.deleteNotificationTag(x.tag, payload.user.userId).then(result => {
                    if (!result.error) {
                      setNotificationTags(notificationTags.filter(y => y !== x.tag))
                    } else {
                      notifications.show("Es ist ein Fehler beim hinzufügen aufgetreten", { severity: "error" });
                    }
                  })
                }
              }}
              loading={loading}
            />)
          }
        </Box>
      )
    }
  </Dialog>
}