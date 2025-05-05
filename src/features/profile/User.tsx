import {
  AccountCircle,
  Cancel,
  CheckCircle,
  Logout,
  NotificationsRounded,
  Password
} from '@mui/icons-material';
import {
  Card,
  CardActionArea,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography
} from '@mui/material';
import { useDialogs } from '@toolpad/core/useDialogs';
import React from 'react';
import { Navigate, useNavigate } from 'react-router';
import { supabase } from 'src/components/services/supabase/supabaseClient';
import Layout from '../../components/Layout';
import pzLogo from '../../images/pz_logo.svg';
import { AppDispatch, useAppDispatch } from '../../redux/store';
import { UserWithRolesAndPermissions } from '../../types/supabaseTypes';
import { useApplication } from '../auth/AuthContext';
import { ContactInformation } from './ContactInformation';
import { isNotificationSupported, NotificationsDialog } from './NotificationsDialog';
import { PlayerzoneProfileDialog } from './PlayerzoneProfile';
import { ProfileImage } from './ProfileImage';

type UserScreenProps = {
  user: UserWithRolesAndPermissions;
  dispatch: AppDispatch;
  handleSignOut: () => void;
  provider_token: string | null;
};

const UserScreenProvider = () => {
  const { user, signOut, provider_token } = useApplication();
  const dispatch = useAppDispatch();

  if (!user)
    return <Navigate to={"/"} replace />

  return <UserScreen user={user} provider_token={provider_token} dispatch={dispatch} handleSignOut={signOut} />;
};

const UserScreen = ({ user, dispatch, provider_token }: UserScreenProps) => {
  const dialogs = useDialogs();
  const navigate = useNavigate();

  return (
    <Layout appBarConfig={{ title: 'Profil', showProfile: false }}>
      <List sx={{ pl: 2, pr: 2, pb: 10 }}>
        <ProfileImage user={user} />
        <Typography variant="h5" component={"div"} sx={{ textAlign: "center" }}>{user.name}</Typography>
        <Card sx={{ borderRadius: 2, py: 0, px: 0, mt: 1 }}>
          <CardActionArea sx={{ px: 1 }}>
            <ListItem
              onClick={async () => {
                await dialogs.open(ContactInformation, { user });
              }}>
              <ListItemAvatar sx={{ flexDirection: 'row', display: 'flex', alignItems: 'center' }}>
                <AccountCircle />
              </ListItemAvatar>
              <ListItemText primary="Profil und Account" />
            </ListItem>
          </CardActionArea>
        </Card>
        <Card sx={{ borderRadius: 2, py: 0, px: 0, mt: 1 }}>
          <CardActionArea sx={{ px: 1 }}>
            <ListItem
              onClick={() => {
                navigate("/reset-password")
              }}>
              <ListItemAvatar sx={{ flexDirection: 'row', display: 'flex', alignItems: 'center' }}>
                <Password />
              </ListItemAvatar>
              <ListItemText primary="Passwort ändern" />
            </ListItem>
          </CardActionArea>
        </Card>
        <Card sx={{ borderRadius: 2, py: 0, px: 0, mt: 1 }}>
          <CardActionArea sx={{ px: 1 }}>
            <ListItem
              onClick={async () => {
                await dialogs.open(NotificationsDialog, { user, dispatch })
              }}
              secondaryAction={isNotificationSupported() && Notification.permission === 'granted' ? <CheckCircle color='success' /> : <Cancel color="error" />}>
              <ListItemAvatar sx={{ flexDirection: 'row', display: 'flex', alignItems: 'center' }}>
                <NotificationsRounded />
              </ListItemAvatar>
              <ListItemText primary="Benachrichtigungen" />
            </ListItem>
          </CardActionArea>
        </Card>
        <Card sx={{ borderRadius: 2, py: 0, px: 0, mt: 1 }}>
          <CardActionArea sx={{ px: 1 }}>
            <ListItem
              onClick={async () => {
                await dialogs.open(PlayerzoneProfileDialog, { player_data: user.player_data, user })
              }}
              secondaryAction={user.player_data?.rg_id && user.player_data?.rg_link ? <CheckCircle color='success' /> : <Cancel color="error" />}>
              <ListItemAvatar sx={{ flexDirection: 'row', display: 'flex', alignItems: 'center' }}>
                <img src={pzLogo} alt={'pz logo'} width="20" height="20" />
              </ListItemAvatar>
              <ListItemText primary="Playerzone Profil" />
            </ListItem>
          </CardActionArea>
        </Card>
        <Card sx={{ color: "red", borderRadius: 2, py: 0, px: 0, mt: 1 }}>
          <CardActionArea sx={{ px: 1 }}>
            <ListItem
              onClick={() => {
                supabase.auth.signOut();
              }}>
              <ListItemAvatar sx={{ flexDirection: 'row', display: 'flex', alignItems: 'center' }}>
                <Logout />
              </ListItemAvatar>
              <ListItemText primary="Logout" />
            </ListItem>
          </CardActionArea>
        </Card>
      </List>
    </Layout >
  );
};
export default UserScreenProvider;
