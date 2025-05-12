import { Close } from "@mui/icons-material";
import { AppBar, Button, Dialog, IconButton, List, Toolbar, Typography } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DialogProps, NotificationsProvider } from "@toolpad/core";
import React from "react";

type ConstellationCreationDialogProps = {
  users: User[]
}

const Content = ({ payload, onClose }: DialogProps<ConstellationCreationDialogProps, null>) => {

  return <><AppBar sx={{ position: 'static', pt: "env(safe-area-inset-top)" }}>
    <Toolbar>
      <IconButton
        edge="start"
        color="inherit"
        onClick={() => onClose(null)}>
        <Close />
      </IconButton>
      <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
        Konstellationen
      </Typography>
      <Button color="inherit" onClick={() => onClose(null)}>
        Speichern
      </Button>
    </Toolbar>
  </AppBar>
    <List sx={{ pl: 2, pr: 2, pb: 10 }}>

    </List >
  </>
}

export const ConstellationCreationDialog = ({ payload, open, onClose }: DialogProps<ConstellationCreationDialogProps, null>) => {
  return <Dialog fullScreen open={open} onClose={() => onClose(null)}>
    <NotificationsProvider>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Content onClose={onClose} open={open} payload={payload} />
      </LocalizationProvider>
    </NotificationsProvider>
  </Dialog>
}