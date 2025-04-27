import { Avatar, Button, IconButton, ListItem, ListItemAvatar, ListItemText } from '@mui/material';
import KeyIcon from '@mui/icons-material/Key';
import EditIcon from '@mui/icons-material/Edit';
import React from 'react';
import { TFunction } from 'i18next';

type ItemHolderItemProsp = {
  x: FullItemHolder;
  t: TFunction;
  user: User;
  isEditingMode: boolean;
  setItemToEdit: (value: FullItemHolder) => void;
  setAddOrUpdateKeysOpen: (value: boolean) => void;
  setItemHistoryDialogOpen: (value: boolean) => void;
  selectKeyToHandOver: (value: FullItemHolder) => void;
  selectKeyToReceive: (value: FullItemHolder) => void;
};

export const ItemHolderItem = ({
  x,
  t,
  user,
  isEditingMode,
  setItemToEdit,
  setAddOrUpdateKeysOpen,
  setItemHistoryDialogOpen,
  selectKeyToHandOver,
  selectKeyToReceive,
}: ItemHolderItemProsp) => {
  return (
    <ListItem
      key={x.id}
      divider
      onClick={() => {
        setItemToEdit(x);
        setItemHistoryDialogOpen(true);
      }}
      secondaryAction={
        isEditingMode ? (
          <IconButton
            onClick={(event) => {
              event.stopPropagation();
              setItemToEdit(x);
              setAddOrUpdateKeysOpen(true);
            }}
          >
            <EditIcon />
          </IconButton>
        ) : x.full_current_holder?.userId === user.userId ? (
          <Button
            color="primary"
            onClick={(event) => {
              selectKeyToHandOver(x);
              event.stopPropagation();
            }}
          >
            {t('handover_key')}
          </Button>
        ) : (
          <Button
            color="primary"
            onClick={(event) => {
              selectKeyToReceive(x);
              event.stopPropagation();
            }}
          >
            {t('take_key')}
          </Button>
        )
      }
    >
      <ListItemAvatar>
        <Avatar sx={{ background: x.color, width: 40, height: 40, borderRadius: 2 }}>
          <KeyIcon />
        </Avatar>
      </ListItemAvatar>
      <ListItemText primary={x.full_current_holder?.displayName ?? 'Nicht zugewiesen'} secondary={x.name} />
    </ListItem>
  );
};
