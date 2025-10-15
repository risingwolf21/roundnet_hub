import { LoadingIndicator } from '@/components/LoadingIndicator';
import { PullToRefresh } from '@/components/pull-to-refresh/PullToRefresh';
import { useGroup, useGroupUsers, useLeaveGroupMutation, useMakeUserAdminMutation } from '@/tanstack/groups';
import { captureException } from '@sentry/react';
import { useDialogs, useNotifications } from '@toolpad/core';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { useGrants } from '../auth/GrantsContext';
import { AcceptJoinButton } from './components/AcceptJoinButton';
import { DeclineJoinButton } from './components/DeclineJoinButton';
import { GroupUserItem } from './components/GroupUserItem';
import { CreateOrUpdateGroupDialog } from './dialogs/CreateOrUpdateGroupDialog';
import SearchAndSelectUserDialog from './dialogs/SearchAndSelectUserDialog';
import { useAddUsersMutation } from './query/addUsersMutation';
import { useRemoveUsersMutation } from './query/removeUsersMutation';

import AccountBox from '@mui/icons-material/AccountBox';
import Check from '@mui/icons-material/Check';
import Edit from '@mui/icons-material/Edit';
import GroupRemove from '@mui/icons-material/GroupRemove';
import PersonAdd from '@mui/icons-material/PersonAdd';
import PersonRemove from '@mui/icons-material/PersonRemove';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Fab from '@mui/material/Fab';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

