import CloseIcon from '@mui/icons-material/Close';
import {
  Alert,
  AppBar,
  Avatar,
  Button,
  Checkbox,
  Dialog,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Snackbar,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import { Box } from '@mui/system';
import React, { useEffect, useRef, useState } from 'react';
import { SlideUpTransition } from '../../../utils';
import KeyIcon from '@mui/icons-material/Key';
import { GroupsRepository } from '../../../repository/GroupsRepository';
import { TablesUpdate } from '../../../types/supabase-generated.types';
import { useApplication } from '../../auth/AuthContext';
import { captureException } from '@sentry/react';
import { ColorLens } from '@mui/icons-material';
import { current } from '@reduxjs/toolkit';

type EditOrAddGroupDialogProps = {
  open: boolean;
  handleClose: () => void;
  groupToEdit: Group;
};

export const EditOrAddGroupDialog = ({ open, handleClose, groupToEdit }: EditOrAddGroupDialogProps) => {
  const { user } = useApplication();
  const inputRef = useRef<HTMLInputElement>(null);
  const [currentGroup, setCurrentGroup] = useState<TablesUpdate<'event_group'>>({
    id: groupToEdit.id,
    name: groupToEdit.name,
    color: groupToEdit.color,
    description: groupToEdit.description,
    public: groupToEdit.public
  });
  const [errorSnackbar, setErrorSnackbar] = useState<{
    open: boolean;
    message: string;
    severity?: 'error' | 'success';
  }>({ open: false, message: '', severity: 'error' });

  useEffect(() => {
    setCurrentGroup({
      id: groupToEdit.id,
      name: groupToEdit.name,
      color: groupToEdit.color,
      description: groupToEdit.description,
      public: groupToEdit.public
    });
  }, [groupToEdit]);

  const handleSubmit = async () => {
    if (!currentGroup.name || currentGroup.name.length < 6) {
      setErrorSnackbar({ message: 'Der Gruppenname ist zu kurz!', open: true });
      return;
    }
    if (!user) {
      setErrorSnackbar({ message: 'Something went wrong. Try again later!', open: true });
      return;
    }
    GroupsRepository.upsertGroup({
      id: currentGroup.id,
      name: currentGroup.name,
      color: currentGroup.color,
      description: currentGroup.description,
      public: currentGroup.public
    })
      .then((result) => {
        if (!result.data) {
          setErrorSnackbar({ message: 'Something went wrong creating the group.', open: false });
        } else
          GroupsRepository.addUserToGroup(result.data.id, user.userId)
            .then((result) => {
              setErrorSnackbar({ message: '', open: false });
              handleClose();
            })
            .catch((error) => {
              captureException(error);
              setErrorSnackbar({ message: error.message ?? '', open: true });
            });
      })
      .catch((error) => {
        captureException(error);
        setErrorSnackbar({ message: error.message ?? '', open: true });
      });
  };

  return (
    <Dialog fullScreen open={open} onClose={handleClose} TransitionComponent={SlideUpTransition}>
      <Box component="form" noValidate>
        <AppBar position="sticky" sx={{ pt: 'env(safe-area-inset-top)' }}>
          <Toolbar>
            <IconButton edge="start" color="inherit" onClick={handleClose} aria-label="close">
              <CloseIcon />
            </IconButton>
            <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
              {`Gruppe ${groupToEdit.id !== '' ? 'bearbeiten' : 'erstellen'}`}
            </Typography>
            <Button sx={{ color: 'white' }} onClick={handleSubmit}>
              Speichern
            </Button>
          </Toolbar>
        </AppBar>
        <Box>
          <List>
            <ListItem>
              <TextField
                fullWidth
                variant="outlined"
                value={currentGroup?.name ?? ''}
                onChange={(e) => setCurrentGroup({ ...currentGroup, name: e.target.value })}
                label="Gruppenname"
                margin="normal"
              />
            </ListItem>
            <ListItem>
              <TextField
                fullWidth
                variant="outlined"
                value={currentGroup?.description ?? ''}
                onChange={(e) => setCurrentGroup({ ...currentGroup, description: e.target.value })}
                label="Beschreibung"
                margin="normal"
              />
            </ListItem>
            <ListItem
              secondaryAction={
                <IconButton
                  LinkComponent={'span'}
                  onClick={(e) => {
                    if (inputRef.current) {
                      inputRef.current.click();
                    }
                  }}
                >
                  <input
                    ref={inputRef}
                    hidden
                    type="color"
                    value={currentGroup.color}
                    onChange={(e) => setCurrentGroup({ ...currentGroup, color: e.target.value })}
                  />
                  <ColorLens />
                </IconButton>
              }
            >
              <ListItemAvatar>
                <Avatar sx={{ background: currentGroup.color, width: 40, height: 40, borderRadius: 2 }}>
                  <KeyIcon />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                sx={{ mr: 2 }}
                slotProps={{
                  primary: {
                    whiteSpace: 'nowrap',
                    overflow: 'clip',
                    textOverflow: 'ellipsis',
                  },
                }}
                primary={
                  <TextField
                    fullWidth
                    variant="outlined"
                    value={currentGroup.color}
                    onChange={(e) => setCurrentGroup({ ...currentGroup, color: e.target.value })}
                    label="Farbe"
                    margin="normal"
                  />
                }
              />
            </ListItem>
            <ListItem sx={{ pt: 0, pb: 0, mb: 2 }} key={'public'}>
              <ListItemAvatar>
                <Checkbox
                  sx={{ pl: 0 }}
                  checked={currentGroup.public ?? false}
                  onChange={(e) =>
                    setCurrentGroup({
                      ...currentGroup,
                      public: e.target.checked,
                    })
                  }
                />
              </ListItemAvatar>
              <ListItemText primary={"Öffentlich?"} secondary={"Einer öffentlichen Gruppe kann jeder beitreten."} />
            </ListItem>
          </List>
        </Box>
      </Box>
      <Snackbar
        sx={{ position: 'fixed', right: '16px', bottom: 'calc(16px + env(safe-area-inset-bottom))' }}
        open={errorSnackbar.open}
        autoHideDuration={5000}
        onClose={() => setErrorSnackbar({ message: '', open: false })}
      >
        <Alert severity={errorSnackbar.severity ?? 'error'} sx={{ width: '100%' }}>
          {errorSnackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
};
