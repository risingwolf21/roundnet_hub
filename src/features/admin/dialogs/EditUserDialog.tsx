import {
  AccountCircle,
  Close,
  Edit,
  Email,
  FiberManualRecord,
  Password,
  Verified
} from '@mui/icons-material';
import {
  AppBar,
  Avatar,
  Button,
  Checkbox,
  Dialog,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListSubheader,
  TextField,
  Toolbar,
  Typography
} from '@mui/material';
import { Box, Stack } from '@mui/system';
import { useNotifications } from '@toolpad/core/useNotifications';
import React, { FormEvent, useState } from 'react';
import { supabase } from 'src/lib/supabase';
import { UserWithGroups } from '../../../types/supabaseTypes';
import { SlideUpTransition } from '../../../utils';
import { UserRoleDialog } from './UserRoleDialog';

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

const EditUserDialog = ({ user, open, handleClose, onUserEditFinished, deleteUser }: EditUserDialogProps) => {
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
            <ListItem
              key={'password'}
              sx={{ pt: 0, pb: 0 }}
            >
              <ListItemAvatar>
                <Avatar>
                  <Password />
                </Avatar>
              </ListItemAvatar>
              <Stack direction={"row"} spacing={1}>
                <TextField
                  margin="normal"
                  fullWidth
                  label="Passwort ändern"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                  onClick={() => {
                    supabase.auth.admin
                      .updateUserById(user.userId, {
                        password: password,
                      })
                      .then((result) => {
                        if (result.error)
                          notifications.show(result.error.message, { severity: 'error' });
                        else
                          notifications.show('Passwort erfolgreich geändert', { severity: 'success' });
                      })
                      .catch((error) => {
                        notifications.show(error.message, { severity: 'error' });
                      });
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