const PublicGroupInformation = () => {
  const { groupId } = useParams();
  const { user } = useGrants();
  const navigate = useNavigate();
  const notifications = useNotifications();
  const dialogs = useDialogs();
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState<{ user: boolean, admin: boolean, joinRequested: boolean }>({ user: true, admin: true, joinRequested: true });

  const { data: group = null, error, isLoading, refetch: refetchGroup } = useGroup(groupId);
  const { data: group_users = [], isLoading: isLoadingUsers, refetch: refetchUsers } = useGroupUsers('user', groupId);
  const { data: group_admins = [], isLoading: isLoadingAdmins, refetch: refetchAdmins } = useGroupUsers('admin', groupId);
  const { data: group_join_requested = [], isLoading: isLoadingJoinRequested, refetch: refetchJoinRequested } = useGroupUsers('joinRequested', groupId);

  const refetch = () => {
    refetchGroup();
    refetchUsers();
    refetchAdmins();
    refetchJoinRequested();
  }

  useEffect(() => {
    if (error) notifications.show(error.message, { severity: 'error' });
  }, [error, notifications]);

  const addUsersMutation = useAddUsersMutation(group);
  const removeUsersMutation = useRemoveUsersMutation(group);
  const leaveGroupMutation = useLeaveGroupMutation();
  const makeUserAdminMutation = useMakeUserAdminMutation();

  if (!isLoading && !group) {
    return <Navigate to={'/groups/list'} />;
  }

  const handleUsersAdded = async (users: User[]) => {
    addUsersMutation.mutate(users, {
      onSuccess: () => {
        notifications.show(`Successfully added ${users.length} users to the group ${group?.name}`, {
          severity: 'success',
        });
        setSelectedUsers([]);
      },
      onError: (error) => {
        notifications.show(`Failed to add ${users.length} user to the group ${group?.name} ${error.message}`, {
          severity: 'error',
        });
        captureException(error);
        setSelectedUsers([]);
      },
    });
  };

  const handleUsersRemove = async (users: User[]) => {
    removeUsersMutation.mutate(users, {
      onSuccess: () => {
        notifications.show(`Successfully removed ${users.length} users from the group ${group?.name}`, {
          severity: 'success',
        });
        setSelectedUsers([]);
      },
      onError: (error) => {
        notifications.show(`Failed to remove ${users.length} user from the group ${group?.name} ${error.message}`, {
          severity: 'error',
        });
        setSelectedUsers([]);
      },
    });
  };

  return (
    <PullToRefresh onRefresh={refetch}>
      <List sx={{ pb: 'calc(64px + env(safe-area-inset-bottom))' }}>
        <LoadingIndicator loading={isLoading} />
        <Typography pl={2} variant="h6" fontWeight="bold">
          Beschreibung
        </Typography>
        <Typography pl={2} pb={1}>
          {group?.description}
        </Typography>
        <Divider />
        <Typography pl={2} pt={1} variant="h6" fontWeight="bold">
          Mitglieder{group && ' · ' + group?.users.length}
        </Typography>
        <Card sx={{ borderRadius: 2, py: 0, px: 0, m: 1 }}>
          {selectedUsers.length > 0 && group?.user_group_role === 'admin' ? (
            <CardActionArea onClick={() => handleUsersRemove(selectedUsers)}>
              <ListItem>
                <ListItemAvatar>
                  <Avatar sx={{ borderRadius: 2, background: '#ba1a1a' }}>
                    <PersonRemove />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText primary={'Gewählte Teilnehmer entfernen'} />
              </ListItem>
            </CardActionArea>
          ) : (
            group?.user_group_role === 'admin' && (
              <CardActionArea
                onClick={() => {
                  dialogs
                    .open(SearchAndSelectUserDialog, { usersToFilter: group.users.map((x) => x.user.userId) })
                    .then((result) => {
                      if (result) handleUsersAdded(result);
                    });
                }}
              >
                <ListItem>
                  <ListItemAvatar>
                    <Avatar sx={{ borderRadius: 2 }}>
                      <PersonAdd />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText primary={'Teilnehmer hinzufügen'} />
                </ListItem>
              </CardActionArea>
            )
          )}
        </Card>
        <Card sx={{ borderRadius: 2, py: 1, px: 0, m: 1 }}>
          <Stack direction={'row'} spacing={3} sx={{ px: 2, py: 1 }}>
            <Badge color='primary' badgeContent={group_join_requested.length}>
              <Chip
                disabled={isLoadingJoinRequested}
                icon={filter.joinRequested ? <Check /> : undefined}
                color={filter.joinRequested ? 'secondary' : 'default'}
                label='Anfragen'
                onClick={() => setFilter({ ...filter, joinRequested: !filter.joinRequested })} />
            </Badge>

            <Badge color='primary' badgeContent={group_admins.length}>
              <Chip
                disabled={isLoadingAdmins}
                icon={filter.admin ? <Check /> : undefined}
                color={filter.admin ? 'secondary' : 'default'}
                label='Admins'
                onClick={() => setFilter({ ...filter, admin: !filter.admin })} />
            </Badge>


            <Badge color='primary' badgeContent={group_users.length}>
              <Chip
                disabled={isLoadingUsers}
                icon={filter.user ? <Check /> : undefined}
                color={filter.user ? 'secondary' : 'default'}
                label='Nutzer'
                onClick={() => setFilter({ ...filter, user: !filter.user })} />
            </Badge>

          </Stack>
        </Card>
        {
          group?.user_group_role === 'admin' && filter.joinRequested && group_join_requested.length > 0 && <Card sx={{ borderRadius: 2, py: 0, px: 0, m: 1 }}>
            {
              group_join_requested
                .sort((a, b) => a.user.displayName.localeCompare(b.user.displayName))
                .map((x) => (
                  <ListItem
                    key={x.user.userId}
                    secondaryAction={
                      <Stack direction={'row'} spacing={2}>
                        <DeclineJoinButton user={x.user} group={group} />
                        <AcceptJoinButton user={x.user} group={group} />
                      </Stack>
                    }
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ borderRadius: 2 }}>
                        {x.user.avatarUrl ? (
                          <img src={x.user.avatarUrl} alt="logo" width={'100%'} height={'100%'} />
                        ) : (
                          <AccountBox />
                        )}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Stack direction={'row'} spacing={2}>
                          <Typography>{x.user.name}</Typography>
                          {group.user_group_role === 'admin' && (
                            <Chip variant="outlined" size="small" label="Angefragt" color="warning" />
                          )}
                        </Stack>
                      }
                    />
                  </ListItem>
                ))
            }
          </Card>
        }
        {
          group && filter.admin && group_admins.length > 0 && <Card sx={{ borderRadius: 2, py: 0, px: 0, m: 1 }}>
            {
              group_admins
                .sort((a, b) => a.user.displayName.localeCompare(b.user.displayName))
                .map((x) => (
                  <GroupUserItem
                    groupUser={x.user}
                    user={user}
                    isAdmin={x.role === 'admin'}
                    dialogs={dialogs}
                    selected={selectedUsers.includes(x.user)}
                    {...(group.user_group_role === 'admin' && x.role !== 'admin'
                      ? {
                        makeAdmin: async (e) => {
                          e.stopPropagation();
                          const result = await dialogs.confirm(
                            `Möchtest du wirklich ${x.user.name} zu einem Admin dieser Gruppe machen?`,
                            {
                              okText: 'Bestätigen',
                              cancelText: 'Abbrechen',
                            }
                          );
                          if (result) {
                            makeUserAdminMutation.mutate({ group: group, user: x.user });
                          }
                        },
                      }
                      : {})}
                    {...(group.user_group_role === 'admin'
                      ? {
                        onAvatarClick: (e) => {
                          e.stopPropagation();
                          if (group.user_group_role !== 'admin') return;
                          if (selectedUsers.includes(x.user)) {
                            setSelectedUsers([...selectedUsers.filter((y) => y.userId !== x.user.userId)]);
                          } else {
                            setSelectedUsers([...selectedUsers, x.user]);
                          }
                        },
                      }
                      : {})}
                  />
                ))
            }
          </Card>
        }
        {
          group && filter.user && group_users.length > 0 && <Card sx={{ borderRadius: 2, py: 0, px: 0, m: 1 }}>
            {
              group_users
                .sort((a, b) => a.user.displayName.localeCompare(b.user.displayName))
                .map((x) => (
                  <GroupUserItem
                    groupUser={x.user}
                    user={user}
                    isAdmin={x.role === 'admin'}
                    dialogs={dialogs}
                    selected={selectedUsers.includes(x.user)}
                    {...(group.user_group_role === 'admin' && x.role !== 'admin'
                      ? {
                        makeAdmin: async (e) => {
                          e.stopPropagation();
                          const result = await dialogs.confirm(
                            `Möchtest du wirklich ${x.user.name} zu einem Admin dieser Gruppe machen?`,
                            {
                              okText: 'Bestätigen',
                              cancelText: 'Abbrechen',
                            }
                          );
                          if (result) {
                            makeUserAdminMutation.mutate({ group: group, user: x.user });
                          }
                        },
                      }
                      : {})}
                    {...(group.user_group_role === 'admin'
                      ? {
                        onAvatarClick: (e) => {
                          e.stopPropagation();
                          if (group.user_group_role !== 'admin') return;
                          if (selectedUsers.includes(x.user)) {
                            setSelectedUsers([...selectedUsers.filter((y) => y.userId !== x.user.userId)]);
                          } else {
                            setSelectedUsers([...selectedUsers, x.user]);
                          }
                        },
                      }
                      : {})}
                  />
                ))
            }
          </Card>
        }
        {group?.parent_group !== null && (
          <>
            <Divider />
            <Card sx={{ color: 'red', borderRadius: 2, py: 0, px: 0, m: 1 }}>
              <CardActionArea sx={{ px: 1 }}>
                <ListItem
                  onClick={() => {
                    if (!group || !user) return;
                    dialogs
                      .confirm(
                        group.need_request_to_join
                          ? 'Du kannst der Gruppe nicht mehr direkt beitreten, sondern musst bestätigt werden.'
                          : 'Die Gruppe ist öffentlich. Du kannst Ihr jederzeit wieder beitreten.',
                        {
                          okText: 'Verlassen',
                          cancelText: 'Abbrechen',
                          title: 'Möchtest du die Gruppe wirklich verlassen?',
                        }
                      )
                      .then((result) => {
                        if (result) {
                          leaveGroupMutation.mutate(
                            { group, user },
                            {
                              onSuccess: () => navigate('/groups/list', { replace: true }),
                              onError: (error) => {
                                captureException(error);
                                notifications.show('Es ist ein Fehler aufgetreten.', { severity: 'error' });
                              },
                            }
                          );
                        }
                      });
                  }}
                >
                  <ListItemAvatar sx={{ flexDirection: 'row', display: 'flex', alignItems: 'center' }}>
                    <GroupRemove />
                  </ListItemAvatar>
                  <ListItemText primary="Gruppe verlassen" />
                </ListItem>
              </CardActionArea>
            </Card>
          </>
        )}
      </List>
      {group?.user_group_role === 'admin' && (
        <Fab
          sx={{
            background: 'primary.light',
            position: 'fixed',
            right: '16px',
            bottom: 'calc(16px + env(safe-area-inset-bottom))',
          }}
          onClick={async () => {
            const result = await dialogs.open(CreateOrUpdateGroupDialog, { user, group: group ?? undefined });
            if (result && result !== 'closed') {
              refetch();
              notifications.show('Gruppe wurde erfolgreich bearbeitet.', { severity: 'success' });
            } else if (!result) {
              notifications.show('Gruppe konnte nicht bearbeitet werden.', { severity: 'error' });
            }
          }}
        >
          <Edit sx={{ color: 'white' }} />
        </Fab>
      )}
    </PullToRefresh>
  );
};

export default PublicGroupInformation;
