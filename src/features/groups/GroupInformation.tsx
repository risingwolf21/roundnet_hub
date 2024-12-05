import { AccountCircle, GroupAdd, GroupRemove } from '@mui/icons-material';
import { Box, Divider, Fab, List, ListItem, ListItemAvatar, ListItemText, Typography } from '@mui/material';
import { toInteger } from 'lodash';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { fetchAdminUsersAsync } from '../admin/slices/adminUserSlice';
import { RootState, useAppDispatch } from '../../redux/store';
import { GroupWithUsers, UserWithGroupsAndRoles } from '../../types/supabaseTypes';
import { AlertMessage, AlertSnackbar } from '../../components/AlertSnackbar';
import SearchAndSelectUserDialog from './dialogs/SearchAndSelectUserDialog';
import { fetchSingleGroupAsync, groupsSelector } from 'src/features/groups/slices/groupsSlice';
import { captureException } from '@sentry/react';
import { Tables } from '../../types/supabase-generated.types';
import { AdminUsersRepository } from '../../repository/AdminUsersRepository';
import Layout from '../../components/Layout';

const GroupInformationProvider = () => {
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const group = useSelector((state: RootState) => groupsSelector.selectById(state, toInteger(id)));

  const { users, loading } = useSelector((state: RootState) => state.adminUsers);

  useEffect(() => {
    dispatch(fetchAdminUsersAsync());
  }, [dispatch]);

  if (!group)
    return (
      <AlertSnackbar
        close={() => {}}
        alertInfo={{ message: 'Fatal error occured. Repository or selected group was null!', severity: 'error' }}
      />
    );

  return <GroupInformation users={users} loading={loading} group={group} />;
};

type GroupInformationProps = {
  users: UserWithGroupsAndRoles[];
  loading: boolean;
  group: GroupWithUsers;
};

const GroupInformation = ({ users, loading, group }: GroupInformationProps) => {
  const dispatch = useAppDispatch();
  const [searchAndSelectUsersOpen, setSearchAndSelectUsersOpen] = useState(false);
  const [deleteUsersOpen, setDeleteUsersOpen] = useState(false);
  const [alertInfo, setAlertInfo] = useState<AlertMessage | null>(null);

  const handleUsersRemove = async (users: User[]) => {
    await AdminUsersRepository.removeUsersFromGroup(group, users)
      .then((r) => {
        setAlertInfo({
          message: `Successfully removed ${users.length} users from the group ${group.name}`,
          severity: 'success',
        });
        setDeleteUsersOpen(false);
        dispatch(fetchSingleGroupAsync({ id: group.id }));
      })
      .catch((error) => {
        captureException(error);
        setAlertInfo({
          message: `Failed to remove ${users.length} users from the group ${group.name} ${error.message}`,
          severity: 'error',
        });
      });
  };

  const handleUsersAdded = async (users: User[]) => {
    await AdminUsersRepository.addUsersToGroup(group, users)
      .then((r) => {
        setAlertInfo({
          message: `Successfully added ${users.length} users to the group ${group.name}`,
          severity: 'success',
        });
        setSearchAndSelectUsersOpen(false);
        dispatch(fetchSingleGroupAsync({ id: group.id }));
      })
      .catch((error) => {
        captureException(error);
        setAlertInfo({
          message: `Failed to add ${users.length} user to the group ${group.name} ${error.message}`,
          severity: 'error',
        });
      });
  };

  return (
    <Layout appBarConfig={{ title: group.name, showProfile: true, showBackButton: true }}>
      <List sx={{ width: '100%', pb: 10 }}>
        <Typography pl={2} variant="h6" fontWeight="bold">
          Beschreibung
        </Typography>
        <Typography pl={2} pb={1}>
          {group?.description}
        </Typography>
        <Divider />
        <Typography pl={2} pt={1} variant="h6" fontWeight="bold">
          Mitglieder
        </Typography>
        {group &&
          group.users &&
          group.users
            .sort((a, b) => a.displayName.localeCompare(b.displayName))
            .map((x: Tables<'user'>, index: number) => (
              <ListItem key={index} divider>
                <ListItemAvatar>
                  <AccountCircle />
                </ListItemAvatar>
                <ListItemText primary={x.displayName} />
              </ListItem>
            ))}
      </List>
      <Box sx={{ position: 'fixed', right: '16px', bottom: '76px', display: 'flex', flexDirection: 'row' }}>
        <Fab sx={{ background: '#ba1a1a', mr: 2 }} onClick={() => setDeleteUsersOpen(true)}>
          {<GroupRemove sx={{ color: 'white' }} />}
        </Fab>
        <Fab sx={{ background: '#66bb6a' }} onClick={() => setSearchAndSelectUsersOpen(true)}>
          {<GroupAdd sx={{ color: 'white' }} />}
        </Fab>
      </Box>

      <SearchAndSelectUserDialog
        open={searchAndSelectUsersOpen}
        handleClose={() => setSearchAndSelectUsersOpen(false)}
        handleSubmit={handleUsersAdded}
        users={users.filter(
          (x: UserWithGroupsAndRoles) => !group?.users?.some((y: Tables<'user'>) => y.userId === x.userId)
        )}
        loading={loading}
      />

      <SearchAndSelectUserDialog
        open={deleteUsersOpen}
        handleClose={() => setDeleteUsersOpen(false)}
        handleSubmit={handleUsersRemove}
        users={group?.users ?? []}
        loading={loading}
      />

      <AlertSnackbar alertInfo={alertInfo} close={() => setAlertInfo(null)} autoHideDuration={1500} />
    </Layout>
  );
};

export default GroupInformationProvider;
