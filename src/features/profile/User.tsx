import {
  AccountCircle,
  AddPhotoAlternateOutlined,
  CalendarMonth,
  Cancel,
  CheckCircle,
  DeleteOutline,
  EditOutlined,
  Group,
  Logout,
  NotificationsRounded,
  Save
} from '@mui/icons-material';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  CircularProgress,
  Container,
  Fab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography
} from '@mui/material';
import { captureException } from '@sentry/react';
import { SupabaseClient } from '@supabase/supabase-js';
import { uuid } from '@supabase/supabase-js/dist/main/lib/helpers';
import { useDialogs } from '@toolpad/core/useDialogs';
import { useNotifications } from '@toolpad/core/useNotifications';
import Compressor from 'compressorjs';
import React, { useState } from 'react';
import { useClient } from 'react-supabase';
import { dataURLtoFile, readFile } from 'src/utils';
import CropImageDialog from '../../components/CropImageDialog';
import Layout from '../../components/Layout';
import pzLogo from '../../images/pz_logo.svg';
import { AppDispatch, useAppDispatch } from '../../redux/store';
import { Database } from '../../types/supabase-generated.types';
import { UserWithRolesAndPermissions } from '../../types/supabaseTypes';
import { useAuth } from '../auth/AuthContext';
import { CalendarSettingsDialog } from './CalendarSettings';
import { ContactInformation } from './ContactInformation';
import { GroupsDialog } from './GroupsDialog';
import { isNotificationSupported, NotificationsDialog } from './NotificationsDialog';
import { PlayerzoneProfileDialog } from './PlayerzoneProfile';
import { updateCalenderSettingsAsync } from 'src/redux/applicationSlice';
import { supabase } from 'src/components/services/supabase/supabaseClient';

type UserScreenProps = {
  user: UserWithRolesAndPermissions;
  deviceId: string;
  client: SupabaseClient<Database>;
  dispatch: AppDispatch;
  handleSignOut: () => void;
  provider_token: string | null;
};

const UserScreenProvider = () => {
  const { user, signOut, deviceId, provider_token } = useAuth();
  const client = useClient();
  const dispatch = useAppDispatch();

  return <UserScreen user={user!} provider_token={provider_token} deviceId={deviceId} client={client} dispatch={dispatch} handleSignOut={signOut} />;
};

