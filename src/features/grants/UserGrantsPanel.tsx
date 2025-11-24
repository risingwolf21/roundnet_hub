import {
  useDirectUserGrants,
  useGrantUserPermissions,
  useRevokeUserPermissions,
  useUserFeatures,
  useUserPermissions,
} from '@/tanstack/grants';
import { useDialogs, useNotifications } from '@toolpad/core';
import SearchAndSelectSingleUserDialog from '../groups/dialogs/SearchAndSelectSingleUserDialog';
import { GrantsEditorDialog, GroupResult } from './GrantsEditorDialog';

import { PullToRefresh } from '@/components/pull-to-refresh/PullToRefresh';
import AccountBox from '@mui/icons-material/AccountBox';
import PersonAdd from '@mui/icons-material/PersonAdd';
import Avatar from '@mui/material/Avatar';
import Fab from '@mui/material/Fab';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';

const UserGrantsPanel = ({ searchValue }: { searchValue: string }) => {
  const { data = [], refetch } = useDirectUserGrants();
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
        user: user.id,
        perms: result.grantPerm,
        feats: result.grantFeat,
      },
      mutationDialogs
    );
    revoke.mutate(
      {
        user: user.id,
        perms: result.revokePerm,
        feats: result.revokeFeat,
      },
      mutationDialogs
    );
  }

  return (
    <PullToRefresh onRefresh={refetch}>
      <List>
        {data
          .filter(x => searchValue === '' || x.name.toLowerCase().includes(searchValue.toLowerCase())
            || x.displayName.toLowerCase().includes(searchValue.toLowerCase())
            || x.email.toLowerCase().includes(searchValue.toLowerCase()))
          .map((x) => (
            <ListItem
              key={x.id}
              divider
              onClick={async () => {
                const result = await dialogs.open(GrantsEditorDialog, {
                  title: `Benutzer ${x.displayName} bearbeiten`,
                  id: x.id,
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
        <Fab sx={{ position: "fixed", right: "16px", bottom: "calc(env(safe-area-inset-top) + 16px)" }} onClick={async () => {
          const result = await dialogs.open(SearchAndSelectSingleUserDialog, { usersToFilter: [] });
          if (result) {
            const grantsResult = await dialogs.open(GrantsEditorDialog, {
              title: `Benutzer ${result.displayName} hinzufügen`,
              id: result.id,
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
    </PullToRefresh>
  );
};

export default UserGrantsPanel;
