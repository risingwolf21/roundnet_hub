import {
  useGrantGroupPermissions,
  useGroupFeatures,
  useGroupPermissions,
  useRevokeGroupPermissions,
} from '@/tanstack/grants';
import { useGroups } from '@/tanstack/groups';
import { useDialogs, useNotifications } from '@toolpad/core';
import { GrantsEditorDialog } from './GrantsEditorDialog';

import { PullToRefresh } from '@/components/pull-to-refresh/PullToRefresh';
import GroupAdd from '@mui/icons-material/GroupAdd';
import Groups from '@mui/icons-material/Groups';
import Avatar from '@mui/material/Avatar';
import Fab from '@mui/material/Fab';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';

const GroupGrantsPanel = ({ searchValue }: { searchValue: string }) => {
  const { data = [], refetch } = useGroups();
  const dialogs = useDialogs();
  const notifications = useNotifications();

  const grant = useGrantGroupPermissions();
  const revoke = useRevokeGroupPermissions();

  return (
    <PullToRefresh onRefresh={refetch}>
      <List>
        {data
          .filter((x) => searchValue === '' || x.name.toLowerCase().includes(searchValue.toLowerCase()))
          .map((x) => (
            <ListItem
              key={x.id}
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
                      onSettled: () =>
                        notifications.show('Berechtigungen wurden aktualisiert', { severity: 'success' }),
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
                      onSettled: () =>
                        notifications.show('Berechtigungen wurden aktualisiert', { severity: 'success' }),
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
        <Fab
          sx={{ position: 'fixed', right: '16px', bottom: 'calc(env(safe-area-inset-top) + 16px)' }}
          onClick={() => { }}
        >
          <GroupAdd />
        </Fab>
      </List>
    </PullToRefresh>
  );
};

export default GroupGrantsPanel;