const UserScreen = ({ user, client, dispatch, provider_token }: UserScreenProps) => {
  const dialogs = useDialogs();
  const notifications = useNotifications();
  const [selectedImage, setSelectedImage] = useState<string | ArrayBuffer | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [cropImageDialogOpen, setCropImageDialogOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState(user);
  const [loadingSave, setLoadingSave] = useState(false);

  const handleSubmit = async () => {
    setLoadingSave(true);
    if (croppedImage) {
      let fileName = uuid() + '.jpg';
      new Compressor(dataURLtoFile(croppedImage, fileName), {
        convertSize: 1000000, // 1 MB
        success: async (file) => {
          let compressedFile = await readFile(file);
          if (compressedFile && typeof compressedFile === 'string') {
            await removeOldAvatarImages();
            await uploadAvatarImage(fileName, compressedFile);
            setCroppedImage(null);
          } else {
            notifications.show('Something went wrong compressing your image. Please try again.', { severity: "error" })
          }
        },
      });
    }
    setLoadingSave(false);
  };

  const removeOldAvatarImages = async () => {
    const { data: list, error } = await client.storage.from('user').list(`${user.userId}`);
    if (error || !list) {
      captureException(error);
      return;
    }
    const filesToRemove = list.map((x) => `${user.userId}/${x.name}`);

    await client.storage.from('user').remove(filesToRemove);
  };

  const uploadAvatarImage = async (fileName: string, compressedImage: string) => {
    const { data: uploadData, error } = await client.storage
      .from('user')
      .upload(`${user.userId}/${fileName}`, dataURLtoFile(compressedImage, fileName), {
        upsert: true,
      });

    if (!error && uploadData && uploadData.path) {
      const { data } = client.storage.from('user').getPublicUrl(uploadData.path);

      const { error } = await client.from('user').update({ avatarUrl: data.publicUrl }).eq('userId', user.userId);
      if (error) {
        client.storage.from('user').remove([uploadData.path]);
      }
      setCurrentUser({ ...currentUser, avatarUrl: data.publicUrl });
      setCroppedImage(null);
    } else {
      notifications.show('Something went wrong uploading your image. Please try it again.', { severity: "error" });
    }
  };

  const onImageInputChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    if (!event.target.files || event.target.files.length === 0) return;

    let imageDataUrl = await readFile(event.target.files[0]);
    setSelectedImage(imageDataUrl);
    setCropImageDialogOpen(true);
    event.target.files = null;
    event.target.value = '';
  };

  return (
    <Layout appBarConfig={{ title: 'Profil', showProfile: false }}>
      <List sx={{ pl: 2, pr: 2, pb: 10 }}>
        <Container
          key={'avatar'}
          sx={{
            display: 'flex',
            justifyContent: 'center',
            flexDirection: 'column',
            m: 2,
            p: 0,
            width: 'auto',
          }}
        >
          <Button component="label" sx={{ border: 'none', background: 'transparent' }}>
            <input accept="image/*" type="file" hidden onChange={onImageInputChange} />
            <Avatar sx={{ borderRadius: 2, width: '150px', height: '150px' }}>
              {croppedImage ? (
                <img src={croppedImage} alt="logo" width={'150px'} height={'150px'} />
              ) : currentUser.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt="logo" width={'150px'} height={'150px'} />
              ) : (
                <AddPhotoAlternateOutlined sx={{ fontSize: '50px' }} />
              )}
            </Avatar>
          </Button>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
            {currentUser.avatarUrl ? (
              <>
                <Button
                  component="label"
                  sx={{ border: 'none', background: 'transparent', mr: 2 }}
                  startIcon={<EditOutlined />}
                >
                  <input accept="image/*" type="file" hidden onChange={onImageInputChange} />
                  Change
                </Button>
                <Button
                  startIcon={<DeleteOutline />}
                  onClick={() => setCurrentUser({ ...currentUser, avatarUrl: null })}
                >
                  Remove
                </Button>
              </>
            ) : (
              <Button
                component="label"
                sx={{ border: 'none', background: 'transparent' }}
                startIcon={<AddPhotoAlternateOutlined />}
              >
                <input accept="image/*" type="file" hidden onChange={onImageInputChange} />
                Add picture
              </Button>
            )}
          </Box>
        </Container>
        <Typography variant="h5" component={"div"} sx={{ textAlign: "center" }}>{user.name}</Typography>
        <Card sx={{ borderRadius: 2, py: 0, px: 1 }}>
          <CardActionArea>
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
        <Card sx={{ borderRadius: 2, py: 0, px: 1, mt: 1 }}>
          <CardActionArea>
            <ListItem
              onClick={async () => {
                await dialogs.open(GroupsDialog, { groups: user.groups })
              }}>
              <ListItemAvatar sx={{ flexDirection: 'row', display: 'flex', alignItems: 'center' }}>
                <Group />
              </ListItemAvatar>
              <ListItemText primary="Gruppen" />
            </ListItem>
          </CardActionArea>
        </Card>
        <Card sx={{ borderRadius: 2, py: 0, px: 1, mt: 1 }}>
          <CardActionArea>
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
        <Card sx={{ borderRadius: 2, py: 0, px: 1, mt: 1 }}>
          <CardActionArea>
            <ListItem
              onClick={async () => {
                const result = await dialogs.open(CalendarSettingsDialog, { provider_token: provider_token });
                if (result)
                  dispatch(updateCalenderSettingsAsync({ user, calenderSettings: result }))
              }}
              secondaryAction={isNotificationSupported() && Notification.permission === 'granted' ? <CheckCircle color='success' /> : <Cancel color="error" />}>
              <ListItemAvatar sx={{ flexDirection: 'row', display: 'flex', alignItems: 'center' }}>
                <CalendarMonth />
              </ListItemAvatar>
              <ListItemText primary="Kalender-Einstellungen" />
            </ListItem>
          </CardActionArea>
        </Card>
        <Card sx={{ borderRadius: 2, py: 0, px: 1, mt: 1 }}>
          <CardActionArea>
            <ListItem
              onClick={async () => {
                await dialogs.open(PlayerzoneProfileDialog, { player_data: user.player_data })
              }}
              secondaryAction={user.player_data?.rg_id && user.player_data?.rg_link ? <CheckCircle color='success' /> : <Cancel color="error" />}>
              <ListItemAvatar sx={{ flexDirection: 'row', display: 'flex', alignItems: 'center' }}>
                <img src={pzLogo} alt={'pz logo'} width="20" height="20" />
              </ListItemAvatar>
              <ListItemText primary="Playerzone Profil" />
            </ListItem>
          </CardActionArea>
        </Card>
        <Card sx={{ color: "red", borderRadius: 2, py: 0, px: 1, mt: 1 }}>
          <CardActionArea>
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
        {(croppedImage ||
          (user.avatarUrl !== null && currentUser.avatarUrl === null)) && (
            <Fab
              key={'saveButton'}
              variant="extended"
              sx={{
                background: '#66bb6a',
                color: '#fff',
                position: 'fixed',
                right: '16px',
                bottom: 'calc(16px + env(safe-area-inset-bottom))',
              }}
              onClick={handleSubmit}
            >
              {loadingSave ? (
                <CircularProgress size={'20px'} sx={{ color: 'white', mr: 1 }} />
              ) : (
                <Save sx={{ color: 'white', mr: 1 }} />
              )}
              Speichern
            </Fab>
          )}
      </List>

      {
        selectedImage && typeof selectedImage === 'string' && (
          <CropImageDialog
            open={cropImageDialogOpen}
            handleClose={() => setCropImageDialogOpen(false)}
            selectedImage={selectedImage}
            onImageCropFinished={(img) => {
              setCroppedImage(img);
              setCropImageDialogOpen(false);
            }}
          />
        )
      }
    </Layout >
  );
};
export default UserScreenProvider;
