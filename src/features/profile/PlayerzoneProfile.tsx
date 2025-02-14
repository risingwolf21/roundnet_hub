import { AddPhotoAlternateOutlined, Close, Link } from "@mui/icons-material";
import { Alert, AppBar, Avatar, Button, CircularProgress, Container, Dialog, IconButton, List, ListItem, ListItemAvatar, TextField, Toolbar, Typography } from "@mui/material";
import { DialogProps } from "@toolpad/core/useDialogs";
import React, { useState } from "react";
import rg_small from "../../images/rgx_small.png";
import { supabase } from "src/components/services/supabase/supabaseClient";
import { NotificationsProvider, useNotifications } from "@toolpad/core/useNotifications";
import { captureException } from "@sentry/react";

type PlayerzoneProfilePayload = {
  player_data: Player | null
  user: User;
}

const Content = ({ payload, onClose }: DialogProps<PlayerzoneProfilePayload, string | null>) => {

  const notifications = useNotifications();
  const [rgLink, setRgLink] = useState(payload.player_data?.rg_link ?? "");
  const [loading, setLoading] = useState(false);

  const handleChangeProfilePicture = async () => {
    setLoading(false);
    const { data: list, error } = await supabase.storage.from('user').list(`${payload.user.userId}`);
    if (error || !list) {
      captureException(error);
      return;
    }
    const filesToRemove = list.map((x) => `${payload.user.userId}/${x.name}`);

    await supabase.storage.from('user').remove(filesToRemove);

    await supabase.from('user').update({ avatarUrl: payload.player_data?.rg_avatar_url }).eq('userId', payload.user.userId);
    setLoading(false);
  }

  return (<><AppBar sx={{ position: 'static', pt: "env(safe-area-inset-top)" }}>
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
      <Button color="inherit" onClick={async () => {
        if (!rgLink.startsWith("https://playerzone.roundnetgermany.de/players/")) {
          notifications.show("Bitte vergewissere dich, dass die URL stimmt. Kopiere die URL aus deinem Playerzone Profil.", { severity: "error" });
          return;
        }
        const { error } = await supabase
          .schema("games")
          .from("players")
          .upsert({ player: payload.user.userId, rg_link: rgLink })
          .eq("player", payload.player_data?.player ?? "");
        if (error) {
          notifications.show("Playerzone URL konnte nicht gesetzt werden. " + error.message, { severity: "error" });
        } else {
          notifications.show("Playerzone URL erfolgreich aktualisiert", { severity: "success" });
        }
      }}>
        Speichern
      </Button>
    </Toolbar>
  </AppBar>
    <List sx={{ pl: 2, pr: 2, pb: 10 }}>
      {
        payload.player_data?.rg_avatar_url && <Container
          key={'avatar'}
          sx={{
            display: 'flex',
            justifyContent: 'center',
            flexDirection: 'column',
            alignItems: "center",
            m: 2,
            p: 0,
            width: 'auto',
          }}>
          <Avatar sx={{ borderRadius: 2, width: '150px', height: '150px' }}>
            <img src={payload.player_data.rg_avatar_url} alt="logo" width={'150px'} height={'150px'} />
          </Avatar>
          <Button
            component="label"
            disabled={loading}
            sx={{ border: 'none', background: 'transparent', mt: 1 }}
            startIcon={loading ? (
              <CircularProgress size={'20px'} />
            ) : (<AddPhotoAlternateOutlined />)}
            onClick={handleChangeProfilePicture}
          >
            Dieses Bild als Profilbild verwenden
          </Button>
        </Container>
      }
      <Alert sx={{ mb: 1, mt: 2 }} severity="info">
        Wenn du die Playerzone URL änderst, werden deine Daten überschrieben. Du kannst diese Daten jederzeit ändern.
      </Alert>
      <ListItem key={'url'} sx={{ '&.MuiListItem-root': { p: 0 } }}>
        <ListItemAvatar sx={{ flexDirection: 'row', display: 'flex', alignItems: 'center' }}>
          <Link sx={{ color: 'rgba(0,0,0,0.54)' }} />
        </ListItemAvatar>
        <TextField
          fullWidth
          multiline
          size="small"
          variant="outlined"
          value={rgLink}
          onChange={(e) => setRgLink(e.target.value)}
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
  </>)
}
export const PlayerzoneProfileDialog = ({ payload, open, onClose }: DialogProps<PlayerzoneProfilePayload, string | null>) => {
  return <Dialog fullScreen open={open} onClose={() => onClose(null)}>
    <NotificationsProvider>
      <Content onClose={onClose} open={open} payload={payload} />
    </NotificationsProvider>
  </Dialog>
}