import { ProfileDialog } from '@/components/Profile';
import { DialogHook } from '@toolpad/core';
import React from 'react';

import AccountBox from '@mui/icons-material/AccountBox';
import Check from '@mui/icons-material/Check';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

type Props = {
  user: User;
  groupUser: User;
  onAvatarClick?: (event: React.MouseEvent) => void;
  secondaryAction?: React.ReactNode;
  selected: boolean;
  isAdmin: boolean;
  dialogs: DialogHook;
};

export const GroupUserItem = ({ user, groupUser, onAvatarClick, selected, secondaryAction, isAdmin, dialogs }: Props) => {
  return (
    <ListItem
      key={groupUser.userId}
      divider
      onClick={() => dialogs.open(ProfileDialog, { user, userId: groupUser.userId })}
      sx={{
        ...(selected && { background: 'rgba(2, 136, 209, 0.4)' }),
      }}
      secondaryAction={
        secondaryAction && secondaryAction
      }
    >
      <ListItemAvatar onClick={onAvatarClick}>
        {selected ? (
          <Avatar sx={{ borderRadius: 2, background: '#0288d1' }}>
            <Check />
          </Avatar>
        ) : (
          <Avatar sx={{ borderRadius: 2 }}>
            {groupUser.avatarUrl ? (
              <img src={groupUser.avatarUrl} alt="logo" width={'100%'} height={'100%'} />
            ) : (
              <AccountBox />
            )}
          </Avatar>
        )}
      </ListItemAvatar>
      <ListItemText
        primary={
          <Stack direction={'row'} spacing={2}>
            <Typography>{groupUser.name}</Typography>
            {isAdmin && <Chip variant="outlined" size="small" label="Admin" color="info" />}
          </Stack>
        }
        secondary={groupUser.email}
      />
    </ListItem>
  );
};
