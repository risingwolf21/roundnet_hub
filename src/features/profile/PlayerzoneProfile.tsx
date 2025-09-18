import { AddPhotoAlternateOutlined, CheckBox, Close, ContentCopy, Link } from "@mui/icons-material";
import { Alert, AppBar, Avatar, Button, Checkbox, Chip, CircularProgress, Container, Dialog, Divider, IconButton, List, ListItem, ListItemAvatar, ListItemText, TextField, Toolbar, Typography } from "@mui/material";
import { captureException } from "@sentry/react";
import { DialogProps } from "@toolpad/core/useDialogs";
import { NotificationsProvider, useNotifications } from "@toolpad/core/useNotifications";
import React, { useState } from "react";
import { supabase } from "src/lib/supabase";
import { useEloHistory, usePlayer, useUpdateIndexHidden } from "src/tanstack/player_data";
import rg_small from "../../images/rgx_small.png";

type PlayerzoneProfilePayload = {
  user: User;
}

const Content = ({ payload, onClose }: DialogProps<PlayerzoneProfilePayload, string | null>) => {

  const { data: player_data } = usePlayer(payload.user);
  const { data: elo_history } = useEloHistory(payload.user);

  const updateHideRatingMutation = useUpdateIndexHidden(payload.user);

  const notifications = useNotifications();
  const [rgLink, setRgLink] = useState(player_data?.rg_link ?? "");
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

    await supabase.from('user').update({ avatarUrl: player_data?.rg_avatar_url }).eq('userId', payload.user.userId);
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
          .eq("player", player_data?.player ?? "");
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
    <Container>
      <List sx={{ pl: 2, pr: 2, pb: 10 }}>
        {
          player_data?.rg_avatar_url && <Container
            key={'avatar'}
            sx={{
              display: 'flex',
              justifyContent: 'center',
              flexDirection: 'column',
              alignItems: "center",
              m: 2,
              p: 0,
              width: 'auto',
              maxWidth: "unset!important"
            }}>
            <Avatar sx={{ borderRadius: 2, width: '150px', height: '150px' }}>
              <img src={player_data.rg_avatar_url} alt="logo" width={'150px'} height={'150px'} />
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
        {
          player_data?.rg_id && <ListItem
            key={'id'}
            sx={{ '&.MuiListItem-root': { p: 0 } }}
            secondaryAction={player_data?.rg_id ? <IconButton onClick={() => navigator.clipboard.writeText(player_data?.rg_id ?? "")}><ContentCopy /></IconButton> : undefined}>
            <ListItemAvatar sx={{ flexDirection: 'row', display: 'flex', alignItems: 'center' }}>
              <Link sx={{ color: 'rgba(0,0,0,0.54)' }} />
            </ListItemAvatar>
            <ListItemText primary={player_data?.rg_id} secondary={'Roundnet Germany ID'} />
          </ListItem>
        }
        {
          player_data?.rg_index && <ListItem
            key={'rgx'}
            disableGutters
            sx={{
              '&.MuiListItem-root': { p: 0 },
            }}
            secondaryAction={player_data?.pro_status ? <Chip variant='outlined' label="Pro Status" sx={{ mx: 2, borderRadius: 3, background: "black", color: "white" }} /> : undefined}>
            <ListItemAvatar>
              <img src={rg_small} alt={'pz logo'} width="25" height="25" />
            </ListItemAvatar>
            <ListItemText primary={player_data?.rg_index} secondary={'Roundnet Germany Index'} />
          </ListItem>
        }
        <Divider />
        {
          player_data?.ka_index && <ListItem
            key={'kax'}
            disableGutters
            sx={{
              '&.MuiListItem-root': { p: 0 },
            }}>
            <ListItemAvatar>
            </ListItemAvatar>
            <ListItemText primary={player_data?.ka_index.toFixed()} secondary={'Karlsruhe Index'} />
          </ListItem>
        }
        {
          player_data?.effective_rating_cached && <ListItem
            key={'eff_idx'}
            disableGutters
            sx={{
              '&.MuiListItem-root': { p: 0 },
            }}>
            <ListItemAvatar>
            </ListItemAvatar>
            <ListItemText primary={player_data?.effective_rating_cached.toFixed()} secondary={'Kombinierter Index'} />
          </ListItem>
        }<ListItem
          key={'hide'}
          disableGutters
          sx={{
            '&.MuiListItem-root': { p: 0 },
          }}>
          <ListItemAvatar>
            <Checkbox disabled={updateHideRatingMutation.isPending} checked={player_data?.hide_rating ?? false} onChange={(e) => updateHideRatingMutation.mutate({ hide_rating: e.target.checked })} />
          </ListItemAvatar>
          <ListItemText primary={"Index verbergen?"} secondary={'Dein Index wird anderen Spielern verborgen. Für die Berechnung wird er aber weiterhin verwendet'} />
        </ListItem>
      </List >
    </Container>
  </>)
}
export const PlayerzoneProfileDialog = ({ payload, open, onClose }: DialogProps<PlayerzoneProfilePayload, string | null>) => {
  return <Dialog fullScreen open={open} onClose={() => onClose(null)}>
    <NotificationsProvider>
      <Content onClose={onClose} open={open} payload={payload} />
    </NotificationsProvider>
  </Dialog>
}