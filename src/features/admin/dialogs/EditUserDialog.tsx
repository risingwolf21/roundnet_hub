import { Box, Stack } from '@mui/system';
import { useNotifications } from '@toolpad/core/useNotifications';
import { FormEvent, useState } from 'react';
import { UserWithGroups } from '../../../types/supabaseTypes';
import { SlideUpTransition } from '../../../utils';
import { UserRoleDialog } from './UserRoleDialog';

import { supabase } from '@/lib/supabase';
import AccountCircle from '@mui/icons-material/AccountCircle';
import Close from '@mui/icons-material/Close';
import Edit from '@mui/icons-material/Edit';
import Email from '@mui/icons-material/Email';
import FiberManualRecord from '@mui/icons-material/FiberManualRecord';
import Password from '@mui/icons-material/Password';
import Verified from '@mui/icons-material/Verified';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import TextField from '@mui/material/TextField';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { captureException } from '@sentry/react';

type EditUserDialogProps = {
  user: UserWithGroups;
  open: boolean;
  handleClose: () => void;
  onUserEditFinished: (user: UserEdited) => void;
  deleteUser: (user: User) => void;
};

export type UserEdited = {
  displayName: string;
  verified: boolean;
  userId: string;
  role: UserRole;
};

async function resetUserPassword(userId: string, newPassword: string) {
  const { data: session } = await supabase.auth.getSession();
  const accessToken = session?.session?.access_token;
  if (!accessToken) throw new Error('Not authenticated');

  const resp = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-user-password`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ userId, newPassword }),
    }
  );
  console.log(resp.json());
  if (!resp.ok) throw new Error(await resp.text());
  return resp.json();
}

const EditUserDialog = ({ user, open, handleClose, onUserEditFinished }: EditUserDialogProps) => {
  const notifications = useNotifications();
  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const [verified, setVerified] = useState(user.verified);
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(user.role);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);

    onUserEditFinished({
      userId: user.userId,
      displayName: data.get('displayName'),
      verified,
      role: role,
    } as UserEdited);
  };

  return (
    <Dialog fullScreen open={open} onClose={handleClose} TransitionComponent={SlideUpTransition}>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <AppBar position="sticky" sx={{ pt: 'env(safe-area-inset-top)' }}>
          <Toolbar>
            <IconButton edge="start" color="inherit" onClick={handleClose} aria-label="close">
              <Close />
            </IconButton>
            <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
              Benutzer bearbeiten
            </Typography>
            <Button sx={{ color: 'white' }} type="submit">
              Speichern
            </Button>
          </Toolbar>
        </AppBar>
        <Box>
          <List sx={{ pb: 10 }}>
            <ListItem key={'displayName'} sx={{ pt: 0, pb: 0 }}>
              <ListItemAvatar>
                <Avatar>
                  <AccountCircle />
                </Avatar>
              </ListItemAvatar>
              <ListItemText>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id=" displayName"
                  label="DisplayName"
                  name="displayName"
                  defaultValue={user?.displayName ? user.displayName : ''}
                />
              </ListItemText>
            </ListItem>
            <ListItem key={'email'} sx={{ pt: 0, pb: 0 }}>
              <ListItemAvatar>
                <Avatar>
                  <Email />
                </Avatar>
              </ListItemAvatar>
              <ListItemText>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="Email"
                  name="email"
                  disabled
                  defaultValue={user?.email ? user.email : ''}
                />
              </ListItemText>
            </ListItem>
            <ListItem key={'password'} sx={{ pt: 0, pb: 0 }}>
              <ListItemAvatar>
                <Avatar>
                  <Password />
                </Avatar>
              </ListItemAvatar>
              <Stack direction={'row'} spacing={1}>
                <TextField
                  margin="normal"
                  fullWidth
                  label="Passwort ändern"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                  onClick={async () => {
                    try {
                      const result = await resetUserPassword(user.userId, password);
                      notifications.show('Passwort erfolgreich zurückgesetzt', { severity: 'success' });
                      setPassword('');
                    } catch (error: any) {
                      captureException(error);
                      notifications.show(`Fehler beim Zurücksetzen des Passworts: ${error.message}`, { severity: 'error' });
                    }
                  }}
                >
                  Speichern
                </Button>
              </Stack>
            </ListItem>
            <ListItem
              key={'verified'}
              secondaryAction={<Checkbox checked={verified} onChange={(e) => setVerified(e.target.checked)} />}
            >
              <ListItemAvatar>
                <Avatar>
                  <Verified />
                </Avatar>
              </ListItemAvatar>
              <ListItemText primary="Verified" />
            </ListItem>
            <ListItem
              key={'role'}
              onClick={() => { }}
              secondaryAction={
                <IconButton
                  onClick={(event) => {
                    setEditRoleOpen(true);
                    event.stopPropagation();
                  }}
                >
                  <Edit />
                </IconButton>
              }
            >
              <ListItemAvatar>
                <Avatar>
                  <AccountCircle />
                </Avatar>
              </ListItemAvatar>
              <ListItemText primary={role} secondary={'User Role'} />
            </ListItem>
            <Divider />
            <List subheader={<ListSubheader>Gruppen</ListSubheader>}>
              {user?.groups &&
                user.groups.map((x: Group) => (
                  <ListItem key={x.id} divider>
                    <ListItemAvatar>
                      <FiberManualRecord sx={{ color: x.color }} />
                    </ListItemAvatar>
                    <ListItemText primary={x.name} />
                  </ListItem>
                ))}
            </List>
            <Divider />
          </List>
        </Box>
      </Box>
      <UserRoleDialog
        open={editRoleOpen}
        role={role}
        handleClose={() => setEditRoleOpen(false)}
        handleSubmit={(role: UserRole) => {
          setRole(role);
          setEditRoleOpen(false);
        }}
      />
    </Dialog>
  );
};

export default EditUserDialog;
