import {
  useDirectUserGrants,
  useGrantUserPermissions,
  useRevokeUserPermissions,
  useUserFeatures,
  useUserPermissions,
} from '@/tanstack/grants';
import { AccountBox } from '@mui/icons-material';
import { Avatar, List, ListItem, ListItemAvatar, ListItemText } from '@mui/material';
import { useDialogs, useNotifications } from '@toolpad/core';
import { GrantsEditorDialog } from './GrantsEditorDialog';

const UserGrantsPanel = () => {
  const { data = [] } = useDirectUserGrants();
  const dialogs = useDialogs();
  const notifications = useNotifications();

  const grant = useGrantUserPermissions();
  const revoke = useRevokeUserPermissions();

  return (
    <List>
      {data.map((x) => (
        <ListItem
          divider
          onClick={async () => {
            const result = await dialogs.open(GrantsEditorDialog, {
              title: `Benutzer ${x.displayName} bearbeiten`,
              id: x.userId,
              currentPermissions: useUserPermissions,
              currentFeatures: useUserFeatures,
            });
            if (result) {
              grant.mutate(
                {
                  user: x.userId,
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
                  user: x.userId,
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
            <Avatar sx={{ borderRadius: 2 }}>
              {x.avatarUrl ? <img src={x.avatarUrl} alt="logo" width={'100%'} height={'100%'} /> : <AccountBox />}
            </Avatar>
          </ListItemAvatar>
          <ListItemText primary={x.name} secondary={x.email} />
        </ListItem>
      ))}
    </List>
  );
};

export default UserGrantsPanel;
