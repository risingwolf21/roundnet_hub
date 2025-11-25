import { queryClient } from '@/lib/queryClient';
import SearchIcon from '@mui/icons-material/Search';
import { captureException } from '@sentry/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNotifications } from '@toolpad/core/useNotifications';
import { useState } from 'react';
import Layout from '../../components/layout/Layout';
import { AdminUsersRepository } from '../../repository/AdminUsersRepository';
import { UserWithGroups } from '../../types/supabaseTypes';
import { AdminUserItem } from './components/AdminUserItem';
import EditUserDialog, { UserEdited } from './dialogs/EditUserDialog';

import { Search, SearchIconWrapper, StyledInputBase } from '@/components/SearchBar';
import LinearProgress from '@mui/material/LinearProgress';
import List from '@mui/material/List';

export const useAllUsersAsAdmin = () =>
  useQuery<UserWithGroups[]>({
    queryKey: ['users', 'admin'],
    queryFn: () => AdminUsersRepository.fetchAllUsersWithGroups(),
  });

export const useUpdateUserMutation = () =>
  useMutation({
    mutationFn: ({ update }: { update: UserEdited }) => {
      return AdminUsersRepository.updateUser(update);
    },
    onMutate: async ({ update }) => {
      await queryClient.cancelQueries({ queryKey: ['users', 'admin'] });

      const previousUsers = queryClient.getQueryData<UserWithGroups[]>(['users', 'admin']);

      if (previousUsers) {
        const newUsers = previousUsers.map((x) => {
          if (x.id === update.userId) {
            return {
              ...x,
              displayName: update.displayName,
              verified: update.verified,
              role: update.role,
            };
          }
          return x;
        });
        queryClient.setQueryData(['events', 'admin'], newUsers);
      }

      return { previousUsers };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(['users', 'admin'], context.previousUsers);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'admin'] });
    },
  });

const AdminUserList = () => {
  const [editUserOpen, setEditUserOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserWithGroups | null>();
  const [searchString, setSearchString] = useState('');
  const notifications = useNotifications();

  const { data: users = [], isLoading } = useAllUsersAsAdmin();
  const updateUserMutation = useUpdateUserMutation();

  const editUser = (user: UserWithGroups) => {
    setCurrentUser(user);
    setEditUserOpen(true);
  };

  const deleteUser = async (user: User) => {
    AdminUsersRepository.deactivateUser(user)
      .then(() => {
        notifications.show(`Successfully deactivated user ${user.email}`, { severity: 'success' });
      })
      .catch((error) => {
        captureException(error);
        notifications.show(error, { severity: 'error' });
      });
  };

  const onUserEditFinished = async (result: UserEdited) => {
    updateUserMutation.mutate({ update: result });
    setEditUserOpen(false);
  };

  return (
    <Layout
      appBarContent={
        <Search sx={{ flexGrow: 1 }}>
          <SearchIconWrapper>
            <SearchIcon />
          </SearchIconWrapper>
          <div>
            <StyledInputBase
              sx={{ width: '100% !important' }}
              placeholder="Suche nach einem Nutzer"
              inputProps={{ 'aria-label': 'search' }}
              value={searchString}
              onChange={(e: { target: { value: React.SetStateAction<string> } }) => setSearchString(e.target.value)}
            />
          </div>
        </Search>
      }
    >
      {isLoading && <LinearProgress style={{ position: 'fixed', left: 0, right: 0, top: 56 }} />}

      <List sx={{ width: '100%', pb: 'calc(56px + env(safe-area-inset-bottom))' }}>
        {users &&
          users
            .filter(
              (x: UserWithGroups) =>
                searchString === '' ||
                x.displayName?.toLowerCase().includes(searchString.toLowerCase()) ||
                x.email?.toLowerCase().includes(searchString.toLowerCase()) ||
                x.name?.toLowerCase().includes(searchString.toLowerCase())
            )
            .map((user, index) => (
              <AdminUserItem key={'user' + index} user={user} onEditClick={() => editUser(user)} />
            ))}
      </List>
      {currentUser && (
        <EditUserDialog
          open={editUserOpen}
          user={currentUser}
          handleClose={() => setEditUserOpen(false)}
          deleteUser={deleteUser}
          onUserEditFinished={onUserEditFinished}
        />
      )}
    </Layout>
  );
};

export default AdminUserList;
