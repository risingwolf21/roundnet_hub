import { useGroups } from '@/tanstack/groups';
import { FiberManualRecord } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close';
import {
  AppBar,
  Dialog,
  IconButton,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material';
import { Box } from '@mui/system';
import { DialogProps } from '@toolpad/core';
import { SlideUpTransition } from '../../../utils';

export const SelectGroupDialog = ({ payload, open, onClose }: DialogProps<undefined, Group | null>) => {
  const { data: groups = [] } = useGroups();

  return (
    <Dialog fullScreen open={open} onClose={() => onClose(null)} TransitionComponent={SlideUpTransition}>
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
            {groups.map((x) => (
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
