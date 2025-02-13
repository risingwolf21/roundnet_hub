import { AddPhotoAlternateOutlined, Close, DeleteOutline, EditOutlined, EmailOutlined, PersonOutlineOutlined } from "@mui/icons-material";
import { AppBar, Avatar, Box, Button, Container, Dialog, IconButton, List, ListItem, ListItemAvatar, ListItemText, TextField, Toolbar, Typography } from "@mui/material";
import { captureException } from "@sentry/react";
import { uuid } from "@supabase/supabase-js/dist/main/lib/helpers";
import { DialogProps } from '@toolpad/core/useDialogs';
import { useNotifications } from "@toolpad/core/useNotifications";
import React, { useState } from "react";
import CropImageDialog from "src/components/CropImageDialog";
import { supabase } from "src/components/services/supabase/supabaseClient";
import { UserWithRolesAndPermissions } from "src/types/supabaseTypes";
import { dataURLtoFile, readFile } from "src/utils";

type ContactInformationPayload = {
  user: UserWithRolesAndPermissions;

}

export const ContactInformation = ({ payload, open, onClose }: DialogProps<ContactInformationPayload, string | null>) => {

  const notifications = useNotifications();
  const [currentUser, setCurrentUser] = useState(payload.user);
  const [displayName, setDisplayName] = useState(payload.user.displayName);
  const [name, setName] = useState(payload.user.name);
  const [loadingSave, setLoadingSave] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | ArrayBuffer | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [cropImageDialogOpen, setCropImageDialogOpen] = useState(false);

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
            notifications.show('Something went wrong compressing your image. Please try again.', { severity: "error" });
          }
        },
      });
    } else {
      await updateDisplayName(currentUser.avatarUrl);
    }
    setLoadingSave(false);
  };

  const removeOldAvatarImages = async () => {
    const { data: list, error } = await supabase.storage.from('user').list(`${payload.user.userId}`);
    if (error || !list) {
      captureException(error);
      return;
    }
    const filesToRemove = list.map((x) => `${payload.user.userId}/${x.name}`);

    await supabase.storage.from('user').remove(filesToRemove);
  };

  const uploadAvatarImage = async (fileName: string, compressedImage: string) => {
    const { data: uploadData, error } = await supabase.storage
      .from('user')
      .upload(`${payload.user.userId}/${fileName}`, dataURLtoFile(compressedImage, fileName), {
        upsert: true,
      });

    if (!error && uploadData && uploadData.path) {
      const { data } = supabase.storage.from('user').getPublicUrl(uploadData.path);

      const { error } = await supabase.from('user').update({ avatarUrl: data.publicUrl }).eq('userId', payload.user.userId);
      if (error) {
        supabase.storage.from('user').remove([uploadData.path]);
      }
      setCurrentUser({ ...currentUser, avatarUrl: data.publicUrl });
      setCroppedImage(null);

      await updateDisplayName(data.publicUrl);
    } else {
      notifications.show('Something went wrong uploading your image. Please try it again.', { severity: "error" })
      return;
    }
  };

  const updateDisplayName = async (avatarUrl: string | null) => {
    if (name.length < 6 || displayName.length < 4) {
      notifications.show('Name oder Anzeigename müssen 6 bzw. 4 Zeichen lang sein', { severity: "warning" })
      return;
    }
    if (name.split(' ').length < 2) {
      notifications.show('Du musst dein vollen Name, mit Vor und Nachname angeben', { severity: "warning" })
      return;
    }

    const { error } = await supabase.from('user').update({ name, displayName, avatarUrl }).eq('userId', payload.user.userId);
    if (error) {
      notifications.show(error.message, { severity: "error" })
      captureException(error);
      return;
    }
    const { error: authError } = await supabase.auth.updateUser({
      data: { displayName, name },
    });
    if (authError) {
      notifications.show(authError.message, { severity: "error" })
      captureException(authError);
      return;
    }
    notifications.show('Successfully updated your profile!', { severity: "success" })
  };

  const onImageInputChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    if (!event.target.files || event.target.files.length === 0) return;

    let imageDataUrl = await readFile(event.target.files[0]);
    setSelectedImage(imageDataUrl);
    setCropImageDialogOpen(true);
    event.target.files = null;
    event.target.value = '';
  };

  return <Dialog fullScreen open={open} onClose={() => onClose(null)}>
    <AppBar sx={{ position: 'static', pt: "env(safe-area-inset-top)" }}>
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          onClick={() => onClose(null)}>
          <Close />
        </IconButton>
        <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
          Profil und Account
        </Typography>
        <Button autoFocus color="inherit" onClick={handleSubmit}>
          {
            loadingSave ? "Laden..." : "Speichern"
          }
        </Button>
      </Toolbar>
    </AppBar>
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
      <ListItem key={'fullName'} sx={{ '&.MuiListItem-root': { p: 0 } }}>
        <ListItemAvatar />
        <TextField
          fullWidth
          size="small"
          variant="outlined"
          value={name}
          onChange={(e) => setName(e.target.value)}
          label="Voller Name"
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
  </Dialog>
}