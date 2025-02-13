import { Close } from "@mui/icons-material";
import { AppBar, Box, Button, CircularProgress, Dialog, IconButton, ListItem, ListItemText, Switch, Toolbar, Typography } from "@mui/material";
import { DialogProps } from "@toolpad/core/useDialogs";
import React, { useState } from "react";
import { addNotificationPermissionAsync, removeNotificationPermissionAsync } from "src/redux/applicationSlice";
import { AppDispatch } from "src/redux/store";
import { UserWithRolesAndPermissions } from "src/types/supabaseTypes";

const NotificationSwitch = ({
  title,
  tag,
  user,
  dispatch,
}: {
  title: string;
  tag: NotificationTags;
  user: User;
  dispatch: AppDispatch;
}) => {
  return (
    <ListItem
      secondaryAction={
        <Switch
          checked={user.notifications?.includes(tag) ?? false}
          onChange={(event) => {
            event.stopPropagation();
            if (!event.target.checked) {
              dispatch(
                removeNotificationPermissionAsync({
                  user,
                  notificationToRemove: tag,
                })
              );
            } else {
              dispatch(
                addNotificationPermissionAsync({
                  user,
                  notificationToAdd: tag,
                })
              );
            }
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
        <Box>
        </Box>
      )
    }
    {
      isNotificationSupported() && Notification.permission === 'granted' && (
        <>
          <NotificationSwitch
            title={'Event Kommentare'}
            tag={'eventComments'}
            user={payload.user}
            dispatch={payload.dispatch}
          />

          <NotificationSwitch
            title={'Event abgesagt'}
            tag={'eventCancelled'}
            user={payload.user}
            dispatch={payload.dispatch}
          />

          <NotificationSwitch
            title={'Event aktualisiert'}
            tag={'eventUpdated'}
            user={payload.user}
            dispatch={payload.dispatch}
          />

        </>
      )
    }
  </Dialog>
}