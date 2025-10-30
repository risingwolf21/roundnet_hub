import { useInsertItemMutation, useUpdateItemMutation } from '@/tanstack/items';
import CloseIcon from '@mui/icons-material/Close';
import KeyIcon from '@mui/icons-material/Key';
import { Box } from '@mui/system';
import { useNotifications } from '@toolpad/core';
import { useEffect, useState } from 'react';

import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';

type EditOrAddItemDialogProps = {
  open: boolean;
  handleClose: () => void;
  itemToEdit: ItemUpdate | null;
};

export const EditOrAddItemDialog = ({ open, handleClose, itemToEdit }: EditOrAddItemDialogProps) => {
  const [currentItem, setCurrentItem] = useState<ItemUpdate>({
    id: itemToEdit?.id,
    name: itemToEdit?.name,
    color: itemToEdit?.color,
    current_holder: itemToEdit?.current_holder,
    type: itemToEdit?.type,
  });
  const notifications = useNotifications();

  const updateItemMutation = useUpdateItemMutation();
  const insertItemMutation = useInsertItemMutation();

  useEffect(() => {
    setCurrentItem({
      id: itemToEdit?.id,
      name: itemToEdit?.name,
      color: itemToEdit?.color,
      current_holder: itemToEdit?.current_holder,
      type: itemToEdit?.type,
    });
  }, [itemToEdit]);

  const handleSubmit = async () => {
    if (!currentItem.name || currentItem.name.length < 6) {
      notifications.show('Der Schlüsselname ist zu kurz!', { severity: 'warning' });
      return;
    }
    if (!currentItem.type) {
      notifications.show('Der Schlüssel braucht einen Typ', { severity: 'warning' });
      return;
    }
    if (currentItem.id) {
      updateItemMutation.mutate(
        {
          item: {
            ...currentItem,
            id: currentItem.id,
          },
        },
        {
          onError: (e) => notifications.show(e.message, { severity: 'error' }),
          onSuccess: () => handleClose(),
        }
      );
    } else {
      insertItemMutation.mutate(
        {
          item: {
            name: currentItem.name,
            color: currentItem.color,
            type: currentItem.type,
            current_holder: currentItem.current_holder,
          },
        },
        {
          onError: (e) => notifications.show(e.message, { severity: 'error' }),
          onSuccess: () => handleClose(),
        }
      );
    }
  };

  return (
    <Dialog fullScreen open={open} onClose={handleClose}>
      <Box component="form" noValidate>
        <AppBar position="sticky" sx={{ top: 0, pt: 'env(safe-area-inset-top)' }}>
          <Toolbar>
            <IconButton edge="start" color="inherit" onClick={handleClose} aria-label="close">
              <CloseIcon />
            </IconButton>
            <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
              {`Schlüssel ${(currentItem.id ?? 0) > 0 ? 'bearbeiten' : 'erstellen'}`}
            </Typography>
            <Button sx={{ color: 'white' }} onClick={handleSubmit}>
              Speichern
            </Button>
          </Toolbar>
        </AppBar>
        <Box sx={{ pt: 'env(safe-area-inset-top)' }}>
          <List>
            <ListItem>
              <TextField
                fullWidth
                variant="outlined"
                value={currentItem?.name ?? ''}
                onChange={(e) => setCurrentItem({ ...currentItem, name: e.target.value })}
                label="Schlüsselname"
                margin="normal"
              />
            </ListItem>
            <ListItem>
              <ListItemAvatar>
                <Avatar sx={{ background: currentItem?.color ?? '#000', width: 40, height: 40, borderRadius: 2 }}>
                  <KeyIcon />
                </Avatar>
              </ListItemAvatar>
              <TextField
                fullWidth
                variant="outlined"
                value={currentItem?.color ?? '#000'}
                onChange={(e) => setCurrentItem({ ...currentItem, color: e.target.value })}
                label="Farbe"
                margin="normal"
              />
            </ListItem>
            <ListItem>
              <ListItemAvatar></ListItemAvatar>
              <Select
                fullWidth
                value={currentItem?.type ?? 'nothing'}
                onChange={(e) =>
                  setCurrentItem({
                    ...currentItem,
                    type: e.target.value === 'nothing' ? undefined : (e.target.value as ItemType),
                  })
                }
              >
                <MenuItem value={'mtvStorage'}>MTV Kellerschlüssel</MenuItem>
                <MenuItem value={'mtvGym'}>MTV Gymschlüssel</MenuItem>
                <MenuItem value={'mtvGymPalazzo'}>MTV Gym/Palazzoschlüssel</MenuItem>
                <MenuItem value={'nothing'}>Nichts</MenuItem>
              </Select>
            </ListItem>
          </List>
        </Box>
      </Box>
    </Dialog>
  );
};
