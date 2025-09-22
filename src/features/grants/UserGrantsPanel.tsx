import {
  useDirectUserGrants,
  useGrantUserPermissions,
  useRevokeUserPermissions,
  useUserFeatures,
  useUserPermissions,
} from '@/tanstack/grants';
import { AccountBox, PersonAdd } from '@mui/icons-material';
import { Avatar, Fab, List, ListItem, ListItemAvatar, ListItemText } from '@mui/material';
import { useDialogs, useNotifications } from '@toolpad/core';
import SearchAndSelectSingleUserDialog from '../groups/dialogs/SearchAndSelectSingleUserDialog';
import { GrantsEditorDialog, GroupResult } from './GrantsEditorDialog';

const UserGrantsPanel = ({ searchValue }: { searchValue: string }) => {
  const { data = [] } = useDirectUserGrants();
  const dialogs = useDialogs();
  const notifications = useNotifications();

  const grant = useGrantUserPermissions();
  const revoke = useRevokeUserPermissions();

  const mutationDialogs = {
    onError: () =>
      notifications.show('Berechtigungen konnten nicht aktualisiert werden', { severity: 'error' }),
    onSettled: () => notifications.show('Berechtigungen wurden aktualisiert', { severity: 'success' }),
  }

  const updateGrantsWith = (result: GroupResult, user: User) => {
    grant.mutate(
      {
        user: user.userId,
        perms: result.grantPerm,
        feats: result.grantFeat,
      },
      mutationDialogs
    );
    revoke.mutate(
      {
        user: user.userId,
        perms: result.revokePerm,
        feats: result.revokeFeat,
      },
      mutationDialogs
    );
  }

  return (
    <List>
      {data
        .filter(x => searchValue === '' || x.name.toLowerCase().includes(searchValue.toLowerCase())
          || x.displayName.toLowerCase().includes(searchValue.toLowerCase())
          || x.email.toLowerCase().includes(searchValue.toLowerCase()))
        .map((x) => (
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
                updateGrantsWith(result, x);
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
      <Fab sx={{ position: "fixed", right: "16px", bottom: "16px" }} onClick={async () => {
        const result = await dialogs.open(SearchAndSelectSingleUserDialog, { usersToFilter: [] });
        if (result) {
          const grantsResult = await dialogs.open(GrantsEditorDialog, {
            title: `Benutzer ${result.displayName} hinzufügen`,
            id: result.userId,
            currentPermissions: useUserPermissions,
            currentFeatures: useUserFeatures,
          });
          if (grantsResult) {
            updateGrantsWith(grantsResult, result);
          }
        }
      }}>
        <PersonAdd />
      </Fab>
    </List>
  );
};

export default UserGrantsPanel;
