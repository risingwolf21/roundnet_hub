import { Close, Link } from "@mui/icons-material";
import { Alert, AppBar, Dialog, IconButton, List, ListItem, ListItemAvatar, TextField, Toolbar, Typography } from "@mui/material";
import { DialogProps } from "@toolpad/core/useDialogs";
import React from "react";
import rg_small from "../../images/rgx_small.png";

type PlayerzoneProfilePayload = {
  player_data: Player | null

}
export const PlayerzoneProfileDialog = ({ payload, open, onClose }: DialogProps<PlayerzoneProfilePayload, string | null>) => {
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
          Playerzone Profil
        </Typography>
      </Toolbar>
    </AppBar>
    <List sx={{ pl: 2, pr: 2, pb: 10 }}>
      <Alert sx={{ mb: 1, mt: 2 }} severity="info">
        Wenn du die Playerzone URL änderst, werden deine Daten überschrieben. Sei dir also sicher, dass diese stimmt.
      </Alert>
      <ListItem key={'url'} sx={{ '&.MuiListItem-root': { p: 0 } }}>
        <ListItemAvatar sx={{ flexDirection: 'row', display: 'flex', alignItems: 'center' }}>
          <Link sx={{ color: 'rgba(0,0,0,0.54)' }} />
        </ListItemAvatar>
        <TextField
          fullWidth
          size="small"
          variant="outlined"
          value={payload.player_data?.rg_link}
          onChange={(e) => { }}
          label="Playerzone URL"
          margin="normal"
        />
      </ListItem>
      <ListItem key={'id'} sx={{ '&.MuiListItem-root': { p: 0 } }}>
        <ListItemAvatar sx={{ flexDirection: 'row', display: 'flex', alignItems: 'center' }}>
          <Link sx={{ color: 'rgba(0,0,0,0.54)' }} />
        </ListItemAvatar>
        <TextField
          fullWidth
          disabled
          size="small"
          variant="outlined"
          value={payload.player_data?.rg_id}
          label="Playerzone ID"
          margin="normal"
        />
      </ListItem>
      <ListItem key={'index'} sx={{ '&.MuiListItem-root': { p: 0 } }}>
        <ListItemAvatar sx={{ flexDirection: 'row', display: 'flex', alignItems: 'center' }}>
          <img src={rg_small} alt="rgx logo" width={24} height={24} />
        </ListItemAvatar>
        <TextField
          fullWidth
          disabled
          size="small"
          variant="outlined"
          value={payload.player_data?.rg_index}
          label="RG Index"
          margin="normal"
        />
      </ListItem>
    </List>
  </Dialog>
}