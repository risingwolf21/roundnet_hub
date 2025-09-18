import { AddPhotoAlternateOutlined, DeleteOutline, EditOutlined, Restore, Save } from '@mui/icons-material';
import { Avatar, Box, Button, CircularProgress, Container } from '@mui/material';
import { captureException } from '@sentry/react';
import { uuid } from '@supabase/supabase-js/dist/main/lib/helpers';
import { useNotifications } from '@toolpad/core/useNotifications';
import Compressor from 'compressorjs';
import React, { useState } from 'react';
import CropImageDialog from '@/components/CropImageDialog';
import { supabase } from '@/lib/supabase';
import { dataURLtoFile, readFile } from '@/utils';

type Props = {
  user: User;
};

export const ProfileImage = ({ user }: Props) => {
  const notifications = useNotifications();

  const [loadingSave, setLoadingSave] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | ArrayBuffer | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [cropImageDialogOpen, setCropImageDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(user);

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
            notifications.show('Something went wrong compressing your image. Please try again.', { severity: 'error' });
          }
        },
      });
    }
    setLoadingSave(false);
  };

  const removeOldAvatarImages = async () => {
    const { data: list, error } = await supabase.storage.from('user').list(`${user.userId}`);
    if (error || !list) {
      captureException(error);
      return;
    }
    const filesToRemove = list.map((x) => `${user.userId}/${x.name}`);

    await supabase.storage.from('user').remove(filesToRemove);
  };

  const uploadAvatarImage = async (fileName: string, compressedImage: string) => {
    const { data: uploadData, error } = await supabase.storage
      .from('user')
      .upload(`${user.userId}/${fileName}`, dataURLtoFile(compressedImage, fileName), {
        upsert: true,
      });

    if (!error && uploadData && uploadData.path) {
      const { data } = supabase.storage.from('user').getPublicUrl(uploadData.path);

      const { error } = await supabase.from('user').update({ avatarUrl: data.publicUrl }).eq('userId', user.userId);
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

    let imageDataUrl = await readFile(event.target.files[0]);
    setSelectedImage(imageDataUrl);
    setCropImageDialogOpen(true);
    event.target.files = null;
    event.target.value = '';
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
              startIcon={<EditOutlined />}
            >
              <input accept="image/*" type="file" hidden onChange={onImageInputChange} />
              Change
            </Button>
            <Button startIcon={<DeleteOutline />} onClick={() => setCurrentUser({ ...currentUser, avatarUrl: null })}>
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
      {(croppedImage || (user.avatarUrl !== null && currentUser.avatarUrl === null)) && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
          <Button
            key={'saveButton'}
            onClick={handleSubmit}
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
            startIcon={<Restore />}
          >
            Rückgängig
          </Button>
        </Box>
      )}
      {selectedImage && typeof selectedImage === 'string' && (
        <CropImageDialog
          open={cropImageDialogOpen}
          handleClose={() => setCropImageDialogOpen(false)}
          selectedImage={selectedImage}
          onImageCropFinished={(img) => {
            setCroppedImage(img);
            setCropImageDialogOpen(false);
          }}
        />
      )}
    </Container>
  );
};
