import { PullToRefresh } from '@/components/pull-to-refresh/PullToRefresh';
import { useGroups, useRequestedUsersPerGroup } from '@/tanstack/groups';
import { useDialogs } from '@toolpad/core';
import { useNotifications } from '@toolpad/core/useNotifications';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useGrants } from '../auth/GrantsContext';
import { JoinGroupButton } from './components/JoinGroupButton';
import { CreateOrUpdateGroupDialog } from './dialogs/CreateOrUpdateGroupDialog';
import { LoadingGroupListItem } from './LoadingGroupListItem';

import Add from '@mui/icons-material/Add';
import Groups from '@mui/icons-material/Groups';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Fab from '@mui/material/Fab';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import Stack from '@mui/material/Stack';

const PublicGroupList = () => {
  const { user } = useGrants();
  const navigate = useNavigate();
  const notifications = useNotifications();
  const dialogs = useDialogs();

  const { data: groups = [], error, isLoading, refetch } = useGroups();
  const { data: requested_group_joins = [], refetch: refetchRequested } = useRequestedUsersPerGroup(user);

  useEffect(() => {
    if (error)
      notifications.show(error.message, { severity: 'error', actionText: 'Neu laden', onAction: () => refetch() });
  }, [error, notifications, refetch]);

  if (isLoading) {
    return (
      <List>
        {Array.from({ length: 10 }, (_v, k) => k + 1).map((x) => (
          <LoadingGroupListItem key={x} />
        ))}
      </List>
    );
  }

  return (
    <PullToRefresh
      onRefresh={() => {
        refetch();
        refetchRequested();
      }}
    >
      {groups
        .filter((x) => x.parent_group === null)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((mainGroup) => (
          <List key={mainGroup.id} subheader={<ListSubheader>{mainGroup.name}</ListSubheader>}>
            {groups
              .filter((x) => x.parent_group === mainGroup.id || x.id === mainGroup.id)
              .filter((x) => x.visible || x.user_group_role !== null)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((x) => (
                <ListItem
                  key={x.id}
                  divider
                  {...(x.user_group_role &&
                    x.user_group_role !== 'joinRequested' && {
                    onClick: () => {
                      navigate('/groups/' + x.id);
                    },
                  })}
                  {...(!x.user_group_role && {
                    secondaryAction: <JoinGroupButton group={x} user={user} />,
                  })}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ backgroundColor: x.color, borderRadius: 2 }}>
                      <Groups />
                    </Avatar>
                  </ListItemAvatar>
                  <Stack
                    direction={'row'}
                    spacing={2}
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'end', width: '100%' }}
                  >
                    <ListItemText primary={x.name} secondary={x.description} />
                    {x.user_group_role === 'admin' && requested_group_joins.find((y) => y.group === x.id) && (
                      <Chip
                        variant="outlined"
                        size="small"
                        label={requested_group_joins.filter((y) => y.group === x.id).length}
                        color="warning"
                      />
                    )}
                    {x.user_group_role === 'admin' && (
                      <Chip variant="outlined" size="small" label="Admin" color="info" />
                    )}
                    {x.user_group_role === 'joinRequested' && (
                      <Chip variant="outlined" size="small" label="Angefragt" color="warning" />
                    )}
                  </Stack>
                </ListItem>
              ))}
          </List>
        ))}
      {!error &&
        groups
          .filter((x) => x.parent_group === null)
          .filter((x) => x.user_group_role === 'user' || x.user_group_role === 'admin').length > 0 && (
          <Fab
            sx={{
              background: 'primary.light',
              position: 'fixed',
              right: '16px',
              bottom: 'calc(16px + env(safe-area-inset-bottom))',
            }}
            onClick={async () => {
              const result = await dialogs.open(CreateOrUpdateGroupDialog, { user });
              if (result && result !== 'closed') {
                refetch();
                notifications.show('Gruppe wurde erfolgreich erstellt.', { severity: 'success' });
              } else if (!result) {
                notifications.show('Gruppe konnte nicht erstellt werden.', { severity: 'error' });
              }
            }}
          >
            <Add sx={{ color: 'white' }} />
          </Fab>
        )}
    </PullToRefresh>
  );
};
export default PublicGroupList;
