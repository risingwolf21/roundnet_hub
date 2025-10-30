import { useGroups } from '@/tanstack/groups';
import CloseIcon from '@mui/icons-material/Close';
import { Box } from '@mui/system';
import { DialogProps } from '@toolpad/core';

import FiberManualRecord from '@mui/icons-material/FiberManualRecord';
import AppBar from '@mui/material/AppBar';
import Dialog from '@mui/material/Dialog';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';

export const SelectGroupDialog = ({ open, onClose }: DialogProps<undefined, Group | null>) => {
  const { data: groups = [] } = useGroups();

  return (
    <Dialog fullScreen open={open} onClose={() => onClose(null)}>
      <Box component="form" noValidate>
        <AppBar position="sticky" sx={{ pt: 'env(safe-area-inset-top)' }}>
          <Toolbar>
            <IconButton edge="start" color="inherit" onClick={() => onClose(null)} aria-label="close">
              <CloseIcon />
            </IconButton>
            <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
              Gruppe wählen
            </Typography>
          </Toolbar>
        </AppBar>
        <Box>
          <List>
            {groups.filter(x => x.user_group_role !== "joinRequested").map((x) => (
              <ListItemButton key={x.id} divider onClick={() => onClose(x)}>
                <ListItemAvatar>
                  <FiberManualRecord sx={{ color: x.color }} />
                </ListItemAvatar>
                <ListItemText primary={x.name} secondary={x.description} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Box>
    </Dialog>
  );
};
