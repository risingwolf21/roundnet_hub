import Layout from '@/components/layout/Layout';
import { usePlayer } from '@/tanstack/player_data';
import AccountCircle from '@mui/icons-material/AccountCircle';
import CalendarMonth from '@mui/icons-material/CalendarMonth';
import Cancel from '@mui/icons-material/Cancel';
import CheckCircle from '@mui/icons-material/CheckCircle';
import ContentCopy from '@mui/icons-material/ContentCopy';
import Downloading from '@mui/icons-material/Downloading';
import Logout from '@mui/icons-material/Logout';
import NotificationsRounded from '@mui/icons-material/NotificationsRounded';
import Password from '@mui/icons-material/Password';
import { useNotifications } from '@toolpad/core';
import { DialogComponent, useDialogs } from '@toolpad/core/useDialogs';
import { useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import pzLogo from '../../images/pz_logo.svg';
import { UserWithGroups } from '../../types/supabaseTypes';
import { useGrants } from '../auth/GrantsContext';
import { ContactInformation } from './ContactInformation';
import { NotificationsDialog } from './NotificationsDialog';
import { PlayerzoneProfileDialog } from './PlayerzoneProfile';
import { ProfileImage } from './ProfileImage';

import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';

type UserScreenProps = {
  user: UserWithGroups;
  handleSignOut: () => void;
};

const UserScreenProvider = () => {
  const { user, signOut } = useGrants();

  return <UserScreen user={user} handleSignOut={signOut} />;
};

const UserScreen = ({ user, handleSignOut }: UserScreenProps) => {
  const dialogs = useDialogs();
  const notifications = useNotifications();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const notificationSupported = ('serviceWorker' in navigator) && ('PushManager' in window);
  const { data: player_data, isLoading } = usePlayer(user);

  const iOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

  const openDialog = useCallback(
    async (dialog: DialogComponent<any, unknown>, payload: any, name: string) => {
      setSearchParams((prev) => {
        prev.set('dialog', name);
        return prev;
      });
      const result = await dialogs.open(dialog, payload);
      setSearchParams((prev) => {
        prev.delete('dialog');
        return prev;
      });
      return result;
    },
    [dialogs, setSearchParams]
  );

  useEffect(() => {
    if (searchParams.get('dialog') === 'playerzone') {
      openDialog(PlayerzoneProfileDialog, { user }, 'playerzone');
    } else if (searchParams.get('dialog') === 'contact_information') {
      openDialog(ContactInformation, { user }, 'contact_information');
    } else if (searchParams.get('dialog') === 'notifications') {
      openDialog(NotificationsDialog, { user, notificationSupported: notificationSupported }, 'notifications');
    }
  }, [openDialog, searchParams, user, notificationSupported]);

  const copyIcalURLToClipboard = () => {
    if (iOS) {
      window.location.href = `webcal://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.functions.supabase.co/ical?userId=${user.userId}`;
    } else {
      navigator.clipboard.writeText(
        `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.functions.supabase.co/ical?userId=${user.userId}`
      );
      notifications.show(
        'URL in Zwischenablage kopiert - Abonniere den Kalendar jetzt selbst mit der URL',
        { severity: 'info' }
      );
    }
  }

  return (
    <Layout appBarConfig={{ title: 'Profil', showProfile: false }}>
      <List sx={{ pl: 2, pr: 2, pb: 10 }}>
        <ProfileImage user={user} />
        <Typography variant="h5" component={'div'} sx={{ textAlign: 'center' }}>
          {user.name}
        </Typography>
        <Card sx={{ borderRadius: 2, py: 0, px: 0, mt: 1 }}>
          <CardActionArea sx={{ px: 1 }}>
            <ListItem
              onClick={async () => {
                await openDialog(ContactInformation, { user }, 'contact_information');
              }}
            >
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
                navigate('/auth/reset-password');
              }}
            >
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
                await openDialog(NotificationsDialog, { user, notificationSupported }, 'notifications');
              }}
              secondaryAction={
                notificationSupported && Notification.permission === 'granted' ? (
                  <CheckCircle color="success" />
                ) : (
                  <Cancel color="error" />
                )
              }
            >
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
                await openDialog(PlayerzoneProfileDialog, { user }, 'playerzone');
              }}
              secondaryAction={
                isLoading ? (
                  <Downloading />
                ) : player_data?.rg_id && player_data?.rg_link ? (
                  <CheckCircle color="success" />
                ) : (
                  <Cancel color="error" />
                )
              }
            >
              <ListItemAvatar sx={{ flexDirection: 'row', display: 'flex', alignItems: 'center' }}>
                <img src={pzLogo} alt={'pz logo'} width="20" height="20" />
              </ListItemAvatar>
              <ListItemText primary="Playerzone Profil" />
            </ListItem>
          </CardActionArea>
        </Card>
        <Card sx={{ borderRadius: 2, py: 0, px: 0, mt: 1 }}>
          <CardActionArea sx={{ px: 1 }}>
            <ListItem
              secondaryAction={
                iOS && (
                  <IconButton sx={{ pr: 0 }} onClick={() => {
                    copyIcalURLToClipboard();
                    notifications.show(
                      'URL in Zwischenablage kopiert - Abonniere den Kalendar jetzt selbst mit der URL',
                      { severity: 'info' }
                    );
                  }}>
                    <ContentCopy />
                  </IconButton>
                )
              }
            >
              <ListItemAvatar sx={{ flexDirection: 'row', display: 'flex', alignItems: 'center' }}>
                <CalendarMonth />
              </ListItemAvatar>
              <ListItemText
                primary="Kalendar abonnieren"
                secondary="Zeige deine zugesagten Events in deinem Kalendar an. Klicke hier oder kopiere rechts den Link"
              />
            </ListItem>
          </CardActionArea>
        </Card>
        <Card sx={{ color: 'red', borderRadius: 2, py: 0, px: 0, mt: 1 }}>
          <CardActionArea sx={{ px: 1 }}>
            <ListItem onClick={handleSignOut}>
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
