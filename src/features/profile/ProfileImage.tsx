import CropImageDialog from '@/components/CropImageDialog';
import { supabase } from '@/lib/supabase';
import { dataURLtoFile, readFile } from '@/utils';
import { captureException } from '@sentry/react';
import { useNotifications } from '@toolpad/core/useNotifications';
import Compressor from 'compressorjs';
import React, { useState } from 'react';
import { v4 as uuid } from 'uuid';

import AddPhotoAlternateOutlined from '@mui/icons-material/AddPhotoAlternateOutlined';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import EditOutlined from '@mui/icons-material/EditOutlined';
import Restore from '@mui/icons-material/Restore';
import Save from '@mui/icons-material/Save';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import { useDialogs } from '@toolpad/core';

type Props = {
  user: User;
};

export const ProfileImage = ({ user }: Props) => {
  const notifications = useNotifications();
  const dialogs = useDialogs();

  const [loadingSave, setLoadingSave] = useState(false);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState(user);

  const handleSubmit = async () => {
    setLoadingSave(true);
    if (croppedImage) {
      const fileName = uuid() + '.jpg';
      new Compressor(dataURLtoFile(croppedImage, fileName), {
        convertSize: 1000000, // 1 MB
        success: async (file) => {
          const compressedFile = await readFile(file);
          if (compressedFile && typeof compressedFile === 'string') {
            await removeOldAvatarImages();
            await uploadAvatarImage(fileName, compressedFile);
            setCroppedImage(null);
          } else {
            notifications.show('Something went wrong compressing your image. Please try again.', { severity: 'error' });
          }
        },
      });
    }
    setLoadingSave(false);
  };

  const removeOldAvatarImages = async () => {
    const { data: list, error } = await supabase.storage.from('user').list(`${user.id}`);
    if (error || !list) {
      captureException(error);
      return;
    }
    const filesToRemove = list.map((x) => `${user.id}/${x.name}`);

    await supabase.storage.from('user').remove(filesToRemove);
  };

  const uploadAvatarImage = async (fileName: string, compressedImage: string) => {
    const { data: uploadData, error } = await supabase.storage
      .from('user')
      .upload(`${user.id}/${fileName}`, dataURLtoFile(compressedImage, fileName), {
        upsert: true,
      });

    if (!error && uploadData && uploadData.path) {
      const { data } = supabase.storage.from('user').getPublicUrl(uploadData.path);

      const { error } = await supabase.from('user').update({ avatarUrl: data.publicUrl }).eq('id', user.id);
      if (error) {
        supabase.storage.from('user').remove([uploadData.path]);
      }
      setCurrentUser({ ...currentUser, avatarUrl: data.publicUrl });
      setCroppedImage(null);
    } else {
      notifications.show('Something went wrong uploading your image. Please try it again.', { severity: 'error' });
    }
  };

  const onImageInputChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    if (!event.target.files || event.target.files.length === 0) return;

    const imageDataUrl = await readFile(event.target.files[0]);
    event.target.files = null;
    event.target.value = '';

    const result = await dialogs.open(CropImageDialog, { selectedImage: imageDataUrl as string });
    setCroppedImage(result);
  };

  return (
    <Container
      key={'avatar'}
      sx={{
        display: 'flex',
        justifyContent: 'center',
        flexDirection: 'column',
        m: 2,
        p: 0,
        width: 'auto',
        maxWidth: 'unset!important',
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
              disabled={loadingSave}
              startIcon={loadingSave ? <CircularProgress size={'20px'} /> : <EditOutlined />}
            >
              <input accept="image/*" type="file" hidden onChange={onImageInputChange} />
              Change
            </Button>
            <Button
              disabled={loadingSave}
              startIcon={loadingSave ? <CircularProgress size={'20px'} /> : <DeleteOutline />}
              onClick={() => setCurrentUser({ ...currentUser, avatarUrl: null })}
            >
              Remove
            </Button>
          </>
        ) : (
          <Button
            component="label"
            sx={{ border: 'none', background: 'transparent' }}
            disabled={loadingSave}
            startIcon={loadingSave ? <CircularProgress size={'20px'} /> : <AddPhotoAlternateOutlined />}
          >
            <input accept="image/*" type="file" hidden onChange={onImageInputChange} />
            Add picture
          </Button>
        )}
      </Box>
      {(croppedImage || (user.avatarUrl !== null && currentUser.avatarUrl === null)) && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
          <Button
            key={'saveButton'}
            onClick={handleSubmit}
            disabled={loadingSave}
            startIcon={loadingSave ? <CircularProgress size={'20px'} /> : <Save />}
          >
            Speichern
          </Button>
          <Button
            key={'resetButton'}
            onClick={() => {
              setCroppedImage(null);
              setCurrentUser(user);
            }}
            disabled={loadingSave}
            startIcon={loadingSave ? <CircularProgress size={'20px'} /> : <Restore />}
          >
            Rückgängig
          </Button>
        </Box>
      )}
    </Container>
  );
};
