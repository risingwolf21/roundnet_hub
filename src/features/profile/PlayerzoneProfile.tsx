import { supabase } from '@/lib/supabase';
import { useEloHistory, usePlayer, useUpdateIndexHidden, useUpdatePlayer } from '@/tanstack/player_data';
import { captureException } from '@sentry/react';
import { DialogProps } from '@toolpad/core/useDialogs';
import { useNotifications } from '@toolpad/core/useNotifications';
import { addDays, isAfter } from 'date-fns';
import { useMemo, useState } from 'react';
import rg_small from '../../images/rgx_small.png';

import { GamesTableUpdate } from '@/types/supabaseTypes';
import AddPhotoAlternateOutlined from '@mui/icons-material/AddPhotoAlternateOutlined';
import Close from '@mui/icons-material/Close';
import ContentCopy from '@mui/icons-material/ContentCopy';
import Link from '@mui/icons-material/Link';
import TrendingDown from '@mui/icons-material/TrendingDown';
import TrendingFlat from '@mui/icons-material/TrendingFlat';
import TrendingUp from '@mui/icons-material/TrendingUp';
import Alert from '@mui/material/Alert';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

type PlayerzoneProfilePayload = {
  user: User;
};

export const PlayerzoneProfileDialog = ({
  payload,
  open,
  onClose,
}: DialogProps<PlayerzoneProfilePayload, string | null>) => {

  const { data: player_data } = usePlayer(payload.user);
  const { data: elo_history } = useEloHistory(payload.user);

  const updateHideRatingMutation = useUpdateIndexHidden(payload.user);
  const updatePlayer = useUpdatePlayer(payload.user);

  const notifications = useNotifications();
  const [rgLink, setRgLink] = useState(player_data?.rg_link ?? '');
  const [loading, setLoading] = useState(false);

  const elo_change_last_30_days = useMemo(() => {
    return elo_history?.filter(x => isAfter(x.created_at, addDays(new Date(), -30))).reduce((p, c) => p + c.delta, 0) ?? 0
  }, [elo_history])

  const handleChangeProfilePicture = async () => {
    setLoading(false);
    const { data: list, error } = await supabase.storage.from('user').list(`${payload.user.userId}`);
    if (error || !list) {
      notifications.show(error.message, { severity: "error" });
      captureException(error);
      return;
    }
    const filesToRemove = list.map((x) => `${payload.user.userId}/${x.name}`);

    await supabase.storage.from('user').remove(filesToRemove);

    await supabase.from('user').update({ avatarUrl: player_data?.rg_avatar_url }).eq('userId', payload.user.userId);
    setLoading(false);
  };

  const onSafeRgLinkClick = async () => {
    if (!rgLink.startsWith('https://playerzone.roundnetgermany.de/players/') && rgLink !== "") {
      notifications.show(
        'Bitte vergewissere dich, dass die URL stimmt. Kopiere die URL aus deinem Playerzone Profil.',
        { severity: 'error' }
      );
      return;
    }
    const updates: GamesTableUpdate<'players'> = {
      rg_link: rgLink ?? null,
      rg_avatar_url: null,
      rg_index: null,
    }

    updatePlayer.mutate({ updates }, {
      onError: (error) => notifications.show('Playerzone URL konnte nicht gesetzt werden. ' + error.message, {
        severity: 'error',
      }),
      onSuccess: () => notifications.show('Playerzone URL erfolgreich aktualisiert', { severity: 'success' })
    });
  }

  return (
    <Dialog open={open} onClose={() => onClose(null)} fullScreen>
      <AppBar sx={{ position: 'sticky', pt: 'env(safe-area-inset-top)' }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => onClose(null)}>
            <Close />
          </IconButton>
          <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
            Playerzone Profil
          </Typography>
        </Toolbar>
      </AppBar>
      <Container>
        <List sx={{ pb: 10 }}>
          {player_data?.rg_avatar_url && (
            <Container
              key={'avatar'}
              sx={{
                display: 'flex',
                justifyContent: 'center',
                flexDirection: 'column',
                alignItems: 'center',
                m: 2,
                p: 0,
                width: 'auto',
                maxWidth: 'unset!important',
              }}
            >
              <Avatar sx={{ borderRadius: 2, width: '150px', height: '150px' }}>
                <img src={player_data.rg_avatar_url} alt="logo" width={'150px'} height={'150px'} />
              </Avatar>
              <Button
                component="label"
                disabled={loading}
                sx={{ border: 'none', background: 'transparent', mt: 1 }}
                startIcon={loading ? <CircularProgress size={'20px'} /> : <AddPhotoAlternateOutlined />}
                onClick={handleChangeProfilePicture}
              >
                Dieses Bild als Profilbild verwenden
              </Button>
            </Container>
          )}
          <Alert sx={{ mb: 1, mt: 2 }} severity="info">
            Mit deiner Playerzone-URL werden täglich deine Daten von der Playerzone abgeglichen und geladen.
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
            player_data?.rg_link !== rgLink && <Box sx={{ display: "flex", justifyContent: "end" }}>
              <Button disabled={loading} onClick={onSafeRgLinkClick}>
                Speichern
              </Button>
            </Box>
          }
          {player_data?.rg_id && (
            <ListItem
              key={'id'}
              sx={{ '&.MuiListItem-root': { p: 0 } }}
              secondaryAction={
                player_data?.rg_id ? (
                  <IconButton onClick={() => navigator.clipboard.writeText(player_data?.rg_id ?? '')}>
                    <ContentCopy />
                  </IconButton>
                ) : undefined
              }
            >
              <ListItemAvatar sx={{ flexDirection: 'row', display: 'flex', alignItems: 'center' }}>
                <Link sx={{ color: 'rgba(0,0,0,0.54)' }} />
              </ListItemAvatar>
              <ListItemText primary={player_data?.rg_id} secondary={'Roundnet Germany ID'} />
            </ListItem>
          )}
          {player_data?.rg_index && (
            <ListItem
              key={'rgx'}
              disableGutters
              sx={{
                '&.MuiListItem-root': { p: 0 },
              }}
              secondaryAction={
                player_data?.pro_status ? (
                  <Chip
                    variant="outlined"
                    label="Pro Status"
                    sx={{ mx: 2, borderRadius: 3, background: 'black', color: 'white' }}
                  />
                ) : undefined
              }
            >
              <ListItemAvatar>
                <img src={rg_small} alt={'pz logo'} width="25" height="25" />
              </ListItemAvatar>
              <ListItemText primary={player_data?.rg_index} secondary={'Roundnet Germany Index'} />
            </ListItem>
          )}
          <Divider />
          {player_data?.ka_index && (
            <ListItem
              key={'kax'}
              disableGutters
              sx={{
                '&.MuiListItem-root': { p: 0 },
              }}
            >
              <ListItemAvatar></ListItemAvatar>
              <ListItemText primary={player_data?.ka_index.toFixed()} secondary={'Interner Index'} />
            </ListItem>
          )}
          {player_data?.effective_rating_cached && (
            <ListItem
              key={'eff_idx'}
              disableGutters
              sx={{
                '&.MuiListItem-root': { p: 0 },
              }}
              secondaryAction={<Tooltip title="Trend der letzten 30 Tage" enterTouchDelay={0}>
                <span>
                  <Chip
                    sx={{ pointerEvents: 'none' }}
                    color={elo_change_last_30_days > 0 ? 'success' : elo_change_last_30_days < 0 ? 'error' : 'info'}
                    label={elo_change_last_30_days.toFixed(2)}
                    icon={elo_change_last_30_days > 0 ? <TrendingUp /> : elo_change_last_30_days < 0 ? <TrendingDown /> : <TrendingFlat />} />
                </span>
              </Tooltip>}
            >
              <ListItemAvatar></ListItemAvatar>
              <ListItemText primary={player_data?.effective_rating_cached.toFixed()} secondary={'Kombinierter Index'} />
            </ListItem>
          )}
          <ListItem
            key={'hide'}
            disableGutters
            sx={{
              '&.MuiListItem-root': { p: 0 },
            }}
          >
            <ListItemAvatar>
              <Checkbox
                disabled={updateHideRatingMutation.isPending}
                checked={player_data?.hide_rating ?? false}
                onChange={(e) => updateHideRatingMutation.mutate({ hide_rating: e.target.checked })}
              />
            </ListItemAvatar>
            <ListItemText
              primary={'Index verbergen?'}
              secondary={
                'Dein Index wird anderen Spielern verborgen. Für die Berechnung wird er aber weiterhin verwendet'
              }
            />
          </ListItem>
        </List>
      </Container >
    </Dialog>
  );
};
