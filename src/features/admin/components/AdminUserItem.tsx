import { Fragment } from 'react';

import AccountBox from '@mui/icons-material/AccountBox';
import Edit from '@mui/icons-material/Edit';
import Verified from '@mui/icons-material/Verified';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';

export const AdminUserItem = ({ user, onEditClick }: { user: User; onEditClick: () => void }) => {
  return (
    <ListItem
      divider
      secondaryAction={
        <IconButton onClick={onEditClick}>
          <Edit />
        </IconButton>
      }
    >
      <ListItemAvatar>
        <Avatar sx={{ borderRadius: 2 }}>
          {user.avatarUrl ? <img src={user.avatarUrl} alt="logo" width={'100%'} height={'100%'} /> : <AccountBox />}
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={
          <Fragment>
            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
              <Typography>{user.displayName}</Typography>
              {user.verified && <Verified sx={{ ml: 1, color: 'rgba(0, 0, 0, 0.54)', fontSize: '12px' }} />}
            </Box>
          </Fragment>
        }
        secondary={user.email}
      />
    </ListItem>
  );
};
