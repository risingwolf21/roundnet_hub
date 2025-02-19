import { Close, FiberManualRecord } from "@mui/icons-material";
import { AppBar, Dialog, IconButton, List, ListItem, ListItemAvatar, ListItemText, Toolbar, Typography } from "@mui/material";
import { DialogProps } from "@toolpad/core/useDialogs";
import React from "react";

type GroupsDialogPayload = {
  groups: Group[]

}
export const GroupsDialog = ({ payload, open, onClose }: DialogProps<GroupsDialogPayload, string | null>) => {
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
          Gruppen
        </Typography>
      </Toolbar>
    </AppBar>
    <List sx={{ pl: 2, pr: 2, pb: 10 }}>
      {payload.groups.map((group, index) => (
        <ListItem
          key={`${group.name} ${index}`}
          sx={{ '&.MuiListItem-root': { p: 0 } }}
          divider={index !== payload.groups.length - 1}
        >
          <ListItemAvatar>
            <FiberManualRecord sx={{ color: group.color }} />
          </ListItemAvatar>
          <ListItemText primary={group.name} secondary={group.description} />
        </ListItem>
      ))}
    </List>
  </Dialog>
}