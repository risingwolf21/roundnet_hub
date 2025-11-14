import { useFeatures, usePermissions } from '@/tanstack/grants';
import { UseQueryResult } from '@tanstack/react-query';
import { DialogProps } from '@toolpad/core';
import React from 'react';

import Close from '@mui/icons-material/Close';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Switch from '@mui/material/Switch';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';

export type GroupResult = {
  grantPerm: string[];
  revokePerm: string[];
  grantFeat: string[];
  revokeFeat: string[];
};

type GrantsEditorProps = {
  title: string;
  id: string;
  currentPermissions: (id: string) => UseQueryResult<string[], Error>;
  currentFeatures: (id: string) => UseQueryResult<string[], Error>;
};

export const GrantsEditorDialog = ({ payload, open, onClose }: DialogProps<GrantsEditorProps, GroupResult | null>) => {
  const { data: perms } = usePermissions();
  const { data: feats } = useFeatures();
  const { data: currentPerms = [] } = payload.currentPermissions(payload.id);
  const { data: currentFeats = [] } = payload.currentFeatures(payload.id);

  const currentPermsSet = React.useMemo(() => new Set(currentPerms), [currentPerms]);
  const [selectedPerms, setSelectedPerms] = React.useState<Set<string>>(new Set(currentPerms));

  const currentFeatSet = React.useMemo(() => new Set(currentFeats), [currentFeats]);
  const [selectedFeats, setSelectedFeats] = React.useState<Set<string>>(new Set(currentFeats));

  React.useEffect(() => {
    setSelectedPerms(new Set(currentPerms));
  }, [currentPerms]);
  React.useEffect(() => {
    setSelectedFeats(new Set(currentFeats));
  }, [currentFeats]);

  const onTogglePerm = (key: string, checked: boolean) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  const onToggleFeat = (key: string, checked: boolean) => {
    setSelectedFeats((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  };

  return (
    <Dialog fullScreen open={open} onClose={() => onClose(null)}>
      <AppBar position="sticky" sx={{ pt: 'env(safe-area-inset-top)' }}>
        <Toolbar>
          <IconButton size="large" edge="start" color="inherit" onPointerDown={() => onClose(null)}>
            <Close />
          </IconButton>
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            {payload.title}
          </Typography>
        </Toolbar>
      </AppBar>
      <DialogContent>
        <Box>
          <Typography variant="overline" color="text.secondary">
            Permissions
          </Typography>
          <List dense>
            {(perms || []).map((p) => (
              <ListItem
                key={p}
                secondaryAction={
                  <Switch edge="end" checked={selectedPerms.has(p)} onChange={(_, on) => onTogglePerm(p, on)} />
                }
              >
                <ListItemText primaryTypographyProps={{ variant: 'body2' }} primary={p} />
              </ListItem>
            ))}
          </List>
        </Box>
        <Divider sx={{ my: 1 }} />
        <Box>
          <Typography variant="overline" color="text.secondary">
            Features
          </Typography>
          <List dense>
            {(feats || []).map((f) => (
              <ListItem
                key={f}
                secondaryAction={
                  <Switch edge="end" checked={selectedFeats.has(f)} onChange={(_, on) => onToggleFeat(f, on)} />
                }
              >
                <ListItemText primaryTypographyProps={{ variant: 'body2' }} primary={f} />
              </ListItem>
            ))}
          </List>
        </Box>
      </DialogContent>
      <DialogActions>
        <Box sx={{ display: 'flex', flexDirection: 'row', flexGrow: 1 }}>
          <Button variant="outlined" fullWidth sx={{ ml: 2, mr: 1, mb: 2 }} onClick={() => onClose(null)}>
            Abbrechen
          </Button>
          <Button
            variant="contained"
            fullWidth
            sx={{ ml: 1, mr: 2, mb: 2 }}
            onClick={() =>
              onClose({
                grantPerm: [...selectedPerms].filter((k) => !currentPermsSet.has(k)),
                revokePerm: [...currentPermsSet].filter((k) => !selectedPerms.has(k)),
                grantFeat: [...selectedFeats].filter((k) => !currentFeatSet.has(k)),
                revokeFeat: [...currentFeatSet].filter((k) => !selectedFeats.has(k)),
              })
            }
          >
            Bestätigen
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
