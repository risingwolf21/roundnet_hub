import { AccountBox, AdminPanelSettings, Check } from '@mui/icons-material';
import { Avatar, Chip, IconButton, ListItem, ListItemAvatar, ListItemText, Stack, Typography } from '@mui/material';
import { DialogHook } from '@toolpad/core';
import React from 'react';
import { ProfileDialog } from '@/components/Profile';

type Props = {
  user: User;
  groupUser: User;
  onAvatarClick?: (event: React.MouseEvent) => void;
  makeAdmin?: (event: React.MouseEvent) => void;
  selected: boolean;
  isAdmin: boolean;
  dialogs: DialogHook;
};

export const GroupUserItem = ({ user, groupUser, onAvatarClick, selected, makeAdmin, isAdmin, dialogs }: Props) => {
  return (
    <ListItem
      key={groupUser.userId}
      divider
      onClick={() => dialogs.open(ProfileDialog, { user, userId: groupUser.userId })}
      sx={{
        ...(selected && { background: 'rgba(2, 136, 209, 0.4)' }),
      }}
      secondaryAction={
        makeAdmin && (
          <IconButton onClick={makeAdmin}>
            <AdminPanelSettings />
          </IconButton>
        )
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
