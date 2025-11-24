import { supabase } from '@/lib/supabase';
import { UserWithGroups } from '@/types/supabaseTypes';
import { captureException } from '@sentry/react';
import { DialogProps } from '@toolpad/core/useDialogs';
import { NotificationsProvider, useNotifications } from '@toolpad/core/useNotifications';
import { useState } from 'react';

import AddPhotoAlternateOutlined from '@mui/icons-material/AddPhotoAlternateOutlined';
import Close from '@mui/icons-material/Close';
import EmailOutlined from '@mui/icons-material/EmailOutlined';
import PersonOutlineOutlined from '@mui/icons-material/PersonOutlineOutlined';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';

type ContactInformationPayload = {
  user: UserWithGroups;
};

export const ContactInformation = ({
  payload,
  open,
  onClose,
}: DialogProps<ContactInformationPayload, string | null>) => {
  return (
    <Dialog fullScreen open={open} onClose={() => onClose(null)}>
      <NotificationsProvider>
        <Content open={open} onClose={onClose} payload={payload} />
      </NotificationsProvider>
    </Dialog>
  );
};

const Content = ({ payload, onClose }: DialogProps<ContactInformationPayload, string | null>) => {
  const notifications = useNotifications();
  const [displayName, setDisplayName] = useState(payload.user.displayName);
  const [name, setName] = useState(payload.user.name.split(' ')[0] ?? '');
  const [surname, setSurname] = useState(payload.user.name.split(' ')[1] ?? '');
  const [loadingSave, setLoadingSave] = useState(false);

  const updateDisplayName = async () => {
    setLoadingSave(true);
    if (name.length < 6 || displayName.length < 4) {
      notifications.show('Name oder Anzeigename müssen 6 bzw. 4 Zeichen lang sein', { severity: 'warning' });
      return;
    }
    if (name.split(' ').length < 2) {
      notifications.show('Du musst dein vollen Name, mit Vor und Nachname angeben', { severity: 'warning' });
      return;
    }

    const { error } = await supabase.from('user').update({ name, displayName }).eq('userId', payload.user.id);
    if (error) {
      notifications.show(error.message, { severity: 'error' });
      captureException(error);
      setLoadingSave(false);
      return;
    }
    const { error: authError } = await supabase.auth.updateUser({
      data: { displayName, name },
    });
    if (authError) {
      notifications.show(authError.message, { severity: 'error' });
      captureException(authError);
      setLoadingSave(false);
      return;
    }
    notifications.show('Successfully updated your profile!', { severity: 'success' });
    setLoadingSave(false);
  };

  return (
    <>
      <AppBar sx={{ position: 'sticky', pt: 'env(safe-area-inset-top)' }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => onClose(null)}>
            <Close />
          </IconButton>
          <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
            Profil und Account
          </Typography>
          <Button color="inherit" onClick={updateDisplayName}>
            {loadingSave ? 'Laden...' : 'Speichern'}
          </Button>
        </Toolbar>
      </AppBar>
      <Container>
        <List sx={{ pl: 2, pr: 2, pb: 10 }}>
          <Container
            key={'avatar'}
            sx={{
              display: 'flex',
              justifyContent: 'center',
              m: 2,
              p: 0,
              width: 'auto',
            }}
          >
            <Avatar sx={{ borderRadius: 2, width: '150px', height: '150px' }}>
              {payload.user.avatarUrl ? (
                <img src={payload.user.avatarUrl} alt="logo" width={'150px'} height={'150px'} />
              ) : (
                <AddPhotoAlternateOutlined sx={{ fontSize: '50px' }} />
              )}
            </Avatar>
          </Container>

          <ListItem key={'firstName'} sx={{ '&.MuiListItem-root': { p: 0 } }}>
            <ListItemAvatar>
              <PersonOutlineOutlined sx={{ color: 'rgba(0,0,0,0.54)' }} />
            </ListItemAvatar>
            <TextField
              fullWidth
              size="small"
              variant="outlined"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              label="Anzeigename"
              margin="normal"
            />
          </ListItem>
          <ListItem key={'name'} sx={{ '&.MuiListItem-root': { p: 0 } }}>
            <ListItemAvatar />
            <TextField
              fullWidth
              size="small"
              variant="outlined"
              value={name}
              onChange={(e) => setName(e.target.value)}
              label="Vorname"
              margin="normal"
            />
          </ListItem>
          <ListItem key={'surname'} sx={{ '&.MuiListItem-root': { p: 0 } }}>
            <ListItemAvatar />
            <TextField
              fullWidth
              size="small"
              variant="outlined"
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              label="Nachame"
              margin="normal"
            />
          </ListItem>
          <ListItem key={'email'} sx={{ '&.MuiListItem-root': { p: 0 } }}>
            <ListItemAvatar>
              <EmailOutlined sx={{ color: 'rgba(0,0,0,0.54)' }} />
            </ListItemAvatar>
            <ListItemText primary={payload.user.email} secondary={'Email'} />
          </ListItem>
        </List>
      </Container>
    </>
  );
};
