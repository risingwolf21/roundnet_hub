import {
  useGrantGroupPermissions,
  useGroupFeatures,
  useGroupPermissions,
  useRevokeGroupPermissions,
} from '@/tanstack/grants';
import { useGroups } from '@/tanstack/groups';
import { Groups } from '@mui/icons-material';
import { Avatar, List, ListItem, ListItemAvatar, ListItemText } from '@mui/material';
import { useDialogs, useNotifications } from '@toolpad/core';
import { GrantsEditorDialog } from './GrantsEditorDialog';

const GroupGrantsPanel = ({ searchValue }: { searchValue: string }) => {
  const { data = [] } = useGroups();
  const dialogs = useDialogs();
  const notifications = useNotifications();

  const grant = useGrantGroupPermissions();
  const revoke = useRevokeGroupPermissions();

  return (
    <List>
      {data
        .filter(x => searchValue === '' || x.name.includes(searchValue))
        .map((x) => (
          <ListItem
            divider
            onClick={async () => {
              const result = await dialogs.open(GrantsEditorDialog, {
                title: 'Gruppe bearbeiten',
                id: x.id,
                currentPermissions: useGroupPermissions,
                currentFeatures: useGroupFeatures,
              });
              if (result) {
                grant.mutate(
                  {
                    group: x.id,
                    perms: result.grantPerm,
                    feats: result.grantFeat,
                  },
                  {
                    onError: () =>
                      notifications.show('Berechtigungen konnten nicht aktualisiert werden', { severity: 'error' }),
                    onSettled: () => notifications.show('Berechtigungen wurden aktualisiert', { severity: 'success' }),
                  }
                );
                revoke.mutate(
                  {
                    group: x.id,
                    perms: result.revokePerm,
                    feats: result.revokeFeat,
                  },
                  {
                    onError: () =>
                      notifications.show('Berechtigungen konnten nicht aktualisiert werden', { severity: 'error' }),
                    onSettled: () => notifications.show('Berechtigungen wurden aktualisiert', { severity: 'success' }),
                  }
                );
              }
            }}
          >
            <ListItemAvatar>
              <Avatar sx={{ backgroundColor: x.color, borderRadius: 2 }}>
                <Groups />
              </Avatar>
            </ListItemAvatar>
            <ListItemText primary={x.name} />
          </ListItem>
        ))}
    </List>
  );
};

export default GroupGrantsPanel;
