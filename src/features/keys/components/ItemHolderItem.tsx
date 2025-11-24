import EditIcon from '@mui/icons-material/Edit';
import KeyIcon from '@mui/icons-material/Key';
import { TFunction } from 'i18next';

import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';

type ItemHolderItemProsp = {
  x: FullItemHolder;
  t: TFunction;
  user: User;
  isEditingMode: boolean;
  setItemToEdit: (value: FullItemHolder) => void;
  setAddOrUpdateKeysOpen: (value: boolean) => void;
  openHistoryDialog: () => void;
  selectKeyToHandOver?: (value: FullItemHolder) => void;
  selectKeyToReceive?: (value: FullItemHolder) => void;
};

export const ItemHolderItem = ({
  x,
  t,
  user,
  isEditingMode,
  setItemToEdit,
  setAddOrUpdateKeysOpen,
  openHistoryDialog,
  selectKeyToHandOver,
  selectKeyToReceive,
}: ItemHolderItemProsp) => {
  return (
    <ListItem
      key={x.id}
      divider
      onClick={() => {
        setItemToEdit(x);
        openHistoryDialog();
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
        ) : x.full_current_holder?.id === user.id ? (
          selectKeyToHandOver && (
            <Button
              color="primary"
              onClick={(event) => {
                selectKeyToHandOver(x);
                event.stopPropagation();
              }}
            >
              {t('handover_key')}
            </Button>
          )
        ) : (
          selectKeyToReceive && (
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
