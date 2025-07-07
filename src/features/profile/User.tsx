import {
  AccountCircle,
  Cancel,
  CheckCircle,
  Downloading,
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
import { DialogComponent, useDialogs } from '@toolpad/core/useDialogs';
import { isSupported } from 'firebase/messaging';
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import Layout from 'src/components/layout/Layout';
import { usePlayer } from 'src/tanstack/player_data';
import pzLogo from '../../images/pz_logo.svg';
import { UserWithGroups } from '../../types/supabaseTypes';
import { useAuthentication } from '../auth/AuthProvider';
import { ContactInformation } from './ContactInformation';
import { NotificationsDialog } from './NotificationsDialog';
import { PlayerzoneProfileDialog } from './PlayerzoneProfile';
import { ProfileImage } from './ProfileImage';

type UserScreenProps = {
  user: UserWithGroups;
  handleSignOut: () => void;
};

const UserScreenProvider = () => {
  const { user, signOut } = useAuthentication();

  return <UserScreen user={user} handleSignOut={signOut} />;
};

const UserScreen = ({ user, handleSignOut }: UserScreenProps) => {
  const dialogs = useDialogs();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [notificationSupported, setNotificationSUpported] = useState(false);
  const { data: player_data, isLoading } = usePlayer(user)

  const openDialog = useCallback(async (dialog: DialogComponent<any, unknown>, payload: any, name: string) => {
    setSearchParams((prev) => {
      prev.set("dialog", name);
      return prev;
    });
    const result = await dialogs.open(dialog, payload)
    setSearchParams((prev) => {
      prev.delete("dialog");
      return prev;
    });
    return result;
  }, [dialogs, setSearchParams]);

  useEffect(() => {
    isSupported().then(result => {
      setNotificationSUpported(result);
      if (searchParams.get("dialog") === "playerzone") {
        openDialog(PlayerzoneProfileDialog, { user }, "playerzone");
      } else if (searchParams.get("dialog") === "contact_information") {
        openDialog(ContactInformation, { user }, "contact_information");
      } else if (searchParams.get("dialog") === "notifications") {
        openDialog(NotificationsDialog, { user, notificationSupported: result }, "notifications");
      }
    });
  }, [openDialog, searchParams, user]);


  return (
    <Layout appBarConfig={{ title: 'Profil', showProfile: false }}>
      <List sx={{ pl: 2, pr: 2, pb: 10 }}>
        <ProfileImage user={user} />
        <Typography variant="h5" component={"div"} sx={{ textAlign: "center" }}>{user.name}</Typography>
        <Card sx={{ borderRadius: 2, py: 0, px: 0, mt: 1 }}>
          <CardActionArea sx={{ px: 1 }}>
            <ListItem
              onClick={async () => {
                await openDialog(ContactInformation, { user }, "contact_information");
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
                navigate("/auth/reset-password")
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
                await openDialog(NotificationsDialog, { user, notificationSupported }, "notifications");
              }}
              secondaryAction={notificationSupported && Notification.permission === 'granted' ? <CheckCircle color='success' /> : <Cancel color="error" />}>
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
                await openDialog(PlayerzoneProfileDialog, { user }, "playerzone");
              }}
              secondaryAction={
                isLoading
                  ? <Downloading />
                  : player_data?.rg_id && player_data?.rg_link
                    ? <CheckCircle color='success' />
                    : <Cancel color="error" />}>
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
              onClick={handleSignOut}>
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
