import { supabase } from '@/lib/supabase';
import { captureException } from '@sentry/react';
import { useNotifications } from '@toolpad/core/useNotifications';
import { useState } from 'react';

import Layout from '@/components/layout/Layout';
import AddPhotoAlternateOutlined from '@mui/icons-material/AddPhotoAlternateOutlined';
import EmailOutlined from '@mui/icons-material/EmailOutlined';
import PersonOutlineOutlined from '@mui/icons-material/PersonOutlineOutlined';
import SaveIcon from '@mui/icons-material/Save';
import Avatar from '@mui/material/Avatar';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Fab from '@mui/material/Fab';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import { useGrants } from '../auth/GrantsContext';

const ContactInformation = () => {
  const notifications = useNotifications();
  const { user } = useGrants();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [name, setName] = useState(user.name.split(' ')[0] ?? '');
  const [surname, setSurname] = useState(user.name.split(' ')[1] ?? '');
  const [loadingSave, setLoadingSave] = useState(false);

  const updateDisplayName = async () => {
    setLoadingSave(true);
    const fullName = `${name} ${surname}`;
    if (fullName.length < 6 || displayName.length < 4) {
      notifications.show('Name oder Anzeigename müssen 6 bzw. 4 Zeichen lang sein', { severity: 'warning' });
      return;
    }
    if (fullName.split(' ').length < 2) {
      notifications.show('Du musst dein vollen Name, mit Vor und Nachname angeben', { severity: 'warning' });
      return;
    }

    const { error } = await supabase.from('user').update({ name: fullName, displayName }).eq('id', user.id);
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
    <Layout appBarConfig={{ title: 'Profil und Account', showProfile: false, navigateBackPath: '/user' }}>
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
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="logo" width={'150px'} height={'150px'} />
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
            <ListItemText primary={user.email} secondary={'Email'} />
          </ListItem>
        </List>
        {(user.displayName !== displayName || user.name !== `${name} ${surname}`) && (
          <Fab
            onClick={updateDisplayName}
            sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1000 }}
            aria-label="save"
          >
            {loadingSave ? <CircularProgress size={25} color="inherit" /> : <SaveIcon />}
          </Fab>
        )}
      </Container>
    </Layout>
  );
};
export default ContactInformation;
