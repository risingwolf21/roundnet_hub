import { Close } from "@mui/icons-material";
import { AppBar, Box, Button, CircularProgress, Dialog, IconButton, ListItem, ListItemText, Switch, Toolbar, Typography } from "@mui/material";
import { DialogProps } from "@toolpad/core/useDialogs";
import { useNotifications } from "@toolpad/core/useNotifications";
import React, { useEffect, useState } from "react";
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
}

export const NotificationsDialog = ({ payload, open, onClose }: DialogProps<NotificationsDialogPayload, string | null>) => {

  const [loading, setLoading] = useState<boolean>(false);
  const [notificationTags, setNotificationTags] = useState<string[]>([]);
  const notifications = useNotifications();

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
        <Button autoFocus color="inherit" onClick={() => onClose(null)}>
          Speichern
        </Button>
      </Toolbar>
    </AppBar>
    {
      isNotificationSupported() && Notification.permission !== 'granted' && (
        <Box sx={{ display: "flex", flexDirection: "row", justifyContent: "center", pt: 2 }}>
          <Typography variant="h5" color="primary" fontWeight="bold">Schalte Benachrichtigungen ein</Typography>
        </Box>
      )
    }
    {
      isNotificationSupported() && Notification.permission === 'granted' && (
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